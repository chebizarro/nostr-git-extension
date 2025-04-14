import { EventTemplate, NostrEvent, SimplePool } from "nostr-tools";
import {
  extractLatestCommitInfo,
  extractRepoMetadata,
  fetchRootCommitHash,
  PermalinkData,
  SnippetData,
} from "./github";
import langMap from "lang-map";
import { SnipptDescription } from "./createSnippetDescriptionDialog";

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
    ["alt", `git repository: ${repo}-${about.description}`],
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

  const tags: string[][] = [
    ["extension", extension],
    ["l", language],
    ["name", snipppetData.filePath.split("/").pop() || "code"],
    [
      "description",
      snippetDesc ? snippetDesc.description : snipppetData.description,
    ],
    ["license", snipppetData.license],
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
