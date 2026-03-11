import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveApiBaseUrlFromEnv,
  resolveAppBaseUrlFromEnv,
  resolveInternalApiBaseUrlFromEnv,
} from "./config";

const asEnv = (env: Record<string, string | undefined>) =>
  env as NodeJS.ProcessEnv;

test("resolveApiBaseUrlFromEnv keeps the configured public API URL", () => {
  assert.equal(
    resolveApiBaseUrlFromEnv(
      asEnv({
        NEXT_PUBLIC_API_URL: "https://api.daton.example",
      }),
    ),
    "https://api.daton.example",
  );
});

test("resolveAppBaseUrlFromEnv falls back to local development URL", () => {
  assert.equal(resolveAppBaseUrlFromEnv(asEnv({})), "http://127.0.0.1:3000");
});

test("resolveInternalApiBaseUrlFromEnv prefers the explicit internal URL", () => {
  assert.equal(
    resolveInternalApiBaseUrlFromEnv(
      asEnv({
        INTERNAL_API_URL: "https://internal.daton.example",
        INTERNAL_API_HOSTPORT: "daton-backend:10000",
        NEXT_PUBLIC_API_URL: "https://daton-api.onrender.com",
        NODE_ENV: "production",
      }),
    ),
    "https://internal.daton.example",
  );
});

test("resolveInternalApiBaseUrlFromEnv builds a Render hostport URL when needed", () => {
  assert.equal(
    resolveInternalApiBaseUrlFromEnv(
      asEnv({
        INTERNAL_API_HOSTPORT: "daton-backend:10000",
        NODE_ENV: "production",
      }),
    ),
    "http://daton-backend:10000",
  );
});

test("resolveInternalApiBaseUrlFromEnv falls back to the public API in production", () => {
  assert.equal(
    resolveInternalApiBaseUrlFromEnv(
      asEnv({
        NEXT_PUBLIC_API_URL: "https://daton-api.onrender.com",
        NODE_ENV: "production",
      }),
    ),
    "https://daton-api.onrender.com",
  );
});

test("resolveInternalApiBaseUrlFromEnv keeps localhost only for development defaults", () => {
  assert.equal(
    resolveInternalApiBaseUrlFromEnv(
      asEnv({
        NODE_ENV: "development",
      }),
    ),
    "http://127.0.0.1:8787",
  );
});
