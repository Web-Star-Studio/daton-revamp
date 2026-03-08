import { CollaboratorsWorkspace } from "@/components/collaborators-workspace";
import { getServerBranches } from "@/lib/server-api";

export default async function SocialCollaboratorsPage() {
  const branches = await getServerBranches();

  return <CollaboratorsWorkspace branches={branches} />;
}
