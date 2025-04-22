import { build, context } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { zip } from "zip-a-folder";

const targetArg = process.argv.find(arg => arg.startsWith("--target="));
const buildTarget = targetArg ? targetArg.split("=")[1] : "chrome";
const isFirefox = buildTarget === "firefox";
const shouldWatch = process.argv.includes("--watch");
const shouldZip = process.argv.includes("--zip");

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(__dirname, "dist");

function safeCopyFile(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

function copyStaticAssets() {
  safeCopyFile("src/popup.html", `${outdir}/popup.html`);
  safeCopyFile("src/svg/nostr-icon.svg", `${outdir}/svg/nostr-icon.svg`);
  safeCopyFile("src/svg/gitworkshop.svg", `${outdir}/svg/gitworkshop.svg`);
  safeCopyFile("src/icons/icon-16.png", `${outdir}/icons/icon-16.png`);
  safeCopyFile("src/icons/icon-32.png", `${outdir}/icons/icon-32.png`);
  safeCopyFile("src/icons/icon-48.png", `${outdir}/icons/icon-48.png`);
  safeCopyFile("src/icons/icon-128.png", `${outdir}/icons/icon-128.png`);
  safeCopyFile(
    isFirefox ? "src/manifest.firefox.json" : "src/manifest.json",
    `${outdir}/manifest.json`
  );
}

function printManifestSummary() {
  const manifestPath = resolve(outdir, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  const icons = manifest.icons || {};
  const hasIcons = ["16", "32", "48", "128"].every(size => icons[size]);
  const permissions = manifest.permissions?.join(", ") || "None";

  console.log("\n📦 Manifest Summary");
  console.log("────────────────────────────");
  console.log(` Name:         ${manifest.name}`);
  console.log(` Version:      ${manifest.version}`);
  console.log(` Type:         ${isFirefox ? "Firefox (MV2)" : "Chrome (MV3)"}`);

  if (manifest.background?.service_worker) {
    console.log(` BG Script:    ${manifest.background.service_worker} (service_worker)`);
  } else if (manifest.background?.scripts) {
    console.log(` BG Script:    ${manifest.background.scripts.join(", ")}`);
  } else {
    console.log(" BG Script:    None");
  }

  console.log(` Permissions:  ${permissions}`);

  const content = manifest.content_scripts?.[0];
  if (content) {
    console.log(` Content:      ${content.js.join(", ")} (matches ${content.matches?.join(", ")})`);
  }

  if (manifest.action?.default_popup || manifest.browser_action?.default_popup) {
    console.log(` Popup:        ${manifest.action?.default_popup || manifest.browser_action?.default_popup}`);
  } else {
    console.log(" Popup:        None");
  }

  console.log(` Icons:        ${hasIcons ? "✅" : "❌ Missing sizes"}`);
  console.log("────────────────────────────\n");
}

copyStaticAssets();

const buildOptions = {
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
    "process.env.NODE_ENV": '"development"',
  },
};

if (shouldWatch) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log("👀 Watching for changes...");
} else {
  await build(buildOptions);
  console.log("✅ Build complete");
  printManifestSummary();

  if (shouldZip) {
    const zipFile = `extension-${buildTarget}.zip`;
    const zipPath = resolve(__dirname, zipFile);
    await zip(outdir, zipPath);
    console.log(`📦 Zipped to ${zipFile}`);
  }
}
