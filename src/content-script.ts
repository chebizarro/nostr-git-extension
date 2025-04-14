import { nip19, NostrEvent } from "nostr-tools";
import {
  createCodeReferenceEvent,
  createCodeSnippetEvent,
  createRepoAnnouncementEvent,
  fetchRepoEvent,
  publishEvent,
} from "./event";
import { requestNip07Signature } from "./nip07";
import {
  extractLatestCommitInfo,
  parsePermalink,
  parseSnippetLink,
} from "./github";
import { promptForSnippetDescription } from "./snippet-dialog";
import { getActiveRelays } from "./defaults";

injectNostrBridge();

async function insertNostrRepoCommand() {
  let event: NostrEvent | undefined;

  const relays = await getActiveRelays();

  const existingItem = document.getElementById("nostr-share-repo-button");
  if (existingItem) return;

  const buttons = document.getElementById("repository-details-container");
  if (!buttons) return;

  const [button, label] = createButton();

  buttons.firstElementChild?.insertAdjacentElement("afterbegin", button);

  fetchRepoEvent(relays).then((e) => {
    event = e;
    if (e) {
      label.textContent = "Open on gitworkshop.dev";
      injectSvgInline(label, "svg/gitworkshop.svg");
      button.addEventListener("click", () => {
        const npub = nip19.npubEncode(e.pubkey);
        const repo = e.tags.find((t) => t[0] === "d")?.[1];

        const url = `https://gitworkshop.dev/${npub}/${repo}`;
        window.open(url, "_blank");
      });
    } else {
      label.textContent = "Share on Nostr";
      injectSvgInline(label, "svg/nostr-icon.svg");
      button.addEventListener("click", async () => {
        const unsignedEvent = await createRepoAnnouncementEvent(relays);
        if (unsignedEvent) {
          console.log("Unsigned event:", unsignedEvent);
          await publishEvent(unsignedEvent, relays);
        }
      });
    }
  });
}

function createButton(): [HTMLLIElement, HTMLSpanElement] {
  const li = document.createElement("li");
  const div = document.createElement("div");
  div.className = "Box-sc-g0xbh4-0 YUPas";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn-sm btn";
  button.tabIndex = 1;

  const buttonContainer = document.createElement("span");
  buttonContainer.className = "prc-Button-ButtonContent-HKbr-";

  const labelSpan = document.createElement("span");
  labelSpan.id = "nostr-share-repo-button";
  labelSpan.className = "prc-Button-Label-pTQ3x";

  labelSpan.textContent = "Loading...";

  buttonContainer.appendChild(labelSpan);
  button.appendChild(buttonContainer);
  div.appendChild(button);
  li.appendChild(div);

  return [li, labelSpan];
}

async function injectSvgInline(
  target: HTMLElement,
  svgPath: string
): Promise<void> {
  try {
    const res = await fetch(chrome.runtime.getURL(svgPath));
    const svgText = await res.text();

    const wrapper = document.createElement("div");
    wrapper.innerHTML = svgText;
    const svgElement = wrapper.firstElementChild;

    if (svgElement && svgElement.tagName === "svg") {
      target.prepend(svgElement);
    }
  } catch (err) {
    console.error("Failed to load SVG", svgPath, err);
  }
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
  console.log(relays);

  // Look for the menu item whose text is "Copy permalink"
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
      alert("Could not locate the permalink URL. Please try again.");
      return;
    }
    try {
      const permalinkData = parsePermalink();
      const nostrEvent = await createCodeReferenceEvent(permalinkData!, relays);
      console.log("Successfully created Nostr event:", nostrEvent);
      await publishEvent(nostrEvent, relays);
    } catch (err) {
      console.error("Error generating Nostr event:", err);
      alert("Failed to generate Nostr event. Check console for details.");
    }
  });

  snippetItem.addEventListener("click", async () => {
    closeGitHubContextMenu();
    const desc = await promptForSnippetDescription();
    if (desc) {
      const snippetData = parseSnippetLink();
      const nostrEvent = createCodeSnippetEvent(snippetData!, desc);
      await publishEvent(nostrEvent, relays);
      console.log(
        `Successfully poster Nostr event: ${nostrEvent} to relays: ${relays}`
      );
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

function createMenuItem(label: string): HTMLLIElement {
  // Create the <li> element
  const li = document.createElement("li");
  li.tabIndex = -1;
  li.setAttribute("aria-labelledby", ":nostr-generate-event-label  ");
  li.setAttribute("role", "menuitem");
  li.id = "nostr-generate-event";
  li.className = "prc-ActionList-ActionListItem-uq6I7";
  li.setAttribute("aria-keyshortcuts", "n");

  // Create the <div>
  const div = document.createElement("div");
  div.className = "prc-ActionList-ActionListContent-sg9-x";

  // Create the first <span> (the spacer)
  const spacerSpan = document.createElement("span");
  spacerSpan.className = "prc-ActionList-Spacer-dydlX";

  // Create the second <span> (sub-content container)
  const subContentSpan = document.createElement("span");
  subContentSpan.className = "prc-ActionList-ActionListSubContent-lP9xj";

  // Create the inner label <span>
  const labelSpan = document.createElement("span");
  labelSpan.id = "nostr-generate-event-label";
  labelSpan.className = "prc-ActionList-ItemLabel-TmBhn";
  labelSpan.textContent = label;

  // Nest the elements
  subContentSpan.appendChild(labelSpan);
  div.appendChild(spacerSpan);
  div.appendChild(subContentSpan);
  li.appendChild(div);

  return li;
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
startObserver();
