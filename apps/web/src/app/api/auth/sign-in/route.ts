import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createDatonSessionPayload,
  refreshWorkOsAuthentication,
} from "@daton/auth";

import {
  authenticateBrowserPassword,
  fetchSessionContext,
  getWorkOsManagementEnv,
  setDatonSessionCookie,
} from "@/lib/auth-session";

const signInInputSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const input = signInInputSchema.parse(await request.json());
    let authentication = await authenticateBrowserPassword(input, request.headers);
    const sessionContext = await fetchSessionContext(authentication.accessToken);

    if (
      sessionContext.workosOrganizationId &&
      authentication.organizationId !== sessionContext.workosOrganizationId
    ) {
      authentication = await refreshWorkOsAuthentication(getWorkOsManagementEnv(), {
        organizationId: sessionContext.workosOrganizationId,
        refreshToken: authentication.refreshToken,
      });
    }

    const response = NextResponse.json({
      redirectTo: sessionContext.session.organization ? "/app" : "/auth?mode=sign-up",
    });
    await setDatonSessionCookie(response, createDatonSessionPayload(authentication));

    return response;
  } catch (error) {
    const message =
      error instanceof Error &&
      (error.message.toLowerCase().includes("invalid") ||
        error.message.toLowerCase().includes("password"))
        ? "E-mail ou senha inválidos."
        : "Não foi possível entrar no ambiente agora.";

    return NextResponse.json(
      {
        message,
      },
      { status: message === "E-mail ou senha inválidos." ? 401 : 500 },
    );
  }
}
