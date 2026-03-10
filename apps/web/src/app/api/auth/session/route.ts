import { NextResponse } from "next/server";

import {
  clearDatonSessionCookie,
  fetchServerSession,
  getDatonSessionFromCookieStore,
  refreshDatonSessionIfNeeded,
  setDatonSessionCookie,
} from "@/lib/auth-session";

export async function GET(request: Request) {
  const currentSession = await getDatonSessionFromCookieStore();
  const refreshedSession = await refreshDatonSessionIfNeeded(currentSession, request.headers);

  if (!refreshedSession.payload) {
    const response = NextResponse.json(
      {
        message: "Autenticação obrigatória.",
      },
      { status: 401 },
    );

    if (currentSession) {
      clearDatonSessionCookie(response);
    }

    return response;
  }

  try {
    const session = await fetchServerSession(refreshedSession.payload.accessToken);
    const response = NextResponse.json(session);

    if (refreshedSession.rotated) {
      await setDatonSessionCookie(response, refreshedSession.payload);
    }

    return response;
  } catch {
    const response = NextResponse.json(
      {
        message: "Autenticação obrigatória.",
      },
      { status: 401 },
    );
    clearDatonSessionCookie(response);
    return response;
  }
}
