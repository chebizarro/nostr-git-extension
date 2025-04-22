import { EventTemplate, nip19, NostrEvent, SimplePool } from "nostr-tools";
import {
  extractLatestCommitInfo,
  extractRepoMetadata,
  fetchRootCommitHash,
  IssueInfo,
  PermalinkData,
  SnippetData,
} from "./github";
import langMap from "lang-map";
import { SnipptDescription } from "./snippet-dialog";
import { requestNip07Signature } from "./nip07";

export async function fetchRepoEvent(
  relays: string[]
): Promise<NostrEvent | undefined> {
  const { pathname } = window.location;

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length < 2) return;

  const [owner, repo] = segments;

  const pool = new SimplePool();
  try {
    const events = await pool.querySync(relays, {
      kinds: [30617],
      "#d": [repo],
    });
    //pool.close(relays);
    // find event referencing a 'clone' tag that includes "owner/repo"
    const found = events.find((evt) =>
      evt.tags.some(
        (t) => t[0] === "clone" && t[1].includes(`${owner}/${repo}`)
      )
    );
    return found;
  } catch (err) {
    console.error("fetchRepoEvent failed:", err);
    return undefined;
  }
}

/**
 * Create a kind: 30617 "Repository Announcement" event (NIP-34).
 */
export async function createRepoAnnouncementEvent(
  relays: string[]
): Promise<EventTemplate | null> {
  const { origin, pathname } = window.location;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const [owner, repo] = segments;
  const repoSlug = `${owner}/${repo}`;
  const repoId = `${repo}`.toLowerCase();
  const repoUrl = `${origin}/${repoSlug}`;
  const cloneUrl = `https://github.com/${repoSlug}.git`;

  const about = extractRepoMetadata();
  const rootCommit = await fetchRootCommitHash(owner, repo);

  const tags: string[][] = [
    ["d", repoId],
    ["name", repo],
    ["web", repoUrl],
    ["clone", cloneUrl],
    ["alt", `git repository: ${repo}`],
  ];

  if (about.description) tags.push(["description", about.description]);
  if (about.topics) about.topics.forEach((t) => tags.push(["t", t]));
  if (about.license) tags.push(["t", `license-${about.license.toLowerCase()}`]);

  if (rootCommit) tags.push(["r", rootCommit, "euc"]);

  if (relays.length > 0) tags.push(["relay", ...relays]);

  return {
    kind: 30617,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: "",
  };
}

/**
 * Create a kind: 1337 "Code Snipper" event (NIP-C0).
 */
export function createCodeSnippetEvent(
  snipppetData: SnippetData,
  snippetDesc: SnipptDescription | null
): EventTemplate {
  const language = getLanguageFromFilename(snipppetData.filePath);
  const extension = getExtension(snipppetData.filePath);
  const about = extractRepoMetadata();

  const tags: string[][] = [
    ["extension", extension],
    ["l", language],
    ["name", snipppetData.filePath.split("/").pop() || "code"],
    [
      "description",
      snippetDesc ? snippetDesc.description : snipppetData.description,
    ],
    ["alt", `code snippet: ${snipppetData.filePath}`],
    [
      "repo",
      `https://${snipppetData.host}/${snipppetData.owner}/${snipppetData.repo}`,
    ],
  ];

  if (snipppetData.runtime) {
    tags.push(["runtime", snipppetData.runtime]);
  } else if (snippetDesc && snippetDesc?.runtime) {
    tags.push(["runtime", snippetDesc.runtime]);
  }

  if (snipppetData.license) {
    tags.push(["license", snipppetData.license]);
  }

  return {
    kind: 1337,
    created_at: Math.floor(Date.now() / 1000),
    content: snipppetData.content,
    tags,
  };
}

/**
 * Create a kind: 1623 "Permalink" event (NIP-34).
 */
