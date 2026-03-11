const localApiBaseUrl = "http://127.0.0.1:3000";
const localInternalApiBaseUrl = "http://127.0.0.1:8787";
const loopbackHosts = new Set(["127.0.0.1", "localhost"]);
const localAppBaseUrl = "http://127.0.0.1:3000";

const readConfiguredEnv = (env: NodeJS.ProcessEnv, key: string) => {
  const value = env[key]?.trim();
  return value ? value : undefined;
};

const ensureHttpProtocol = (value: string) =>
  /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value) ? value : `http://${value}`;

export const resolveApiBaseUrlFromEnv = (env: NodeJS.ProcessEnv) =>
  readConfiguredEnv(env, "NEXT_PUBLIC_API_URL") ?? localApiBaseUrl;

export const resolveAppBaseUrlFromEnv = (env: NodeJS.ProcessEnv) =>
  readConfiguredEnv(env, "NEXT_PUBLIC_APP_URL") ?? localAppBaseUrl;

export const resolveInternalApiBaseUrlFromEnv = (env: NodeJS.ProcessEnv) => {
  const configuredInternalUrl = readConfiguredEnv(env, "INTERNAL_API_URL");

  if (configuredInternalUrl) {
    return configuredInternalUrl;
  }

  const renderHostPort = readConfiguredEnv(env, "INTERNAL_API_HOSTPORT");

  if (renderHostPort) {
    return ensureHttpProtocol(renderHostPort);
  }

  const publicApiUrl = readConfiguredEnv(env, "NEXT_PUBLIC_API_URL");

  if (env.NODE_ENV === "production" && publicApiUrl) {
    return publicApiUrl;
  }

  return localInternalApiBaseUrl;
};

export const appConfig = {
  apiBaseUrl: resolveApiBaseUrlFromEnv(process.env),
  internalApiBaseUrl: resolveInternalApiBaseUrlFromEnv(process.env),
  appBaseUrl: resolveAppBaseUrlFromEnv(process.env),
};

export const resolvePublicApiBaseUrl = () => {
  const configuredUrl = new URL(appConfig.apiBaseUrl);

  if (
    typeof window === "undefined" ||
    !loopbackHosts.has(window.location.hostname)
  ) {
    return configuredUrl.toString();
  }

  if (!loopbackHosts.has(configuredUrl.hostname)) {
    return configuredUrl.toString();
  }

  configuredUrl.hostname = window.location.hostname;
  return configuredUrl.toString();
};

export const resolveBrowserApiBaseUrl = () =>
  typeof window === "undefined" ? appConfig.appBaseUrl : window.location.origin;

export const toApiUrl = (path: string) =>
  new URL(path, resolveBrowserApiBaseUrl()).toString();
export const toInternalApiUrl = (path: string) =>
  new URL(path, appConfig.internalApiBaseUrl).toString();
