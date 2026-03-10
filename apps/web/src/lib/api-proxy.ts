import { toInternalApiUrl } from "./config";

const hopByHopHeaders = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
]);

const bodyMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);

const copyHeaders = (source: Headers, options?: { includeSetCookie?: boolean }) => {
  const target = new Headers();

  for (const [name, value] of source.entries()) {
    const normalizedName = name.toLowerCase();

    if (hopByHopHeaders.has(normalizedName)) {
      continue;
    }

    if (!options?.includeSetCookie && normalizedName === "set-cookie") {
      continue;
    }

    target.set(name, value);
  }

  return target;
};

const readSetCookies = (headers: Headers) => {
  const getSetCookie = (
    headers as Headers & {
      getSetCookie?: () => string[];
      getAll?: (name: string) => string[];
    }
  ).getSetCookie;

  if (typeof getSetCookie === "function") {
    return getSetCookie.call(headers);
  }

  const getAll = (
    headers as Headers & {
      getSetCookie?: () => string[];
      getAll?: (name: string) => string[];
    }
  ).getAll;

  if (typeof getAll === "function") {
    return getAll.call(headers, "set-cookie");
  }

  const headerValue = headers.get("set-cookie");
  return headerValue ? [headerValue] : [];
};

export async function proxyApiRequest(request: Request) {
  const upstreamUrl = toInternalApiUrl(`${new URL(request.url).pathname}${new URL(request.url).search}`);
  const upstreamHeaders = copyHeaders(request.headers);
  const requestBody =
    bodyMethods.has(request.method) && request.body ? await request.arrayBuffer() : undefined;

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: requestBody,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return Response.json(
      {
        message: "Não foi possível contatar a API agora.",
      },
      { status: 502 },
    );
  }

  const responseHeaders = copyHeaders(upstreamResponse.headers, {
    includeSetCookie: false,
  });

  for (const setCookie of readSetCookies(upstreamResponse.headers)) {
    responseHeaders.append("set-cookie", setCookie);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
