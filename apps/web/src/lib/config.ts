const localApiBaseUrl = "http://127.0.0.1:8787";
const localInternalApiBaseUrl = "http://127.0.0.1:8787";
const loopbackHosts = new Set(["127.0.0.1", "localhost"]);

export const appConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? localApiBaseUrl,
  internalApiBaseUrl: process.env.INTERNAL_API_URL ?? localInternalApiBaseUrl,
  appBaseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000",
};

export const resolvePublicApiBaseUrl = () => {
  const configuredUrl = new URL(appConfig.apiBaseUrl);

  if (typeof window === "undefined" || !loopbackHosts.has(window.location.hostname)) {
    return configuredUrl.toString();
  }

  if (!loopbackHosts.has(configuredUrl.hostname)) {
    return configuredUrl.toString();
  }

  configuredUrl.hostname = window.location.hostname;
  return configuredUrl.toString();
};

export const toApiUrl = (path: string) => new URL(path, resolvePublicApiBaseUrl()).toString();
export const toInternalApiUrl = (path: string) =>
  new URL(path, appConfig.internalApiBaseUrl).toString();
