import { notFound } from "next/navigation";

import { BranchEditorModal } from "@/components/branch-editor-modal";
import {
  getServerBranch,
  getServerBranches,
  type ServerBranch,
} from "@/lib/server-api";

type BranchDetailPageProps = {
  params: Promise<{
    branchId: string;
  }>;
  searchParams: Promise<{
    edit?: string;
  }>;
};

export default async function BranchDetailPage({
  params,
  searchParams,
}: BranchDetailPageProps) {
  const [{ branchId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const [branch, branches] = await Promise.all([
    getServerBranch(branchId).catch(() => null),
    getServerBranches(),
  ]);

  if (!branch) {
    notFound();
  }

  const parentBranch = branches.find(
    (candidate: ServerBranch) => candidate.id === branch.parentBranchId,
  );
  const isEditOpen = resolvedSearchParams.edit === "1";

  return (
    <>
      <section className="workspace-section">
        <header className="workspace-intro">
          <h2>{branch.name}</h2>
          <p className="workspace-copy">
            Gerencie o cadastro central da unidade e acompanhe os pontos
            operacionais que já estão disponíveis neste payload.
          </p>
        </header>

        <div className="detail-grid">
          <article className="content-panel">
            <div className="section-heading">
              <h3>Localização e contato</h3>
            </div>
            <dl className="definition-list">
              <div>
                <dt>Logradouro</dt>
                <dd>Indisponível no payload atual</dd>
              </div>
              <div>
                <dt>Bairro / CEP</dt>
                <dd>Indisponível no payload atual</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>Indisponível no payload atual</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>Indisponível no payload atual</dd>
              </div>
            </dl>
          </article>

          <article className="content-panel">
            <div className="section-heading">
              <h3>Responsabilidade</h3>
            </div>
            <dl className="definition-list">
              <div>
                <dt>Natureza da unidade</dt>
                <dd>
                  {branch.isHeadquarters ? "Matriz" : "Filial operacional"}
                </dd>
              </div>
              <div>
                <dt>Filial pai</dt>
                <dd>{parentBranch?.name ?? "Sem filial pai"}</dd>
              </div>
              <div>
                <dt>Responsável gestor</dt>
                <dd>
                  {branch.managerMemberId ? "Vinculado" : "Não vinculado"}
                </dd>
              </div>
              <div>
                <dt>Status operacional</dt>
                <dd>{branch.status === "active" ? "Ativa" : "Arquivada"}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>
      <BranchEditorModal
        branch={branch}
        branches={branches}
        open={isEditOpen}
      />
    </>
  );
}
