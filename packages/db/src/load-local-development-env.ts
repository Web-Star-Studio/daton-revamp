/// <reference types="node" />

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

export const loadLocalDevelopmentEnv = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const resolvedEnvironment: NodeJS.ProcessEnv = {
    ...environment,
  };

  if (!existsSync(repoRootEnvPath)) {
    return resolvedEnvironment;
  }

  const rootEnv = parseEnvFile(readFileSync(repoRootEnvPath, "utf8"));

  for (const [key, value] of Object.entries(rootEnv)) {
    if (resolvedEnvironment[key] === undefined) {
      resolvedEnvironment[key] = value;
    }
  }

  return resolvedEnvironment;
};
