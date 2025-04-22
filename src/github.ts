export interface GitHubRepoMetadata {
  description?: string;
  topics?: string[];
  license?: string;
  runtime?: string;
}

export interface PermalinkData {
  host: string;
  platform: "github";
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
  permalink?: string;
  content?: string;
}

export interface SnippetData {
  host: string;
  platform: "github";
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  permalink?: string;
  content: string;
  description: string;
  license: string;
  runtime?: string;
}

export interface CommitInfo {
  fullHash: string;
  shortHash: string;
  message: string;
}

export interface IssueInfo {
  repo: string;
  owner: string;
  issueNumber: number;
  type: "issue" | "pr";
}

export function parseGitHubIssueURL(
  url: string = window.location.href
): IssueInfo | null {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split("/").filter(Boolean);

    if (parts.length < 4) return null;

    const [owner, repo, section, number] = parts;

    if (!["issues", "pull"].includes(section)) return null;

    return {
      owner,
      repo,
      issueNumber: parseInt(number, 10),
      type: section === "issues" ? "issue" : "pr",
    };
  } catch (err) {
    console.error("Failed to parse GitHub issue URL:", err);
    return null;
  }
}

export function extractRepoMetadata(): GitHubRepoMetadata {
  const metadata: GitHubRepoMetadata = {};

  // Parse from sidebar
  const aboutBox = document.querySelector("div.BorderGrid-cell");
  if (aboutBox) {
    const desc = aboutBox.querySelector("p.f4.my-3");
    if (desc) metadata.description = desc.textContent?.trim();

    const topicLinks = aboutBox.querySelectorAll("a.topic-tag");
    if (topicLinks.length > 0) {
      metadata.topics = Array.from(topicLinks)
        .map((a) => a.textContent?.trim() || "")
        .filter(Boolean);
    }
  }

  // Parse from embedded JSON
  const script = document.querySelector<HTMLScriptElement>(
    "#repo-content-pjax-container > react-app > script"
  );
  if (script?.textContent) {
    try {
      const embedded = JSON.parse(script.textContent);
      const fileTree = embedded?.payload?.fileTree?.[""].items;

      if (Array.isArray(fileTree)) {
        const licenseFile = fileTree.find(
          (item: any) =>
            typeof item.name === "string" &&
            item.name.toLowerCase().startsWith("license")
        );
        if (licenseFile && !metadata.license) {
          metadata.license = "MIT"; // fallback guess based on filename
        }

        const runtimeFile = fileTree.find((item: any) =>
          [
            "runtime.txt",
            ".python-version",
            ".node-version",
            ".nvmrc",
          ].includes(item.name)
        );
        if (runtimeFile?.name) {
          const runtimeLines = embedded?.payload?.blob?.rawLines;
          if (Array.isArray(runtimeLines) && runtimeLines.length > 0) {
            metadata.runtime = runtimeLines[0].trim();
          } else {
            metadata.runtime = runtimeFile.name;
          }
        }

        const pkgJson = fileTree.find(
          (item: any) => item.name === "package.json"
        );
        if (pkgJson) {
          const rawLines = embedded?.payload?.blob?.rawLines;
          if (Array.isArray(rawLines)) {
            const enginesLine = rawLines.find((line: string) =>
              line.includes('"node"')
            );
            if (enginesLine) {
              const match = enginesLine.match(/"node"\s*:\s*"([^"]+)"/);
              if (match) {
                metadata.runtime = `node ${match[1]}`;
              }
            }
          }
          const licenseLine = rawLines.find((line: string) =>
            line.trim().startsWith('"license"')
          );
          if (licenseLine) {
            const match = licenseLine.match(/"license"\s*:\s*"([^"]+)"/);
            if (match) {
              metadata.license = match[1];
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to parse embedded JSON for license/runtime:", err);
    }
  }
  return metadata;
}

export async function fetchRootCommitHash(
  owner: string,
  repo: string
): Promise<string | null> {
  const branchRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`
  );
  if (!branchRes.ok) return null;

  const repoData = await branchRes.json();
  const defaultBranch = repoData.default_branch;

  const commitsRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`
  );

  if (!commitsRes.ok) return null;

  const linkHeader = commitsRes.headers.get("link");
  let lastPage = 1;

  if (linkHeader) {
    const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
    if (match) {
      lastPage = parseInt(match[1], 10);
    }
  }

  const oldestCommitsRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?sha=${defaultBranch}&per_page=1&page=${lastPage}`
  );

  const oldestCommits = await oldestCommitsRes.json();
  return oldestCommits?.[0]?.sha || null;
}

export function parseSnippetLink(): SnippetData | null {
  try {
    const url = window.location.href;
    const parsed = new URL(url);
    const { hostname } = parsed;
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (!pathParts.length) return null;

    if (pathParts.length < 4) return null;
    const [owner, repo, blobKeyword, branch, ...rest] = pathParts;
    if (blobKeyword !== "blob") return null;
    const filePath = rest.join("/");

    const contextTextarea = document.querySelector(
      "#read-only-cursor-text-area"
    ) as HTMLTextAreaElement;
    const content = contextTextarea?.value ?? "";
    const commitLink = document.querySelector(
      "a.Link--secondary"
    ) as HTMLAnchorElement;
    const description = commitLink?.innerText || "Snippet";

    const metadata = extractRepoMetadata();
    const license = metadata.license!;
    const runtime = metadata.runtime;

    return {
      host: hostname,
      platform: "github",
      owner,
      repo,
      branch,
      filePath,
      content,
      description,
      license,
      runtime,
    };
  } catch (err) {
    console.log(err);
    return null;
  }
}

export function parsePermalink(): PermalinkData | null {
  try {
    const url = window.location.href;
    const parsed = new URL(url);
    const { hostname, hash } = parsed;

    let startLine: number | undefined;
    let endLine: number | undefined;
    const fragment = hash.replace(/^#/, "");
    if (fragment.startsWith("L")) {
      const str = fragment.slice(1);
      const dashIndex = str.indexOf("-");
      if (dashIndex === -1) {
        startLine = parseInt(str, 10) || undefined;
      } else {
        const startRaw = str.slice(0, dashIndex).replace(/\D/g, "");
        startLine = parseInt(startRaw, 10) || undefined;
        let tail = str.slice(dashIndex + 1);
        tail = tail.replace(/^L/, "");
        const endRaw = tail.replace(/\D/g, "");
        endLine = parseInt(endRaw, 10) || undefined;
      }
    }

    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length < 4) return null;
    const [owner, repo, blobKeyword, branch, ...rest] = pathParts;
    if (blobKeyword !== "blob") return null;
    const filePath = rest.join("/");

    const contextTextarea = document.querySelector(
      "#read-only-cursor-text-area"
    ) as HTMLTextAreaElement;
    const contentLines = contextTextarea?.value?.split("\n") ?? [];
    const content = endLine
      ? contentLines.slice(startLine! - 1, endLine!).join("\n")
      : contentLines[startLine! - 1] ?? "";

    return {
      host: hostname,
      platform: "github",
      owner,
      repo,
      branch,
      filePath,
      startLine,
      endLine,
      content,
    };
  } catch (err) {
    console.log(err);
    return null;
  }
}

export function extractLatestCommitInfo(): CommitInfo | null {
  const commitLink = document.querySelector<HTMLAnchorElement>(
    'a.Link--secondary[href*="/commit/"]'
  );

  const messageLink = document.querySelector<HTMLAnchorElement>(
    '[data-testid="latest-commit-html"] a.Link--secondary'
  );

  if (!commitLink || !messageLink) {
    console.warn("❗️Could not find commit link or message in DOM");
    return null;
  }

  const fullHashMatch = commitLink.href.match(/\/commit\/([a-f0-9]{40})/);
  if (!fullHashMatch) {
    console.warn("❗️Could not extract full commit hash from URL");
    return null;
  }

  const fullHash = fullHashMatch[1];
  const shortHash = fullHash.slice(0, 7);
  const message = messageLink.textContent?.trim() || "Unknown commit message";

  return {
    fullHash,
    shortHash,
    message,
  };
}
