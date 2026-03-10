/// <reference types="node" />

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "localhost"]);

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRootEnvPath = resolve(currentDir, "../../../.env");

const normalizeQuotedEnvValue = (rawValue: string) => {
  const value = rawValue.trim();
  const quote = value[0];

  if (
    value.length < 2 ||
    (quote !== "\"" && quote !== "'") ||
    value.at(-1) !== quote
  ) {
    return value;
  }

  const escapedQuotePattern = new RegExp(`\\\\${quote}`, "g");
  return value
    .slice(1, -1)
    .replace(escapedQuotePattern, quote)
    .replace(/\\\\/g, "\\");
};

const parseEnvFile = (envFileContents: string) => {
  const parsed: Record<string, string> = {};

  for (const line of envFileContents.split(/\r?\n/u)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1);

    if (!key) {
      continue;
    }

    parsed[key] = normalizeQuotedEnvValue(value);
  }

  return parsed;
};

const isLocalDatabaseUrl = (value: string) => {
  try {
    const hostname = new URL(value).hostname;
    return LOCAL_DATABASE_HOSTS.has(hostname);
  } catch {
    return false;
  }
};

export const loadLocalDevelopmentEnv = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const resolvedEnvironment: NodeJS.ProcessEnv = {
    ...environment,
  };

  const hasExplicitDatabaseUrl = Boolean(environment.DATABASE_URL);

  if (!existsSync(repoRootEnvPath)) {
    return resolvedEnvironment;
  }

  const rootEnv = parseEnvFile(readFileSync(repoRootEnvPath, "utf8"));

  for (const [key, value] of Object.entries(rootEnv)) {
    if (resolvedEnvironment[key] === undefined) {
      resolvedEnvironment[key] = value;
    }
  }

  if (
    !hasExplicitDatabaseUrl
    && resolvedEnvironment.DATABASE_URL
    && !isLocalDatabaseUrl(resolvedEnvironment.DATABASE_URL)
  ) {
    throw new Error(
      [
        "Local development must default to a local Postgres DATABASE_URL.",
        "Update the repo root .env to 127.0.0.1/localhost or pass DATABASE_URL explicitly for a one-off remote target.",
      ].join(" "),
    );
  }

  return resolvedEnvironment;
};
