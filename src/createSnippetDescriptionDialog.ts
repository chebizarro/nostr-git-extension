export interface SnipptDescription {
  description: string;
  runtime: string;
}

export function promptForSnippetDescription(): Promise<SnipptDescription | null> {
  return new Promise((resolve) => {
    if (document.getElementById("nostr-snippet-dialog")) {
      resolve(null);
      return;
    }

    const dialog = document.createElement("dialog");
    dialog.id = "nostr-snippet-dialog";
    dialog.style.padding = "0";
    dialog.style.border = "none";
    dialog.style.borderRadius = "6px";
    dialog.style.maxWidth = "500px";
    dialog.style.width = "90%";
    dialog.style.zIndex = "1000";
    dialog.style.boxShadow =
      "0 0 0 1px rgba(27,31,36,0.15), 0 3px 6px rgba(140,149,159,0.15)";
    dialog.style.fontFamily = `"Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;

    dialog.innerHTML = `
		<form method="dialog" style="padding: 16px;">
		  <h3 style="margin-top: 0; font-size: 16px;">Enter a description for this Snippet</h3>
		  <textarea id="nostr-snippet-desc" rows="4" style="width: 100%; box-sizing: border-box; resize: vertical;" placeholder="e.g. Highlights a regex use case..."></textarea>
		  <h3 style="margin-top: 0; font-size: 16px;">Enter runtime information for this Snippet</h3>
		  <input type="text" id="nostr-snippet-runtime" style="width: 100%; box-sizing: border-box; resize: vertical;" placeholder="e.g. node v18.15.0"></input>
		  <div style="margin-top: 12px; text-align: right;">
			<button type="submit" id="cancel-snippet" style="margin-right: 8px;">Cancel</button>
			<button type="submit" id="submit-snippet" class="btn-primary">Create</button>
		  </div>
		</form>
	  `;

    document.body.appendChild(dialog);
    dialog.showModal();

    const textarea = dialog.querySelector<HTMLTextAreaElement>(
      "#nostr-snippet-desc"
    )!;
    const cancelBtn =
      dialog.querySelector<HTMLButtonElement>("#cancel-snippet")!;
    const submitBtn =
      dialog.querySelector<HTMLButtonElement>("#submit-snippet")!;
    const input = dialog.querySelector<HTMLInputElement>(
      "#nostr-snippet-runtime"
    )!;

    cancelBtn.addEventListener("click", () => {
      dialog.close();
      dialog.remove();
      resolve(null);
    });

    submitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const result = {
        description: textarea.value.trim(),
        runtime: input.value.trim(),
      };
      dialog.close();
      dialog.remove();
      resolve(result);
    });
  });
}
