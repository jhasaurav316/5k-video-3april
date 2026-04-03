#!/usr/bin/env node
const path = require("path");
const fs = require("fs");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const CATALOG = path.join(__dirname, "catalog.json");
const SRC_DIR = path.join(PROJECT_ROOT, "src");
const FPS = 30;

function toPascalCase(str) {
  return str.split(/[-_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}

const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf-8"));
const videos = Array.isArray(catalog) ? catalog : catalog.videos || [];

let content = 'import "./index.css";\n';
content += 'import { Composition } from "remotion";\n';
content += 'import { AlphabetLongTemplate } from "./AlphabetLongTemplate";\n';
content += 'import type { AlphabetLongProps } from "./AlphabetLongTemplate";\n';
content += 'import React from "react";\n\n';
content += 'export const FlyingMachinesRoot: React.FC = () => {\n';
content += '  return (\n';
content += '    <>\n';

for (const video of videos) {
  const compId = toPascalCase(video.id);
  const items = video.items || video.letters || [];
  const letterDur = video.letterDuration || 3;
  const introDur = video.introDuration || 3;
  const outroDur = video.outroDuration || 3;
  const targetDur = video.targetDuration || 165;
  const totalFrames = Math.round(targetDur * FPS);

  content += '      <Composition\n';
  content += '        id="' + compId + '"\n';
  content += '        component={AlphabetLongTemplate}\n';
  content += '        durationInFrames={' + totalFrames + '}\n';
  content += '        fps={' + FPS + '}\n';
  content += '        width={1080}\n';
  content += '        height={1920}\n';
  content += '        defaultProps={{\n';
  content += '          title: ' + JSON.stringify(video.title) + ',\n';
  content += '          videoId: ' + JSON.stringify(video.id) + ',\n';
  content += '          bgGradient: ' + JSON.stringify(video.bgGradient) + ' as [string, string],\n';
  content += '          accentColor: ' + JSON.stringify(video.accentColor) + ',\n';
  content += '          letters: ' + JSON.stringify(items) + ',\n';
  content += '          letterDuration: ' + letterDur + ',\n';
  content += '          introDuration: ' + introDur + ',\n';
  content += '          outroDuration: ' + outroDur + ',\n';
  content += '          targetDuration: ' + targetDur + ',\n';
  content += '        }}\n';
  content += '      />\n';
}

content += '    </>\n';
content += '  );\n';
content += '};\n';

const outPath = path.join(SRC_DIR, "FlyingMachinesRoot.tsx");
fs.writeFileSync(outPath, content);
console.log("  Generated " + outPath + " (" + videos.length + " compositions)");
