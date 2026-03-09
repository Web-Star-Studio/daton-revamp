import { BranchForm } from "@/components/branch-form";
import {
  getServerBranches,
  getServerOrganizationMembers,
} from "@/lib/server-api";

export default async function NewBranchPage() {
  const [branches, members] = await Promise.all([
    getServerBranches(),
    getServerOrganizationMembers(),
  ]);

  return (
    <section className="workspace-section">
      <header className="workspace-intro">
        <h2>Criar filial</h2>
        <p className="workspace-copy">
          Preencha os dados essenciais para adicionar uma nova unidade à
          organização.
        </p>
      </header>
      <article className="content-panel">
        <BranchForm branches={branches} members={members} />
      </article>
    </section>
  );
}
