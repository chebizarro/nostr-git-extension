import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "fs";
import { utils } from "nostr-tools";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Helper to ensure destination folder exists
function safeCopyFile(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

// Make sure we resolve from the project root
const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(__dirname, "dist");

// Copy static files
safeCopyFile("src/manifest.json", `${outdir}/manifest.json`);
safeCopyFile("src/popup.html", `${outdir}/popup.html`);
safeCopyFile("src/svg/nostr-icon.svg", `${outdir}/svg/nostr-icon.svg`);
safeCopyFile("src/svg/gitworkshop.svg", `${outdir}/svg/gitworkshop.svg`);
safeCopyFile("src/icons/icon-16.png", `${outdir}/icons/icon-16.png`);
safeCopyFile("src/icons/icon-32.png", `${outdir}/icons/icon-32.png`);
safeCopyFile("src/icons/icon-48.png", `${outdir}/icons/icon-48.png`);
safeCopyFile("src/icons/icon-128.png", `${outdir}/icons/icon-128.png`);

await build({
  entryPoints: {
    "content-script": "src/content-script.ts",
    "background": "src/background.ts",
	"page-bridge": "src/page-bridge.ts",
	"popup": "src/popup.ts",
	"utils": "src/utils.ts",
  },
  bundle: true,
  outdir,
  target: ["es2020"],
  platform: "browser",
  format: "iife",
  sourcemap: true,
  loader: {
    ".ts": "ts",
    ".svg": "text",
  },
  define: {
    "process.env.NODE_ENV": '"development"'
  }
});
