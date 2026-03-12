import { AuthRedirect } from "@/components/auth-redirect";
import { CollaboratorsWorkspace } from "@/components/collaborators-workspace";
import { getServerCollaboratorsWorkspace } from "@/lib/server-api";
import { requireSession } from "@/lib/session";

export default async function SocialCollaboratorsPage() {
  const session = await requireSession();

  if (!session) {
    return <AuthRedirect href="/auth?mode=sign-in" />;
  }

  if (!session.organization) {
    return <AuthRedirect href="/auth?mode=sign-up" />;
  }

  const canManagePeople = session.effectiveRoles.some(
    (role) => role === "owner" || role === "admin" || role === "hr_admin",
  );
  const workspace = await getServerCollaboratorsWorkspace(
    canManagePeople ? ["departments"] : [],
  );

  return (
    <CollaboratorsWorkspace
      branches={workspace.branches}
      canManagePeople={canManagePeople}
      departments={workspace.departments}
      employees={workspace.employees}
      positions={workspace.positions}
    />
  );
}
