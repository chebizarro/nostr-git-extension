export const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.snort.social",
  "wss://nostr.wine",
  "wss://eden.nostr.land",
];

export function getActiveRelays(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["nostrRelays"], ({ nostrRelays }) => {
      resolve(Array.isArray(nostrRelays) ? nostrRelays : DEFAULT_RELAYS);
    });
  });
}
