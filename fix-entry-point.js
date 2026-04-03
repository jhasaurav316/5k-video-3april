#!/usr/bin/env node
// Auto-fix index.ts to include registerRoot() if missing
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "src");
const indexPath = path.join(srcDir, "index.ts");

// Check if already has registerRoot
const current = fs.readFileSync(indexPath, "utf-8");
if (current.includes("registerRoot")) {
  console.log("    OK: registerRoot found");
  process.exit(0);
}

console.log("    FIXING: index.ts missing registerRoot - regenerating...");

const files = fs.readdirSync(srcDir).filter(f => f.endsWith("Root.tsx")).sort();
const imports = [];
const elements = [];

for (const f of files) {
  const name = f.replace(".tsx", "");
  imports.push('import { ' + name + ' } from "./' + name + '";');
  elements.push("    React.createElement(" + name + "),");
}

const code = [
  'import { registerRoot } from "remotion";',
  'import React from "react";',
  'import "./index.css";',
  "",
  ...imports,
  "",
  "const CombinedRoot: React.FC = () => {",
  "  return React.createElement(React.Fragment, null,",
  ...elements,
  "  );",
  "};",
  "",
  "registerRoot(CombinedRoot);",
  "",
].join("\n");

fs.writeFileSync(indexPath, code);
console.log("    Fixed! registerRoot added with " + files.length + " Root components");
