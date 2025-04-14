window.addEventListener("message", async (event) => {
	if (event.source !== window || !event.data || event.data.type !== "SIGN_REPO_EVENT") return;
  
	try {
	  if (!window.nostr || typeof window.nostr.signEvent !== "function") {
		throw new Error("NIP-07 signer not available.");
	  }
  
	  const signedEvent = await window.nostr.signEvent(event.data.event);
	  window.postMessage({ type: "SIGNED_REPO_EVENT", event: signedEvent }, "*");
	} catch (err) {
	  window.postMessage({ type: "SIGN_ERROR", error: err.toString() }, "*");
	}
  });
  