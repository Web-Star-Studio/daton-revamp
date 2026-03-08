import { BranchForm } from "@/components/branch-form";
import { NewBranchModal } from "@/components/new-branch-modal";
import { getServerBranches } from "@/lib/server-api";

export default async function InterceptedNewBranchPage() {
  const branches = await getServerBranches();

  return (
    <NewBranchModal>
      <BranchForm branches={branches} />
    </NewBranchModal>
  );
}
