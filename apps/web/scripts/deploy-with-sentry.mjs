import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { requireEnv } from "../../../scripts/require-env.mjs";

const cwd = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(cwd, "..", "..");
const rawArgs = process.argv.slice(2);
const cliArgs = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;

const normalizeConfigArgs = (args) => {
  const normalizedArgs = [...args];

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const current = normalizedArgs[index];

    if ((current === "--config" || current === "-c") && normalizedArgs[index + 1]) {
      const candidate = normalizedArgs[index + 1];
      const localPath = path.resolve(cwd, candidate);
      const repoPath = path.resolve(repoRoot, candidate);

      if (!existsSync(localPath) && existsSync(repoPath)) {
        normalizedArgs[index + 1] = repoPath;
      }
    }
  }

  return normalizedArgs;
};

const args = normalizeConfigArgs(cliArgs);

const getPnpmCommand = () =>
  process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const pnpmCommand = getPnpmCommand();

const runCapture = (command, commandArgs) => {
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: process.env,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
};

const run = (command, commandArgs) => {
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

if (!process.env.SENTRY_RELEASE) {
  const release =
    runCapture("git", ["rev-parse", "HEAD"]) ??
    runCapture(pnpmCommand, [
      "exec",
      "sentry-cli",
      "releases",
      "propose-version",
    ]);

  if (release) {
    process.env.SENTRY_RELEASE = release;
  }
}

requireEnv("NEXT_PUBLIC_APP_URL", "deploy:web");
requireEnv("NEXT_PUBLIC_API_URL", "deploy:web");
requireEnv("INTERNAL_API_URL", "deploy:web");

run(pnpmCommand, ["exec", "opennextjs-cloudflare", "build"]);
run(pnpmCommand, ["exec", "opennextjs-cloudflare", "deploy", ...args]);
