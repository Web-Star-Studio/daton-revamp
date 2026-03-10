import { AuthRedirect } from "@/components/auth-redirect";
import { CollaboratorsWorkspace } from "@/components/collaborators-workspace";
import {
  getServerBranches,
  getServerDepartments,
  getServerEmployees,
  getServerPositions,
} from "@/lib/server-api";
import { requireSession } from "@/lib/session";

type SocialCollaboratorsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SocialCollaboratorsPage({
  searchParams: _searchParams,
}: SocialCollaboratorsPageProps) {
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
  const [branches, employees, positions, departments] = await Promise.all([
    getServerBranches(),
    getServerEmployees(),
    getServerPositions(),
    canManagePeople ? getServerDepartments() : Promise.resolve([]),
  ]);

  return (
    <CollaboratorsWorkspace
      branches={branches}
      canManagePeople={canManagePeople}
      departments={departments}
      employees={employees}
      positions={positions}
    />
  );
}
