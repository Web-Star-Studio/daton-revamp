import Link from "next/link";

import { getServerBranches } from "@/lib/server-api";
import { formatBranchStatus } from "@/lib/utils";

export default async function BranchesPage() {
  const branches = await getServerBranches();

  return (
    <section className="workspace-section">
      <header className="workspace-hero">
        <div className="workspace-hero__lead">
          <p className="eyebrow">Gestão de filiais</p>
          <h2>Filiais</h2>
          <p className="workspace-copy">Acompanhe a rede atual, o status de cada unidade e entre nos detalhes de edição.</p>
        </div>
        <aside className="workspace-hero__panel">
          <p className="workspace-kicker">Total</p>
          <strong>{branches.length.toString().padStart(2, "0")} filiais</strong>
          <span>Uma visão simples da estrutura operacional cadastrada.</span>
          <Link className="button" href="/app/branches/new">
            Criar filial
          </Link>
        </aside>
      </header>

      <article className="content-panel">
        <ul className="ruled-list ruled-list--three-column">
          {branches.map((branch: (typeof branches)[number]) => (
            <li key={branch.id}>
              <Link href={`/app/branches/${branch.id}`}>
                <span>{branch.name}</span>
                <span>{branch.isHeadquarters ? "Matriz" : "Filial"}</span>
                <span>{formatBranchStatus(branch.status)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
