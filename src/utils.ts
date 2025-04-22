export function showSnackbar(message: string, type: "success" | "error" = "success") {
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

export function createSmallButton(id: string): [HTMLDivElement, HTMLSpanElement] {
  const div = document.createElement("div");
  div.className = "d-md-none";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "Button Button--iconOnly Button--secondary Button--medium";
  button.tabIndex = 1;

  const buttonContainer = document.createElement("span");
  buttonContainer.className = "prc-Button-ButtonContent-HKbr-";

  const labelSpan = document.createElement("span");
  labelSpan.id = id;
  labelSpan.className = "prc-Button-Visual-2epfX prc-Button-VisualWrap-Db-eB";

  buttonContainer.appendChild(labelSpan);
  button.appendChild(buttonContainer);
  div.appendChild(button);

  return [div, labelSpan];
}

export function createButton(id: string, cls: string): [HTMLDivElement, HTMLSpanElement] {
  const div = document.createElement("div");
  div.className = "Box-sc-g0xbh4-0";

  const button = document.createElement("button");
  button.type = "button";
  button.className = cls;
  button.tabIndex = 1;

  const buttonContainer = document.createElement("span");
  buttonContainer.className = "prc-Button-ButtonContent-HKbr-";

  const labelSpan = document.createElement("span");
  labelSpan.id = id;
  labelSpan.className = "prc-Button-Label-pTQ3x";

  labelSpan.textContent = "Loading...";

  buttonContainer.appendChild(labelSpan);
  button.appendChild(buttonContainer);
  div.appendChild(button);

  return [div, labelSpan];
}

export async function injectSvgInline(
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

export function createMenuItem(label: string): HTMLLIElement {
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
