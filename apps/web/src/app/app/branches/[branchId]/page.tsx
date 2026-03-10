import { notFound } from "next/navigation";

import { BranchEditorModal } from "@/components/branch-editor-modal";
import {
  getServerBranch,
  getServerBranches,
  getServerOrganizationMembers,
  type ServerBranch,
  type ServerOrganizationMember,
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
  const [branch, branches, members] = await Promise.all([
    getServerBranch(branchId).catch(() => null),
    getServerBranches(),
    getServerOrganizationMembers(),
  ]);

  if (!branch) {
    notFound();
  }

  const parentBranch = branches.find(
    (candidate: ServerBranch) => candidate.id === branch.parentBranchId,
  );
  const manager =
    members.find(
      (member: ServerOrganizationMember) => member.id === branch.managerMemberId,
    ) ?? null;
  const isEditOpen = resolvedSearchParams.edit === "1";

  return (
    <>
      <section className="workspace-section branch-detail-page">
        <header className="workspace-intro">
          <h2>{branch.name}</h2>
        </header>

        <div className="detail-grid">
          <article className="content-panel">
            <div className="section-heading">
              <h3>Localização e contato</h3>
            </div>
            <dl className="definition-list">
              <div>
                <dt>Logradouro</dt>
                <dd>{branch.addressLine1 ?? "Não informado"}</dd>
              </div>
              <div>
                <dt>Bairro / CEP</dt>
                <dd>
                  {[branch.addressLine2, branch.postalCode].filter(Boolean).join(" / ") ||
                    "Não informado"}
                </dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{branch.email ?? "Não informado"}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{branch.phone ?? "Não informado"}</dd>
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
                  {branch.isHeadquarters ? "Headquarters" : "Filial operacional"}
                </dd>
              </div>
              <div>
                <dt>Filial pai</dt>
                <dd>{parentBranch?.name ?? "Sem filial pai"}</dd>
              </div>
              <div>
                <dt>Responsável gestor</dt>
                <dd>
                  {manager ? `${manager.fullName} • ${manager.email}` : "Não vinculado"}
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
        members={members}
        open={isEditOpen}
      />
    </>
  );
}
