import { nip19, NostrEvent } from "nostr-tools";
import {
  copyNeventToClipboard,
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

  const existingSmlButton = document.getElementById("nostr-share-repo-button");
  if (existingSmlButton) return;

  const buttons = document.getElementById("repository-details-container");
  if (!buttons) return;

  const [button, label] = createButton();
  buttons.firstElementChild?.insertAdjacentElement("afterbegin", button);

  const smlButtonDiv = document.querySelector<HTMLFormElement>(
    "form.unstarred.js-social-form"
  );
  const [smlButton, smlLabel] = createSmallButton();
  smlButtonDiv!.parentElement!.insertAdjacentElement("afterend", smlButton);

  fetchRepoEvent(relays).then((e) => {
    event = e;
    const gitWorkshp = () => {
      const npub = nip19.npubEncode(event!.pubkey);
      const repo = event!.tags.find((t) => t[0] === "d")?.[1];
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

function createSmallButton(): [HTMLDivElement, HTMLSpanElement] {
  const div = document.createElement("div");
  div.className = "d-md-none";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "Button Button--iconOnly Button--secondary Button--medium";
  button.tabIndex = 1;

  const buttonContainer = document.createElement("span");
  buttonContainer.className = "prc-Button-ButtonContent-HKbr-";

  const labelSpan = document.createElement("span");
  labelSpan.id = "nostr-share-repo-button-sml";
  labelSpan.className = "prc-Button-Visual-2epfX prc-Button-VisualWrap-Db-eB";

  buttonContainer.appendChild(labelSpan);
  button.appendChild(buttonContainer);
  div.appendChild(button);

  return [div, labelSpan];
}

function createButton(): [HTMLLIElement, HTMLSpanElement] {
  const li = document.createElement("li");
  const div = document.createElement("div");
  div.className = "Box-sc-g0xbh4-0";

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
  svgPath: string,
  cls: string[]
): Promise<void> {
  try {
    const res = await fetch(chrome.runtime.getURL(svgPath));
    const svgText = await res.text();

    const wrapper = document.createElement("div");
    wrapper.innerHTML = svgText;
    const svgElement = wrapper.firstElementChild as SVGElement;
    if (svgElement && svgElement.tagName === "svg") {
      svgElement.classList.add(...cls);
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
          `Successfully poster Nostr event: ${nevent} to relays: ${relays}`
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

function showSnackbar(message: string, type: "success" | "error" = "success") {
  ensureSnackbarContainer();

  const snackbar = document.createElement("div");
  snackbar.textContent = message;
  snackbar.style.background = type === "success" ? "#2da44e" : "#cf222e";
  snackbar.style.color = "#ffffff";
  snackbar.style.padding = "8px 16px";
  snackbar.style.borderRadius = "6px";
  snackbar.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
  snackbar.style.fontSize = "14px";
  snackbar.style.fontWeight = "500";
  snackbar.style.maxWidth = "90%";
  snackbar.style.whiteSpace = "nowrap";
  snackbar.style.overflow = "hidden";
  snackbar.style.textOverflow = "ellipsis";
  snackbar.style.opacity = "0";
  snackbar.style.transition = "opacity 0.2s ease";

  document.getElementById("nostr-snackbar-container")?.appendChild(snackbar);

  requestAnimationFrame(() => {
    snackbar.style.opacity = "1";
  });

  setTimeout(() => {
    snackbar.style.opacity = "0";
    setTimeout(() => snackbar.remove(), 500);
  }, 3000);
}

function ensureSnackbarContainer() {
  if (document.getElementById("nostr-snackbar-container")) return;

  const container = document.createElement("div");
  container.id = "nostr-snackbar-container";
  container.style.position = "fixed";
  container.style.bottom = "20px";
  container.style.left = "50%";
  container.style.transform = "translateX(-50%)";
  container.style.zIndex = "9999";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "center";
  container.style.gap = "8px";
  document.body.appendChild(container);
}

injectNostrMenuCommand();
insertNostrRepoCommand();
startObserver();
