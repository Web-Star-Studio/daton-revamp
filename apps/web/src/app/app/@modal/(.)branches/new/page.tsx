import { BranchForm } from "@/components/branch-form";
import { NewBranchModal } from "@/components/new-branch-modal";
import {
  getServerBranches,
  getServerOrganizationMembers,
} from "@/lib/server-api";

export default async function InterceptedNewBranchPage() {
  const [branches, members] = await Promise.all([
    getServerBranches(),
    getServerOrganizationMembers(),
  ]);

  return (
    <NewBranchModal>
      <BranchForm branches={branches} members={members} />
    </NewBranchModal>
  );
}
