import Link from "next/link";
import { notFound } from "next/navigation";

import { formatCnpj } from "@daton/contracts";
import { BranchForm } from "@/components/branch-form";
import { getServerBranch, getServerBranches } from "@/lib/server-api";
import { formatBranchStatus } from "@/lib/utils";

type BranchDetailPageProps = {
  params: Promise<{
    branchId: string;
  }>;
};

export default async function BranchDetailPage({ params }: BranchDetailPageProps) {
  const { branchId } = await params;
  const [branch, branches] = await Promise.all([
    getServerBranch(branchId).catch(() => null),
    getServerBranches(),
  ]);

  if (!branch) {
    notFound();
  }

  return (
    <section className="workspace-section">
      <header className="workspace-hero">
        <div className="workspace-hero__lead">
          <p className="eyebrow">Detalhe da filial</p>
          <h2>{branch.name}</h2>
          <p className="workspace-copy">Revise os dados desta unidade e atualize apenas o que precisa mudar.</p>
        </div>
        <aside className="workspace-hero__panel">
          <p className="workspace-kicker">Status</p>
          <strong>{branch.isHeadquarters ? "Matriz" : "Filial operacional"}</strong>
          <span>{formatBranchStatus(branch.status)}</span>
          <span>Código {branch.code}</span>
          <Link className="button button--ghost" href="/app/branches">
            Voltar para filiais
          </Link>
        </aside>
      </header>

      <div className="split-panel">
        <article className="content-panel">
          <p className="eyebrow">Registro atual</p>
          <dl className="definition-list">
            <div>
              <dt>Código</dt>
              <dd>{branch.code}</dd>
            </div>
            <div>
              <dt>CNPJ</dt>
              <dd>{formatCnpj(branch.legalIdentifier)}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{branch.isHeadquarters ? "Matriz" : "Filial operacional"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{formatBranchStatus(branch.status)}</dd>
            </div>
          </dl>
        </article>
        <article className="content-panel">
          <p className="eyebrow">Editar</p>
          <BranchForm branch={branch} branches={branches} />
        </article>
      </div>
    </section>
  );
}
