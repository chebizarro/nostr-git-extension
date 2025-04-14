import { EventTemplate, NostrEvent } from "nostr-tools";

export function requestNip07Signature(event: EventTemplate): Promise<NostrEvent> {
  return new Promise((resolve, reject) => {
    function handler(e: MessageEvent) {
      if (e.source !== window) return;

      if (e.data?.type === "SIGNED_REPO_EVENT") {
        window.removeEventListener("message", handler);
        resolve(e.data.event);
      } else if (e.data?.type === "SIGN_ERROR") {
        window.removeEventListener("message", handler);
        reject(e.data.error);
      }
    }

    window.addEventListener("message", handler);
    window.postMessage({ type: "SIGN_REPO_EVENT", event }, "*");
  });
}
