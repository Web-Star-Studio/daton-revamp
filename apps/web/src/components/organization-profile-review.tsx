import type { UpdateOrganizationInput } from "@daton/contracts";

import {
  formatCompanySector,
  getGoalLabel,
  getMaturityLabel,
  getSizeLabel,
} from "@/lib/organization-profile";

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="organization-review-card__item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

type OrganizationProfileReviewProps = {
  draft: UpdateOrganizationInput;
};

export function OrganizationProfileReview({
  draft,
}: OrganizationProfileReviewProps) {
  return (
    <div className="organization-review-grid">
      <article className="organization-review-card">
        <h3>Perfil operacional</h3>
        <dl>
          <ReviewItem
            label="Setor"
            value={formatCompanySector(
              draft.companyProfile.sector,
              draft.companyProfile.customSector,
            )}
          />
          <ReviewItem
            label="Porte"
            value={getSizeLabel(draft.companyProfile.size)}
          />
        </dl>
      </article>

      <article className="organization-review-card">
        <h3>Objetivos e maturidade</h3>
        <dl>
          <ReviewItem
            label="Objetivos"
            value={draft.companyProfile.goals
              .map((goal) => getGoalLabel(goal))
              .join(", ")}
          />
          <ReviewItem
            label="Maturidade"
            value={getMaturityLabel(draft.companyProfile.maturityLevel)}
          />
        </dl>
      </article>

      <article className="organization-review-card">
        <h3>Contexto atual</h3>
        <dl>
          <ReviewItem
            label="Desafios"
            value={
              draft.companyProfile.currentChallenges.join(", ") ||
              "Nenhum desafio informado"
            }
          />
        </dl>
      </article>

      <article className="organization-review-card">
        <h3>Dados fiscais</h3>
        <dl>
          <ReviewItem
            label="Data de abertura"
            value={draft.openingDate || "Não informada"}
          />
          <ReviewItem
            label="Regime tributário"
            value={draft.taxRegime || "Não informado"}
          />
          <ReviewItem
            label="CNAE principal"
            value={draft.primaryCnae || "Não informado"}
          />
          <ReviewItem
            label="Inscrição estadual"
            value={draft.stateRegistration || "Não informada"}
          />
          <ReviewItem
            label="Inscrição municipal"
            value={draft.municipalRegistration || "Não informada"}
          />
        </dl>
      </article>
    </div>
  );
}
