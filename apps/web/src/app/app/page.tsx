import { formatCnpj } from "@daton/contracts";
import { getServerBranches } from "@/lib/server-api";
import { formatBranchStatus, formatRole } from "@/lib/utils";
import Link from "next/link";

import { requireSession } from "@/lib/session";

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "active":
      return "badge badge--success";
    case "archived":
      return "badge badge--neutral";
    default:
      return "badge badge--warning";
  }
};

export default async function AppHomePage() {
  const [session, branches] = await Promise.all([requireSession(), getServerBranches()]);
  const organizationName = session.organization?.tradeName ?? session.organization?.legalName ?? "Daton";
  const activeBranches = branches.filter((branch: (typeof branches)[number]) => branch.status === "active").length;
  const headquarters = branches.find((branch: (typeof branches)[number]) => branch.isHeadquarters);

  return (
    <section className="workspace-section">
      <div className="stats-grid">
        <article className="stat-card">
          <p className="stat-card__label">Filiais ativas</p>
          <span className="stat-card__value">{activeBranches}</span>
          <p className="stat-card__note">Matriz e unidades operacionais em atividade.</p>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">Funções na sessão</p>
          <span className="stat-card__value">{session.effectiveRoles.length}</span>
          <p className="stat-card__note">Permissões disponíveis neste acesso.</p>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">Escopo visível</p>
          <span className="stat-card__value">{session.branchScope.length}</span>
          <p className="stat-card__note">Filiais alcançadas pelo contexto atual.</p>
        </article>
      </div>

      <div className="split-panel">
        <article className="content-panel">
          <h3>Filiais</h3>
          <div className="ruled-list--header">
            <span>Filial</span>
            <span>Código</span>
            <span>Status</span>
          </div>
          <ul className="ruled-list">
            {branches.map((branch: (typeof branches)[number]) => (
              <li key={branch.id}>
                <Link href={`/app/branches/${branch.id}`}>
                  <span>{branch.name}</span>
                  <span>{branch.code}</span>
                  <span className={getStatusBadgeClass(branch.status)}>
                    {formatBranchStatus(branch.status)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </article>
        <article className="content-panel">
          <h3>Organização</h3>
          <dl className="definition-list">
            <div>
              <dt>Membro</dt>
              <dd>{session.member?.fullName ?? "Sem perfil de membro"}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{session.user.email}</dd>
            </div>
            <div>
              <dt>CNPJ</dt>
              <dd>
                {session.organization?.legalIdentifier
                  ? formatCnpj(session.organization.legalIdentifier)
                  : "Indisponível"}
              </dd>
            </div>
            <div>
              <dt>Matriz</dt>
              <dd>{headquarters?.name ?? "Ainda não definida"}</dd>
            </div>
            <div>
              <dt>Funções</dt>
              <dd>{session.effectiveRoles.map((role: string) => formatRole(role)).join(", ")}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
