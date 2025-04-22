# Nostr GitHub Integration Extension

[![Made for Nostr](https://img.shields.io/badge/Nostr-enabled-purple?logo=nostr&logoColor=white)](https://github.com/nostr-protocol)
[![GitHub](https://img.shields.io/github/license/chebizarro/nostr-git-extension)](https://github.com/chebizarro/nostr-git-extension/blob/main/LICENSE)

This browser extension adds Nostr Git support to GitHub by creating repo annoucements, code snippets and permalinks and  publishing them to selected relays.

---

## Features

- **Create Nostr git repo announcements** (kind: `3067`) from the main repo page
- **Create Nostr code snippets** (kind: `1337`) from files or selections
- **Create Nostr permalinks** (proposed kind: `1623`) from selected GitHub line ranges
- Automatically extracts:
  - Line range
  - File path and extension
  - Repo metadata (license, topics, runtime, description)
  - Commit hash and message
- **User-configurable relays** via popup toolbar menu
- Signed with your browser’s NIP-07 signer (e.g. [AKA Profiles](https://akaprofiles.com/))

---

## Installation (Developer Mode)

1. **Clone the repo**:

   ```bash
   git clone https://github.com/chebizarro/nostr-git-extension.git
   cd nostr-git-extension
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Build the extension**:

   ```bash
   npm run build
   ```

4. **Load into Chrome**:
   - Visit `chrome://extensions/`
   - Enable **Developer Mode**
   - Click **“Load unpacked”**
   - Select the `dist/` directory

---

## How It Works

- On GitHub file or permalink pages:
  - Right-click or use the gutter menu to select **Create Nostr Snippet** or **Create Nostr Permalink**
  - A GitHub-style modal appears for optional description
  - The extension creates and sends a signed Nostr event (kind `1337` or `1623`) to your configured relays

---

## Configuration

- Click the Nostr Git icon in your toolbar
- Add one or more relays (e.g. `wss://relay.damus.io`)
- These will be used for publishing and fetching existing events

---

## Contributing

PRs, bug reports, and feature suggestions welcome!

Repo: [https://github.com/chebizarro/nostr-git-extension](https://github.com/chebizarro/nostr-git-extension)

---

## License

[MIT License](https://github.com/chebizarro/nostr-git-extension/blob/main/LICENSE)
