import { AuthRedirect } from "@/components/auth-redirect";
import { CollaboratorDetailPage } from "@/components/collaborator-detail-page";
import {
  getServerBranches,
  getServerDepartments,
  getServerEmployee,
  getServerEmployees,
  getServerPositions,
  ServerApiError,
} from "@/lib/server-api";
import { requireSession } from "@/lib/session";

type CollaboratorDetailRouteProps = {
  params: Promise<{
    collaboratorId: string;
  }>;
  searchParams: Promise<{
    edit?: string;
  }>;
};

export default async function CollaboratorDetailRoute({
  params,
  searchParams,
}: CollaboratorDetailRouteProps) {
  const [resolvedParams, resolvedSearchParams, session] = await Promise.all([
    params,
    searchParams,
    requireSession(),
  ]);

  if (!session) {
    return <AuthRedirect href="/auth?mode=sign-in" />;
  }

  if (!session.organization) {
    return <AuthRedirect href="/auth?mode=sign-up" />;
  }

  const canManagePeople = session.effectiveRoles.some(
    (role) => role === "owner" || role === "admin" || role === "hr_admin",
  );
  const isEditing = canManagePeople && resolvedSearchParams.edit === "1";
  const [collaborator, branches, departments, employees, positions] = await Promise.all([
    getServerEmployee(resolvedParams.collaboratorId).catch((error) => {
      if (error instanceof ServerApiError && error.status === 404) {
        return null;
      }

      throw error;
    }),
    isEditing ? getServerBranches() : Promise.resolve([]),
    isEditing ? getServerDepartments() : Promise.resolve([]),
    isEditing ? getServerEmployees() : Promise.resolve([]),
    isEditing ? getServerPositions() : Promise.resolve([]),
  ]);

  return (
    <CollaboratorDetailPage
      branches={branches}
      canManagePeople={canManagePeople}
      collaborator={collaborator}
      departments={departments}
      employees={employees}
      isEditing={isEditing}
      positions={positions}
    />
  );
}
