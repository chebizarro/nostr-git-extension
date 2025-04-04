chrome.runtime.onInstalled.addListener(() => {
  console.log("Nostr GitHub Integration extension installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "NOSTR_EVENT_CREATED") {
    console.log(
      "Got newly created Nostr event from content script:",
      message.payload
    );
  }
  sendResponse({});
});
