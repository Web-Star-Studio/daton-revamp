import { BranchForm } from "@/components/branch-form";
import { getServerBranches } from "@/lib/server-api";

export default async function NewBranchPage() {
  const branches = await getServerBranches();

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
        <BranchForm branches={branches} />
      </article>
    </section>
  );
}
