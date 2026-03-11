import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
const upstreamTimeoutMs = 10_000;

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
  const parsedUrl = new URL(request.url);
  const upstreamUrl = toInternalApiUrl(`${parsedUrl.pathname}${parsedUrl.search}`);
  const upstreamHeaders = copyHeaders(request.headers);
  const { getToken } = await auth();
  const sessionToken = await getToken();
  const clientIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers
      .get("x-forwarded-for")
      ?.split(",")
      .map((value) => value.trim())
      .find(Boolean) ??
    null;

  upstreamHeaders.delete("cookie");

  if (sessionToken) {
    upstreamHeaders.set("authorization", `Bearer ${sessionToken}`);
  } else {
    upstreamHeaders.delete("authorization");
  }

  if (clientIp) {
    const existingForwardedFor = upstreamHeaders.get("x-forwarded-for");
    upstreamHeaders.set(
      "x-forwarded-for",
      existingForwardedFor ? `${existingForwardedFor}, ${clientIp}` : clientIp,
    );
    upstreamHeaders.set("x-real-ip", clientIp);
  }

  const requestBody =
    bodyMethods.has(request.method) && request.body ? await request.arrayBuffer() : undefined;

  let upstreamResponse: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, upstreamTimeoutMs);

  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: requestBody,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return Response.json(
        {
          message: "A API demorou demais para responder.",
        },
        { status: 504 },
      );
    }

    return Response.json(
      {
        message: "Não foi possível contatar a API agora.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const responseHeaders = copyHeaders(upstreamResponse.headers, {
    includeSetCookie: false,
  });

  for (const setCookie of readSetCookies(upstreamResponse.headers)) {
    responseHeaders.append("set-cookie", setCookie);
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
