#!/usr/bin/env node
// ============================================================================
// Copy 68 existing categories from 2k-video-3april-gpu
// Updates targetDuration to 120-170 seconds (2:00 - 2:50)
// ============================================================================

const path = require("path");
const fs = require("fs");

const SOURCE_DIR = path.resolve(__dirname, "..", "2k-video-3april-gpu");
const DEST_DIR = __dirname;
const SRC_DIR = path.join(DEST_DIR, "src");

// Seeded random for deterministic durations
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s >>> 0) / 0x7fffffff;
  };
}

function toPascalCase(str) {
  return str.split(/[-_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}

// Find all category directories in source
const sourceDirs = fs.readdirSync(SOURCE_DIR).filter(d => {
  const fullPath = path.join(SOURCE_DIR, d);
  return fs.statSync(fullPath).isDirectory()
    && fs.existsSync(path.join(fullPath, "catalog.json"))
    && d !== "node_modules" && d !== "src" && d !== "out" && d !== "public" && d !== "dist";
});

console.log("============================================");
console.log("  Copying 68 Existing Categories");
console.log("  Updating duration to 120-170 seconds");
console.log("============================================\n");

let totalVideos = 0;

for (const categoryKey of sourceDirs) {
  const sourceDir = path.join(SOURCE_DIR, categoryKey);
  const destDir = path.join(DEST_DIR, categoryKey);

  // Create destination directory
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Read source catalog
  const catalog = JSON.parse(fs.readFileSync(path.join(sourceDir, "catalog.json"), "utf-8"));
  const videos = Array.isArray(catalog) ? catalog : catalog.videos || [];

  // Seed based on category name
  const seed = categoryKey.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 137;

  // Update each video's targetDuration to 120-170 range
  for (let v = 0; v < videos.length; v++) {
    const rng = seededRandom(seed + v);
    videos[v].targetDuration = 120 + Math.floor(rng() * 51); // 120-170 seconds
  }

  // Write updated catalog
  fs.writeFileSync(path.join(destDir, "catalog.json"), JSON.stringify(videos, null, 2));
  totalVideos += videos.length;

  // Generate register-compositions.js
  const rootName = toPascalCase(categoryKey) + "Root";
  const registerScript = generateRegisterScript(categoryKey, rootName);
  fs.writeFileSync(path.join(destDir, "register-compositions.js"), registerScript);

  console.log(`  ${categoryKey}: ${videos.length} videos (copied & updated)`);
}

function generateRegisterScript(categoryKey, rootName) {
  return `#!/usr/bin/env node
const path = require("path");
const fs = require("fs");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const CATALOG = path.join(__dirname, "catalog.json");
const SRC_DIR = path.join(PROJECT_ROOT, "src");
const FPS = 30;

function toPascalCase(str) {
  return str.split(/[-_\\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}

const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf-8"));
const videos = Array.isArray(catalog) ? catalog : catalog.videos || [];

let content = 'import "./index.css";\\n';
content += 'import { Composition } from "remotion";\\n';
content += 'import { AlphabetLongTemplate } from "./AlphabetLongTemplate";\\n';
content += 'import type { AlphabetLongProps } from "./AlphabetLongTemplate";\\n';
content += 'import React from "react";\\n\\n';
content += 'export const ${rootName}: React.FC = () => {\\n';
content += '  return (\\n';
content += '    <>\\n';

for (const video of videos) {
  const compId = toPascalCase(video.id);
  const items = video.items || video.letters || [];
  const letterDur = video.letterDuration || 3;
  const introDur = video.introDuration || 3;
  const outroDur = video.outroDuration || 3;
  const targetDur = video.targetDuration || 150;
  const totalFrames = Math.round(targetDur * FPS);

  content += '      <Composition\\n';
  content += '        id="' + compId + '"\\n';
  content += '        component={AlphabetLongTemplate}\\n';
  content += '        durationInFrames={' + totalFrames + '}\\n';
  content += '        fps={' + FPS + '}\\n';
  content += '        width={1080}\\n';
  content += '        height={1920}\\n';
  content += '        defaultProps={{\\n';
  content += '          title: ' + JSON.stringify(video.title) + ',\\n';
  content += '          videoId: ' + JSON.stringify(video.id) + ',\\n';
  content += '          bgGradient: ' + JSON.stringify(video.bgGradient) + ' as [string, string],\\n';
  content += '          accentColor: ' + JSON.stringify(video.accentColor) + ',\\n';
  content += '          letters: ' + JSON.stringify(items) + ',\\n';
  content += '          letterDuration: ' + letterDur + ',\\n';
  content += '          introDuration: ' + introDur + ',\\n';
  content += '          outroDuration: ' + outroDur + ',\\n';
  content += '          targetDuration: ' + targetDur + ',\\n';
  content += '        }}\\n';
  content += '      />\\n';
}

content += '    </>\\n';
content += '  );\\n';
content += '};\\n';

const outPath = path.join(SRC_DIR, "${rootName}.tsx");
fs.writeFileSync(outPath, content);
console.log("  Generated " + outPath + " (" + videos.length + " compositions)");
`;
}

console.log(`\n  TOTAL: ${totalVideos} videos from ${sourceDirs.length} categories copied`);
console.log("\nDone!");
