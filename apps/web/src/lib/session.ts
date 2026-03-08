import { redirect } from "next/navigation";

import { getServerSession, type ServerSession } from "./server-api";

export async function requireSession() {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session satisfies ServerSession;
}
