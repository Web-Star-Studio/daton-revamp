import { proxyApiRequest } from "@/lib/api-proxy";

const proxy = (request: Request) => proxyApiRequest(request);

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
