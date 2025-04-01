function injectNostrMenuCommand() {
	const menuItems = document.querySelectorAll<HTMLSpanElement>("prc-ActionList-ActionListItem-uq6I7");
	if (!menuItems.length) return;

	// Check if we already added te new item to avoid duplication
	const existingItem = document.getElementById("nostr-generate-event-label");
	if (existingItem) return;

	// Create new menu item
	const listItem = createPermalinkMenuItem();

	// Insert new item after the "Copy permalink" item
	listItem.parentElement?.insertAdjacentElement("afterend", listItem);

	// Add click handler
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
	li.setAttribute("aria-labelledby", ":raz:--label  ");
	li.setAttribute("role", "menuitem");
	li.id = ":raz:";
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
	labelSpan.id = ":raz:--label";
	labelSpan.className = "prc-ActionList-ItemLabel-TmBhn";
	labelSpan.textContent = "Create Nostr permalink";

	// Nest the elements
	subContentSpan.appendChild(labelSpan);
	div.appendChild(spacerSpan);
	div.appendChild(subContentSpan);
	li.appendChild(div);

	// Return the fully constructed <li>
	return li;
}



// Kick it off
injectNostrMenuCommand();
startObserver();
