import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const serverFunctionsDir = path.join(rootDir, ".open-next", "server-functions");

const replacements = [
  {
    pattern: /__require\.resolve\("\.\/cache\.cjs"\)/g,
    replacement: 'new URL("./cache.cjs", import.meta.url).pathname',
  },
  {
    pattern: /__require\.resolve\("\.\/composable-cache\.cjs"\)/g,
    replacement: 'new URL("./composable-cache.cjs", import.meta.url).pathname',
  },
  {
    pattern: /replaceAll\("\/","\/"\),dir\.endsWith\("\.next\/server"\)/g,
    replacement:
      'replaceAll("\\\\","/").replaceAll("/","/"),dir.endsWith(".next/server")',
  },
];

function patchFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  let patched = original;

  for (const { pattern, replacement } of replacements) {
    patched = patched.replace(pattern, replacement);
  }

  if (patched !== original) {
    fs.writeFileSync(filePath, patched);
    return true;
  }

  return false;
}

function main() {
  if (!fs.existsSync(serverFunctionsDir)) {
    console.log("skip: .open-next/server-functions not found");
    return;
  }

  const targets = [];

  for (const entry of fs.readdirSync(serverFunctionsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const functionDir = path.join(serverFunctionsDir, entry.name);
    const directIndex = path.join(functionDir, "index.mjs");
    if (fs.existsSync(directIndex)) {
      targets.push(directIndex);
    }

    const nestedDirs = fs.readdirSync(functionDir, { withFileTypes: true });
    for (const nested of nestedDirs) {
      if (!nested.isDirectory()) {
        continue;
      }

      const nestedIndex = path.join(functionDir, nested.name, "index.mjs");
      if (fs.existsSync(nestedIndex)) {
        targets.push(nestedIndex);
      }
    }
  }

  const patchedFiles = targets.filter(patchFile);
  console.log(`patched ${patchedFiles.length} OpenNext server bundle file(s)`);
}

main();
