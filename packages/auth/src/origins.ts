const loopbackHosts = new Set(["127.0.0.1", "localhost"]);

export const expandLocalOriginAliases = (origins: string[]) =>
  Array.from(
    new Set(
      origins.flatMap((origin) => {
        try {
          const url = new URL(origin);
          const normalizedOrigin = url.origin;

          if (!loopbackHosts.has(url.hostname)) {
            return [normalizedOrigin];
          }

          const alternate = new URL(origin);
          alternate.hostname = url.hostname === "127.0.0.1" ? "localhost" : "127.0.0.1";

          return [normalizedOrigin, alternate.origin];
        } catch {
          return [origin];
        }
      }),
    ),
  );
