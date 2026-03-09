import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const cwd = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);

const run = (command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: process.env,
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

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

const getPnpmCommand = () =>
  process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const pnpmCommand = getPnpmCommand();

const gitRelease =
  runCapture("git", ["rev-parse", "HEAD"]) ??
  runCapture(pnpmCommand, [
    "exec",
    "sentry-cli",
    "releases",
    "propose-version",
  ]);

if (gitRelease && !process.env.SENTRY_RELEASE) {
  process.env.SENTRY_RELEASE = gitRelease;
}

const hasUploadConfiguration =
  Boolean(process.env.SENTRY_AUTH_TOKEN) &&
  Boolean(process.env.SENTRY_ORG) &&
  Boolean(process.env.SENTRY_PROJECT) &&
  Boolean(process.env.SENTRY_RELEASE);

const sentryArgs = [
  "--org",
  process.env.SENTRY_ORG,
  "--project",
  process.env.SENTRY_PROJECT,
];

const ensureReleaseExists = () => {
  const result = spawnSync(
    pnpmCommand,
    [
      "exec",
      "sentry-cli",
      "releases",
      ...sentryArgs,
      "new",
      process.env.SENTRY_RELEASE,
    ],
    {
      cwd,
      env: process.env,
      stdio: "pipe",
      encoding: "utf8",
    },
  );

  if (
    result.status !== 0 &&
    !`${result.stdout}${result.stderr}`.toLowerCase().includes("already exists")
  ) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    process.exit(result.status ?? 1);
  }
};

if (hasUploadConfiguration) {
  const outdir = mkdtempSync(path.join(tmpdir(), "daton-api-sentry-"));

  try {
    run(pnpmCommand, [
      "exec",
      "wrangler",
      "deploy",
      "--dry-run",
      "--outdir",
      outdir,
      ...args,
    ]);

    ensureReleaseExists();

    run(pnpmCommand, [
      "exec",
      "sentry-cli",
      "sourcemaps",
      "inject",
      "--release",
      process.env.SENTRY_RELEASE,
      outdir,
    ]);

    run(pnpmCommand, [
      "exec",
      "sentry-cli",
      "sourcemaps",
      "upload",
      ...sentryArgs,
      "--release",
      process.env.SENTRY_RELEASE,
      "--validate",
      "--wait",
      outdir,
    ]);

    run(pnpmCommand, [
      "exec",
      "sentry-cli",
      "releases",
      ...sentryArgs,
      "finalize",
      process.env.SENTRY_RELEASE,
    ]);
  } finally {
    rmSync(outdir, { force: true, recursive: true });
  }
}

run(pnpmCommand, ["exec", "wrangler", "deploy", ...args]);
