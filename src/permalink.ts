function computeGitHubPermalink(): string | null {
  const { origin, pathname, hostname, hash } = window.location;

  const segments = pathname.split("/").filter(Boolean);

  // --- GitHub Gist ---
  if (hostname === "gist.github.com") {
    // /username/gistid or /gistid
    const isAnonGist = segments.length === 1;
    const [userOrId, idMaybe] = segments;
    const gistId = isAnonGist ? userOrId : idMaybe;
    return `${origin}/${segments.join("/")}${hash}`;
  }

  // --- GitHub or GitHub Enterprise ---
  if (segments.length < 2) return null;

  const [owner, repo, section, ...rest] = segments;

  switch (section) {
    case "blob": {
      const [ref, ...filePath] = rest;
      if (!ref || !filePath.length) return null;
      return `${origin}/${owner}/${repo}/blob/${ref}/${filePath.join(
        "/"
      )}${hash}`;
    }

    case "tree": {
      const [ref, ...folderPath] = rest;
      return `${origin}/${owner}/${repo}/tree/${ref}/${folderPath.join(
        "/"
      )}${hash}`;
    }

    case "commit": {
      const [sha] = rest;
      return sha ? `${origin}/${owner}/${repo}/commit/${sha}` : null;
    }

    case "commits": {
      const [ref] = rest;
      return ref ? `${origin}/${owner}/${repo}/commits/${ref}` : null;
    }

    case "pull": {
      const [prNumber, subpage, ...prRest] = rest;
      if (!prNumber) return null;

      if (subpage === "files") {
        return `${origin}/${owner}/${repo}/pull/${prNumber}/files${hash}`;
      }

      if (subpage === "commits") {
        return prRest.length === 1
          ? `${origin}/${owner}/${repo}/pull/${prNumber}/commits/${prRest[0]}`
          : `${origin}/${owner}/${repo}/pull/${prNumber}/commits`;
      }

      return `${origin}/${owner}/${repo}/pull/${prNumber}`;
    }

    case "raw": {
      return `${origin}/${owner}/${repo}/raw/${rest.join("/")}`;
    }

    default:
      // fallback
      const permalinkAnchor = document.querySelector<HTMLAnchorElement>(
        "a.js-permalink-shortcut"
      );
      if (permalinkAnchor?.href) {
        return `${permalinkAnchor.href}${hash}`;
      }
      return null;
  }
}
