import { NextResponse } from "next/server";

import {
  clearDatonSessionCookie,
  getDatonSessionFromCookieStore,
  revokeDatonSession,
} from "@/lib/auth-session";

export async function POST() {
  const payload = await getDatonSessionFromCookieStore();
  await revokeDatonSession(payload);

  const response = NextResponse.json({
    redirectTo: "/auth?mode=sign-in",
  });
  clearDatonSessionCookie(response);
  return response;
}
