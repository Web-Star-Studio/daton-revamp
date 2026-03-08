import { requireSession } from "@/lib/session";
import { formatCnpj } from "@daton/contracts";

export default async function OrganizationSettingsPage() {
  const session = await requireSession();

  return (
    <section className="workspace-section">
      <header className="workspace-hero">
        <div className="workspace-hero__lead">
          <p className="eyebrow">Configurações da organização</p>
          <h2>Organização</h2>
          <p className="workspace-copy">Consulte os dados principais da empresa em uma visão única e direta.</p>
        </div>
        <aside className="workspace-hero__panel">
          <p className="workspace-kicker">Organização</p>
          <strong>{session.organization?.tradeName ?? session.organization?.legalName ?? "Daton"}</strong>
          <span>
            {session.organization?.legalIdentifier
              ? formatCnpj(session.organization.legalIdentifier)
              : "Nenhum CNPJ disponível"}
          </span>
        </aside>
      </header>

      <article className="content-panel">
        <dl className="definition-list">
          <div>
            <dt>Razão social</dt>
            <dd>{session.organization?.legalName ?? "Indisponível"}</dd>
          </div>
          <div>
            <dt>Nome fantasia</dt>
            <dd>{session.organization?.tradeName ?? "Não definido"}</dd>
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
            <dt>Operador principal</dt>
            <dd>{session.member?.fullName ?? session.user.email}</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}
