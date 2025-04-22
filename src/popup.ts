import { DEFAULT_RELAYS } from "./defaults.js";

const relayList = document.getElementById("relayList") as HTMLTextAreaElement;
const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;
const statusElement = document.getElementById("status") as HTMLParagraphElement;

// Load existing relays or fallback
chrome.storage.sync.get(["nostrRelays"], ({ nostrRelays }) => {
  const relays = Array.isArray(nostrRelays) ? nostrRelays : DEFAULT_RELAYS;
  relayList.value = relays.join("\n");
});

// Save relays
saveBtn.addEventListener("click", () => {
  const relays = relayList.value
    .split("\n")
	.filter((r) => r.trim())
    .map((r) => r.trim());
  chrome.storage.sync.set({ nostrRelays: relays }, () => {
    statusElement.textContent = "Relays saved!";
    setTimeout(() => (statusElement.textContent = ""), 2000);
  });
});
