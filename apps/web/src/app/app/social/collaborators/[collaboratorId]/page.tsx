import { CollaboratorDetailPage } from "@/components/collaborator-detail-page";
import { createInitialCollaborators } from "@/lib/collaborators";
import { getServerBranches } from "@/lib/server-api";

type CollaboratorDetailRouteProps = {
  params: Promise<{
    collaboratorId: string;
  }>;
};

export default async function CollaboratorDetailRoute({
  params,
}: CollaboratorDetailRouteProps) {
  const [{ collaboratorId }, branches] = await Promise.all([
    params,
    getServerBranches(),
  ]);
  const initialCollaborator =
    createInitialCollaborators(branches).find(
      (collaborator) => collaborator.id === collaboratorId,
    ) ?? null;

  return (
    <CollaboratorDetailPage
      branches={branches}
      collaboratorId={collaboratorId}
      initialCollaborator={initialCollaborator}
    />
  );
}
