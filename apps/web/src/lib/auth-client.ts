"use client";

import { createAuthClient } from "better-auth/react";

import { resolveBrowserApiBaseUrl } from "./config";

export const authClient = createAuthClient({
  baseURL: resolveBrowserApiBaseUrl(),
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include",
  },
});
