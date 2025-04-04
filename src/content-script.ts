function insertNostrRepoCommand() {
  // Check if we already added te new item to avoid duplication
  const existingItem = document.getElementById("nostr-share-repo-button");
  if (existingItem) return;

  const buttons = document.getElementById("repository-details-container");
  if (!buttons) return;

  const button = createButton();

  buttons.firstElementChild?.insertAdjacentElement("afterbegin", button);

  button.addEventListener("click", async () => {
    console.log("Button clicked");
  });
}

function createButton() {
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

  injectSvgInline(labelSpan, "svg/nostr-icon.svg");

  labelSpan.textContent = "Share on Nostr";

  buttonContainer.appendChild(labelSpan);
  button.appendChild(buttonContainer);
  div.appendChild(button);
  li.appendChild(div);

  return li;
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

function injectNostrMenuCommand() {
  // Check if we already added te new item to avoid duplication
  const existingItem = document.getElementById("nostr-generate-event-label");
  if (existingItem) return;

  const menuItems = document.querySelectorAll<HTMLSpanElement>(
    "span.prc-ActionList-ItemLabel-TmBhn"
  );
  if (!menuItems) return;

  // Look for the menu item whose text is "Copy permalink"
  const copyPermalinkItem = Array.from(menuItems).find(
    (el) => el.textContent?.trim() === "Copy permalink"
  );
  if (!copyPermalinkItem) return;

  const listItem = createPermalinkMenuItem();

  const rootItem = copyPermalinkItem?.closest(
    ".prc-ActionList-ActionListItem-uq6I7"
  );

  rootItem?.insertAdjacentElement("afterend", listItem);

  listItem.addEventListener("click", async () => {
    const permalink = extractPermalink();
    if (!permalink) {
      alert("Could not locate the permalink URL. Please try again.");
      return;
    }
    try {
      //const nostrEvent = await createAndSignEvent(permalink);
      //console.log("Successfully created Nostr event:", nostrEvent);
      alert("Created Nostr event. Check console for details.");
    } catch (err) {
      console.error("Error generating Nostr event:", err);
      alert("Failed to generate Nostr event. Check console for details.");
    }
  });
}

function extractPermalink(): string | null {
  const currentURL = window.location.href;
  return currentURL || null;
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

function createPermalinkMenuItem(): HTMLLIElement {
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
  labelSpan.textContent = "Create Nostr permalink";

  // Nest the elements
  subContentSpan.appendChild(labelSpan);
  div.appendChild(spacerSpan);
  div.appendChild(subContentSpan);
  li.appendChild(div);

  return li;
}

injectNostrMenuCommand();
insertNostrRepoCommand();
startObserver();
