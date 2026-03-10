import { NextResponse } from "next/server";

import {
  AuthSessionError,
  clearDatonSessionCookie,
  fetchServerSession,
  getDatonSessionFromCookieStore,
  refreshDatonSessionIfNeeded,
  setDatonSessionCookie,
} from "@/lib/auth-session";

export async function GET(request: Request) {
  const currentSession = await getDatonSessionFromCookieStore();
  const refreshedSession = await refreshDatonSessionIfNeeded(currentSession, request.headers);

  if (refreshedSession.error) {
    const response = NextResponse.json(
      {
        message: refreshedSession.error.message,
      },
      { status: refreshedSession.error.status },
    );

    if (currentSession && refreshedSession.error.clearSession) {
      clearDatonSessionCookie(response);
    }

    return response;
  }

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
  } catch (error) {
    const response = NextResponse.json(
      {
        message:
          error instanceof AuthSessionError ? error.message : "Não foi possível carregar a sessão agora.",
      },
      {
        status: error instanceof AuthSessionError ? error.status : 503,
      },
    );

    if (error instanceof AuthSessionError && error.clearSession) {
      clearDatonSessionCookie(response);
    }

    return response;
  }
}
