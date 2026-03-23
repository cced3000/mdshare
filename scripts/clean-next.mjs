import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const targetDir = path.join(cwd, ".next");
const isWindows = process.platform === "win32";

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runCmd(command, args) {
  return spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
}

function removeReadOnlyFlags(target) {
  if (!isWindows || !fs.existsSync(target)) return;
  runCmd("cmd", ["/c", "attrib", "-R", "/S", "/D", `${target}\\*`]);
}

function tryRemoveDir(target, attempts = 6) {
  for (let i = 1; i <= attempts; i++) {
    if (!fs.existsSync(target)) return true;

    removeReadOnlyFlags(target);

    try {
      fs.rmSync(target, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 200,
      });
    } catch (error) {
      console.warn(`warn: remove attempt ${i}/${attempts} failed (${error?.message ?? error})`);
    }

    if (!fs.existsSync(target)) return true;
    sleep(300 * i);
  }

  return !fs.existsSync(target);
}

function cleanupStaleDirs() {
  const entries = fs.readdirSync(cwd, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith(".next.stale-")) continue;

    const stalePath = path.join(cwd, entry.name);
    tryRemoveDir(stalePath, 2);
  }
}

function removeNextDir() {
  cleanupStaleDirs();

  if (!fs.existsSync(targetDir)) {
    console.log("skip: .next not found");
    return;
  }

  if (tryRemoveDir(targetDir)) {
    console.log("cleaned: .next");
    return;
  }

  if (!isWindows) {
    throw new Error("failed to remove .next directory");
  }

  const staleDir = `${targetDir}.stale-${Date.now()}`;
  try {
    fs.renameSync(targetDir, staleDir);
    console.warn(`warn: renamed locked .next to ${path.basename(staleDir)}`);
  } catch (error) {
    throw new Error(`failed to remove/rename .next (${error?.message ?? error})`);
  }

  const fallback = runCmd("cmd", ["/c", "rd", "/s", "/q", staleDir]);
  if (fallback.status !== 0 && fs.existsSync(staleDir)) {
    console.warn(`warn: stale build dir remains: ${staleDir}`);
  }

  console.log("cleaned: .next");
}

removeNextDir();
