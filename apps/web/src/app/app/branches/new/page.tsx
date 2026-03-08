import { BranchForm } from "@/components/branch-form";
import { getServerBranches } from "@/lib/server-api";

export default async function NewBranchPage() {
  const branches = await getServerBranches();

  return (
    <section className="workspace-section">
      <header className="workspace-hero">
        <div className="workspace-hero__lead">
          <p className="eyebrow">Nova filial</p>
          <h2>Criar filial</h2>
          <p className="workspace-copy">Preencha os dados essenciais para adicionar uma nova unidade à organização.</p>
        </div>
        <aside className="workspace-hero__panel">
          <p className="workspace-kicker">Rede atual</p>
          <strong>{branches.length.toString().padStart(2, "0")} referências ativas</strong>
          <span>Use as unidades existentes para definir vínculos hierárquicos quando necessário.</span>
        </aside>
      </header>
      <article className="content-panel">
        <BranchForm branches={branches} />
      </article>
    </section>
  );
}
