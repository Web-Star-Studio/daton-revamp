import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

const platformPoints = [
  "Isolamento por organização com controle auditável e escopo por filial.",
  "Estruturas operacionais de filiais que acompanham o crescimento da empresa.",
  "Informação documentada com governança pronta para revisão.",
];

const workflow = [
  {
    index: "01",
    title: "Estruture a organização",
    copy: "Crie a organização, registre o primeiro administrador e defina a matriz em um único ponto governado.",
  },
  {
    index: "02",
    title: "Defina a responsabilidade das filiais",
    copy: "Mapeie a hierarquia, atribua responsáveis e exponha apenas o escopo operacional que cada pessoa deve enxergar.",
  },
  {
    index: "03",
    title: "Opere com evidências",
    copy: "Transforme ações administrativas diárias em evidência operacional durável, em vez de ruído disperso.",
  },
];

const productNotes = [
  {
    label: "Identidade",
    value: "Organização, proprietário, filial, evidência.",
  },
  {
    label: "Postura",
    value: "Clareza em superfície branca com profundidade em campo escuro.",
  },
  {
    label: "Infraestrutura",
    value: "Arquitetura Cloudflare-first, governada de ponta a ponta.",
  },
];

export default function HomePage() {
  return (
    <main className="marketing-shell">
      <SiteHeader />
      <section className="hero hero--luminous" id="platform">
        <div className="hero__content">
          <p className="hero__issue">Edição 01 / Governança operacional</p>
          <p className="eyebrow">Controle operacional para organizações com múltiplas filiais</p>
          <h1>
            Governança apresentada com a disciplina de um software editorial e a calma de um instrumento
            de precisão.
          </h1>
          <p className="hero__lede">
            O Daton entrega uma superfície de comando orientada por filiais, onde estrutura,
            responsabilidade e evidências auditáveis parecem compostas, não burocráticas.
          </p>
          <div className="hero__actions">
            <Link className="button" href="/create-organization">
              Criar organização
            </Link>
            <Link className="button button--ghost" href="/sign-in">
              Acessar ambiente existente
            </Link>
          </div>
          <dl className="metric-strip">
            {productNotes.map((note) => (
              <div key={note.label}>
                <dt>{note.label}</dt>
                <dd>{note.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <aside aria-hidden="true" className="hero__visual">
          <div className="pixel-panel">
            <div className="pixel-panel__header">
              <span>Daton</span>
              <span>Superfície de controle / 01</span>
            </div>
            <div className="pixel-panel__cards">
              <article>
                <strong>Estrutura inicial</strong>
                <span>Proprietário, admin, matriz.</span>
              </article>
              <article>
                <strong>Escopo de filiais</strong>
                <span>Hierarquia, visibilidade, responsabilidade.</span>
              </article>
              <article>
                <strong>Postura de evidência</strong>
                <span>Linguagem de sistema orientada à auditoria.</span>
              </article>
            </div>
          </div>
        </aside>
      </section>

      <section className="manifesto-grid" id="workflow">
        {platformPoints.map((point, index) => (
          <article key={point} className="manifesto-card">
            <span className="manifesto-card__index">{String(index + 1).padStart(2, "0")}</span>
            <p>{point}</p>
          </article>
        ))}
      </section>

      <section className="section-grid section-grid--editorial" id="modules">
        <div className="section-grid__lead">
          <p className="eyebrow">Superfície da fase 1</p>
          <h2>Feito para equipes operacionais sérias, não para dashboards ornamentais.</h2>
          <p>
            O sistema visual permanece contido: superfícies limpas, profundidade estruturada e pontos de
            interação rigorosamente marcados.
          </p>
        </div>
        <div className="section-grid__body">
          {workflow.map((step) => (
            <article key={step.index} className="step-card">
              <span className="step-card__index">{step.index}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="quote-band">
        <p>
          "O Daton trata a governança de filiais como uma publicação desenhada: exata, luminosa e
          impossível de interpretar errado."
        </p>
      </section>
    </main>
  );
}