export async function createCodeReferenceEvent(
  permalink: PermalinkData,
  relays: string[]
): Promise<EventTemplate> {
  const fileName = getFilename(permalink.filePath);
  const extension = getExtension(permalink.filePath);

  const tags: string[][] = [
    ["extension", extension],
    ["repo", `https://${permalink.host}/${permalink.owner}/${permalink.repo}`],
    ["branch", permalink.branch],
    ["file", fileName],
    ["alt", `git permalink: ${permalink.filePath}`],
  ];

  const repoEvent = await fetchRepoEvent(relays);
  if (repoEvent) {
    tags.push(["d", `30617:${repoEvent.pubkey}:${permalink.repo}`]);
  }

  const language = getLanguageFromFilename(permalink.filePath);
  tags.push(["l", language]);

  if (
    typeof permalink.startLine === "number" &&
    typeof permalink.endLine === "number"
  ) {
    tags.push([
      "lines",
      permalink.startLine.toString(),
      permalink.endLine.toString(),
    ]);
  } else if (
    typeof permalink.startLine === "number" &&
    typeof permalink.endLine !== "number"
  ) {
    tags.push(["lines", permalink.startLine.toString()]);
  }

  const commitData = extractLatestCommitInfo();
  if (commitData) {
    tags.push([`refs/heads/${permalink.branch}`, commitData.fullHash]);
  }

  return {
    kind: 1623,
    created_at: Math.floor(Date.now() / 1000),
    content: permalink.content!,
    tags,
  };
}

function getFilename(path: string): string {
  return path.split("/").pop() || "";
}

function getExtension(path: string): string {
  return path.split(".").pop() || "txt";
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const langs = langMap.languages(ext);
  return langs?.[0] || "text";
}

export async function publishEvent(
  event: EventTemplate,
  relays: string[]
): Promise<NostrEvent> {
  const pool = new SimplePool();
  const signedEvent = await requestNip07Signature(event);
  pool.publish(relays, signedEvent);
  return signedEvent;
}

/**
 * Encodes a NostrEvent as a NIP-19 nevent and copies it to the clipboard.
 * @param event The NostrEvent object to encode
 */
export async function copyNeventToClipboard(
  event: NostrEvent,
  relays?: string[]
): Promise<string | undefined> {
  try {
    const nevent = nip19.neventEncode({
      id: event.id,
      relays: relays || [],
      author: event.pubkey,
      kind: event.kind,
    });

    await navigator.clipboard.writeText(nevent);
    console.log("✅ Copied nevent to clipboard:", nevent);
    return nevent;
  } catch (err) {
    console.error("❌ Failed to copy nevent:", err);
  }
}

export interface IssueEventBundle {
  issueEvent: EventTemplate;
  commentEvents: EventTemplate[];
}

/**
 * Generates a Nostr event for a GitHub issue and its comments.
 * @param owner The owner of the GitHub repository
 * @param repo The name of the GitHub repository
 * @param issueNumber The number of the issue
 * @param relays An array of relay URLs to publish the event to
 * @returns An object containing the issue event and an array of comment events
 */
export async function generateNostrIssueThread(
  issueInfo: IssueInfo,
  repoEvent: NostrEvent,
  relays: string[] = []
): Promise<IssueEventBundle> {
  const issueRes = await fetch(
    `https://api.github.com/repos/${issueInfo.owner}/${issueInfo.repo}/issues/${issueInfo.issueNumber}`
  );
  if (!issueRes.ok) throw new Error("Failed to fetch GitHub issue");
  const issue = await issueRes.json();

  const commentsRes = await fetch(issue.comments_url);
  const comments = commentsRes.ok ? await commentsRes.json() : [];

  const now = Math.floor(Date.now() / 1000);
  const baseTags: string[][] = [
    ["a", `30617:${repoEvent.pubkey}:${issueInfo.repo}`],
    ["p", repoEvent.pubkey],
    ["subject", issue.title],
    ["author", issue.user?.login ?? ""],
    ...issue.labels.map((label: any) => ["t", label.name.toLowerCase()]),
  ];

  const issueEvent: EventTemplate = {
    kind: 1621,
    created_at: now,
    content: issue.body || "",
    tags: baseTags,
  };

  const commentEvents: EventTemplate[] = comments.map((comment: any) => {
    const createdAt = Math.floor(new Date(comment.created_at).getTime() / 1000);

    const tags: string[][] = [
      ["K", "1621"],
      ["k", "1621"],

      ["I", comment.html_url],
	  
      ["repo", `${issueInfo.owner}/${issueInfo.repo}`],
      ["issue_number", `${issue.number}`],
      ["author", comment.user?.login ?? ""],
      ["p", comment.user?.login ?? ""],
      ...relays.map((r) => ["relays", r]),
    ];

    return {
      kind: 1111,
      created_at: createdAt,
      content: comment.body || "",
      tags,
    };
  });

  return { issueEvent, commentEvents };
}
