import { CollaboratorDetailPage } from "@/components/collaborator-detail-page";
import {
  getServerBranches,
  getServerOrganizationMembers,
  type ServerOrganizationMember,
} from "@/lib/server-api";

type CollaboratorDetailRouteProps = {
  params: Promise<{
    collaboratorId: string;
  }>;
};

export default async function CollaboratorDetailRoute({
  params,
}: CollaboratorDetailRouteProps) {
  const [{ collaboratorId }, branches, members] = await Promise.all([
    params,
    getServerBranches(),
    getServerOrganizationMembers(),
  ]);
  const collaborator =
    members.find(
      (member: ServerOrganizationMember) => member.id === collaboratorId,
    ) ?? null;

  return (
    <CollaboratorDetailPage
      branches={branches}
      collaborator={collaborator}
    />
  );
}
