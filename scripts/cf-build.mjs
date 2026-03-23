import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const isWindows = process.platform === "win32";
const isLinux = process.platform === "linux";
const require = createRequire(import.meta.url);

const noisyNpmConfigKeys = new Set([
  "npm_config_only_built_dependencies",
  "npm_config_pnpm_prefix",
  "npm_config_verify_deps_before_run",
  "npm_config__jsr_registry",
]);

function createCommandEnv() {
  const env = {
    ...process.env,
    CI: process.env.CI ?? "1",
  };

  for (const key of Object.keys(env)) {
    if (noisyNpmConfigKeys.has(key.toLowerCase())) {
      delete env[key];
    }
  }

  return env;
}

const commandEnv = createCommandEnv();

function run(command, args, name) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: isWindows,
    env: commandEnv,
  });

  if (result.status !== 0) {
    throw new Error(`${name} failed with exit code ${result.status ?? "unknown"}`);
  }
}

function ensureLinuxNativeBindings() {
  if (!isLinux) return;

  try {
    require.resolve("@ast-grep/napi-linux-x64-gnu");
  } catch {
    throw new Error(
      [
        "Missing linux native package: @ast-grep/napi-linux-x64-gnu.",
        "You are likely using node_modules installed from another OS (e.g. Windows).",
        "Fix in WSL:",
        "  rm -rf node_modules",
        "  pnpm install --force",
        "  pnpm run cf:build",
      ].join("\n"),
    );
  }
}

function buildOnce(attempt, total) {
  console.log(`\n[cf:build] OpenNext build attempt ${attempt}/${total}...`);
  const result = spawnSync("opennextjs-cloudflare", ["build"], {
    stdio: "inherit",
    shell: isWindows,
    env: commandEnv,
  });

  return result.status === 0;
}

function cleanBuildArtifacts() {
  run("node", ["scripts/clean-next.mjs"], "clean-next");
  run("node", ["scripts/clean-opennext.mjs"], "clean-opennext");
}

function main() {
  ensureLinuxNativeBindings();

  const maxAttempts = 2;

  cleanBuildArtifacts();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ok = buildOnce(attempt, maxAttempts);
    if (ok) {
      run("node", ["scripts/patch_opennext_require_resolve.mjs"], "patch-opennext-require-resolve");
      return;
    }

    if (attempt < maxAttempts) {
      console.warn("warn: build failed, cleaning .next/.open-next and retrying once...");
      cleanBuildArtifacts();
    }
  }

  throw new Error("OpenNext build failed after retry.");
}

main();
