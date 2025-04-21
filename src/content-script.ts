import { nip19 } from "nostr-tools";
import {
  copyNeventToClipboard,
  createCodeReferenceEvent,
  createCodeSnippetEvent,
  createRepoAnnouncementEvent,
  fetchRepoEvent,
  publishEvent,
} from "./event";
import { parsePermalink, parseSnippetLink } from "./github";
import { promptForSnippetDescription } from "./snippet-dialog";
import { getActiveRelays } from "./defaults";
import {
  createButton,
  createMenuItem,
  createSmallButton,
  injectSvgInline,
  showSnackbar,
} from "./utils";

injectNostrBridge();

async function insertNostrIssuesCommand() {
  const buttons = document.querySelector("div.-VisibleItems-module__Box_1--_dgKR");
  if (!buttons) return;

  const [button, label] = createButton();
  buttons.firstElementChild?.insertAdjacentElement("afterbegin", button);

  label.textContent = "Share on Nostr";
  injectSvgInline(label, "svg/nostr-icon.svg", ["octicon", "mr-2"]);

}

async function insertNostrRepoCommand() {
  const existingItem = document.getElementById("nostr-share-repo-button");
  if (existingItem) return;

  const existingSmlButton = document.getElementById("nostr-share-repo-button");
  if (existingSmlButton) return;

  const buttons = document.getElementById("repository-details-container");
  if (!buttons) return;

  const relays = await getActiveRelays();

  const [button, label] = createButton();
  buttons.firstElementChild?.insertAdjacentElement("afterbegin", button);

  const smlButtonDiv = document.querySelector<HTMLFormElement>(
    "form.unstarred.js-social-form"
  );
  const [smlButton, smlLabel] = createSmallButton();
  smlButtonDiv!.parentElement!.insertAdjacentElement("afterend", smlButton);

  fetchRepoEvent(relays).then((e) => {
    const gitWorkshp = () => {
      const npub = nip19.npubEncode(e!.pubkey);
      const repo = e!.tags.find((t) => t[0] === "d")?.[1];
      const url = `https://gitworkshop.dev/${npub}/${repo}`;
      window.open(url, "_blank");
    };
    if (e) {
      label.textContent = "Open on gitworkshop.dev";
      injectSvgInline(label, "svg/gitworkshop.svg", ["octicon", "mr-2"]);
      injectSvgInline(smlLabel, "svg/gitworkshop.svg", [
        "octicon",
        "Button-visual",
      ]);
      button.addEventListener("click", gitWorkshp);
      smlButton.addEventListener("click", gitWorkshp);
    } else {
      const shareOnNostr = async () => {
        try {
          const unsignedEvent = await createRepoAnnouncementEvent(relays);
          if (unsignedEvent) {
            const finalEvent = await publishEvent(unsignedEvent, relays);
            await copyNeventToClipboard(finalEvent, relays);
            showSnackbar("✅ Repository announcement published");
            button.remove();
            smlButton.remove();
          }
        } catch (err) {
          showSnackbar(
            "❌ Failed to publish Repository Announcement event",
            "error"
          );
        }
      };
      label.textContent = "Share on Nostr";
      injectSvgInline(label, "svg/nostr-icon.svg", ["octicon", "mr-2"]);
      injectSvgInline(smlLabel, "svg/nostr-icon.svg", [
        "octicon",
        "Button-visual",
      ]);
      button.addEventListener("click", shareOnNostr);
      smlButton.addEventListener("click", shareOnNostr);
    }
  });
}

async function injectNostrMenuCommand() {
  // Check if we already added te new item to avoid duplication
  const existingItem = document.getElementById("nostr-generate-event-label");
  if (existingItem) return;

  const menuItems = document.querySelectorAll<HTMLSpanElement>(
    "span.prc-ActionList-ItemLabel-TmBhn"
  );
  if (!menuItems) return;

  const relays = await getActiveRelays();

  const copyPermalinkItem = Array.from(menuItems).find(
    (el) => el.textContent?.trim() === "Copy permalink"
  );
  if (!copyPermalinkItem) return;

  const rootItem = copyPermalinkItem?.closest(
    ".prc-ActionList-ActionListItem-uq6I7"
  );

  const permalinkItem = createMenuItem("Create Nostr permalink");

  rootItem?.insertAdjacentElement("afterend", permalinkItem);

  const snippetItem = createMenuItem("Create Nostr snippet");

  permalinkItem.insertAdjacentElement("afterend", snippetItem);

  permalinkItem.addEventListener("click", async () => {
    closeGitHubContextMenu();
    const permalink = extractPermalink();
    if (!permalink) {
      showSnackbar("❗Could not locate the permalink URL. Please try again.");
      return;
    }
    try {
      const permalinkData = parsePermalink();
      const nostrEvent = await createCodeReferenceEvent(permalinkData!, relays);
      const finalEvent = await publishEvent(nostrEvent, relays);
      const nevent = await copyNeventToClipboard(finalEvent, relays);
      showSnackbar(`✅ Permalink event published`);
    } catch (err) {
      console.error(`Error generating Nostr event: ${err}`, err);
      showSnackbar("❌ Failed to publish Permalink", "error");
    }
  });

  snippetItem.addEventListener("click", async () => {
    closeGitHubContextMenu();
    const desc = await promptForSnippetDescription();
    if (desc) {
      try {
        const snippetData = parseSnippetLink();
        const nostrEvent = createCodeSnippetEvent(snippetData!, desc);
        const finalEvent = await publishEvent(nostrEvent, relays);
        const nevent = await copyNeventToClipboard(finalEvent, relays);
        console.log(
          `Successfully posted Nostr event: ${nevent} to relays: ${relays}`
        );
        showSnackbar(`✅ Snippet event published`);
      } catch (err) {
        showSnackbar(`❌ Failed to publish Snippet: ${err}`, "error");
      }
    }
  });
}

function extractPermalink(): string | null {
  const currentURL = window.location.href;
  return currentURL || null;
}

function closeGitHubContextMenu() {
  const escapeEvent = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    bubbles: true,
    cancelable: true,
  });

  document.dispatchEvent(escapeEvent);
}

function startObserver() {
  // Observe changes to the DOM so that if the user navigates via Ajax, we can re-inject.
  const observer = new MutationObserver(() => {
    injectNostrMenuCommand();
    insertNostrRepoCommand();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function injectNostrBridge(): void {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("page-bridge.js");
  script.type = "module";
  script.async = false;
  document.documentElement.appendChild(script);
  script.remove();
}

injectNostrMenuCommand();
insertNostrRepoCommand();
insertNostrIssuesCommand();
startObserver();
