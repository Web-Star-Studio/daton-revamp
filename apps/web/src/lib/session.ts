import { getServerSession, type ServerSession } from "./server-api";

export async function requireSession(): Promise<ServerSession | null> {
  const session = await getServerSession();
  return session satisfies ServerSession | null;
}
