import { CollaboratorsWorkspace } from "@/components/collaborators-workspace";
import { getServerBranches, getServerOrganizationMembers } from "@/lib/server-api";

export default async function SocialCollaboratorsPage() {
  const [branches, members] = await Promise.all([
    getServerBranches(),
    getServerOrganizationMembers(),
  ]);

  return <CollaboratorsWorkspace branches={branches} members={members} />;
}
