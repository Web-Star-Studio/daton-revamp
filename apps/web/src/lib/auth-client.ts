"use client";

import { createAuthClient } from "better-auth/react";

import { resolvePublicApiBaseUrl } from "./config";

export const authClient = createAuthClient({
  baseURL: resolvePublicApiBaseUrl(),
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include",
  },
});
