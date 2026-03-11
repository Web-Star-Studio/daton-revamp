import type { FastifyReply, FastifyRequest } from "fastify";

const bodyMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);

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

  const setCookie = headers.get("set-cookie");
  return setCookie ? [setCookie] : [];
};

const toRequestBody = (request: FastifyRequest) => {
  if (!bodyMethods.has(request.method) || request.body === undefined) {
    return undefined;
  }

  if (typeof request.body === "string" || request.body instanceof Blob) {
    return request.body;
  }

  if (Buffer.isBuffer(request.body) || request.body instanceof Uint8Array) {
    const bytes =
      request.body instanceof Uint8Array
        ? request.body
        : new Uint8Array(request.body);
    const normalizedBytes = new Uint8Array(bytes);

    return new Blob([normalizedBytes]);
  }

  return JSON.stringify(request.body);
};

const toHeaders = (request: FastifyRequest) => {
  const headers = new Headers();

  Object.entries(request.headers).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        headers.append(key, entry);
      });
      return;
    }

    headers.set(key, value);
  });

  return headers;
};

export const toWebRequest = (request: FastifyRequest) => {
  const host = request.headers.host ?? "127.0.0.1";
  const protocol =
    (request.headers["x-forwarded-proto"] as string | undefined)
      ?.split(",")[0]
      ?.trim() ?? "http";
  const url = new URL(request.url, `${protocol}://${host}`);

  return new Request(url, {
    method: request.method,
    headers: toHeaders(request),
    body: toRequestBody(request),
    duplex: "half",
  } as RequestInit & { duplex: "half" });
};

export const sendWebResponse = async (
  reply: FastifyReply,
  response: Response,
) => {
  reply.status(response.status);

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      return;
    }

    reply.header(key, value);
  });

  for (const setCookie of readSetCookies(response.headers)) {
    reply.header("set-cookie", setCookie);
  }

  const body = await response.arrayBuffer();
  return reply.send(Buffer.from(body));
};
