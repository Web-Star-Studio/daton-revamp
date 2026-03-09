"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import type { UpdateOrganizationInput } from "@daton/contracts";

import { updateOrganization } from "@/lib/api";
import {
  formatCompanySector,
  getGoalLabel,
  getMaturityLabel,
  type OrganizationProfileDraft,
  getOrganizationProfileDefaults,
  getSizeLabel,
  goalOptions,
  maturityOptions,
  sectorOptions,
  sizeOptions,
} from "@/lib/organization-profile";
import type { ServerSession } from "@/lib/server-api";

type SessionOrganization = NonNullable<ServerSession["organization"]>;

type OrganizationProfileFormProps = {
  cancelHref?: string;
  mode?: "editor" | "wizard";
  onSuccessHref: string;
  organization: SessionOrganization;
  saveLabel?: string;
};

type WizardStep = {
  description: string;
  id: "profile" | "goals" | "context" | "fiscal" | "review";
  label: string;
};

const wizardSteps: WizardStep[] = [
  {
    id: "profile",
    label: "Perfil operacional",
    description: "Setor principal e porte da empresa.",
  },
  {
    id: "goals",
    label: "Objetivos e maturidade",
    description: "Prioridades estratégicas e estágio atual.",
  },
  {
    id: "context",
    label: "Contexto atual",
    description: "Desafios que já estão no radar.",
  },
  {
    id: "fiscal",
    label: "Dados fiscais",
    description: "Informações cadastrais complementares.",
  },
  {
    id: "review",
    label: "Revisão",
    description: "Validação final antes de entrar no app.",
  },
];

const defaultWizardStep = wizardSteps[0]!;

const trimChallenges = (values: string[]) =>
  values.map((value) => value.trim()).filter(Boolean);

const normalizeDraft = (draft: OrganizationProfileDraft): UpdateOrganizationInput => ({
  openingDate: draft.openingDate.trim(),
  taxRegime: draft.taxRegime.trim(),
  primaryCnae: draft.primaryCnae.trim(),
  stateRegistration: draft.stateRegistration.trim(),
  municipalRegistration: draft.municipalRegistration.trim(),
  companyProfile: {
    ...draft.companyProfile,
    customSector: draft.companyProfile.customSector.trim(),
    currentChallenges: trimChallenges(draft.companyProfile.currentChallenges),
  },
});

const getStepError = (
  step: WizardStep["id"],
  draft: UpdateOrganizationInput,
): string | null => {
  if (step === "profile") {
    if (
      draft.companyProfile.sector === "other"
      && !(draft.companyProfile.customSector ?? "").trim()
    ) {
      return "Informe o setor da empresa.";
    }
    return null;
  }

  if (step === "goals") {
    if (draft.companyProfile.goals.length === 0) {
      return "Selecione ao menos um objetivo de negócio.";
    }
  }

  return null;
};

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="organization-review-card__item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function OrganizationProfileForm({
  cancelHref,
  mode = "editor",
  onSuccessHref,
  organization,
  saveLabel = "Salvar dados",
}: OrganizationProfileFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<OrganizationProfileDraft>(() =>
    getOrganizationProfileDefaults(organization),
  );
  const [challengeInput, setChallengeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const isWizard = mode === "wizard";
  const normalizedDraft = normalizeDraft(draft);
  const activeStep = wizardSteps[stepIndex] ?? defaultWizardStep;

  const setField = <K extends keyof Omit<OrganizationProfileDraft, "companyProfile">>(
    key: K,
    value: OrganizationProfileDraft[K],
  ) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const setCompanyProfileField = <
    K extends keyof OrganizationProfileDraft["companyProfile"],
  >(
    key: K,
    value: OrganizationProfileDraft["companyProfile"][K],
  ) => {
    setDraft((current) => ({
      ...current,
      companyProfile: {
        ...current.companyProfile,
        [key]: value,
      },
    }));
  };

  const addChallenge = () => {
    const value = challengeInput.trim();

    if (!value) {
      return;
    }

    if (draft.companyProfile.currentChallenges.includes(value)) {
      setChallengeInput("");
      return;
    }

    setCompanyProfileField("currentChallenges", [
      ...draft.companyProfile.currentChallenges,
      value,
    ]);
    setChallengeInput("");
  };

  const removeChallenge = (value: string) => {
    setCompanyProfileField(
      "currentChallenges",
      draft.companyProfile.currentChallenges.filter((challenge) => challenge !== value),
    );
  };

  const toggleGoal = (value: OrganizationProfileDraft["companyProfile"]["goals"][number]) => {
    setCompanyProfileField(
      "goals",
      draft.companyProfile.goals.includes(value)
        ? draft.companyProfile.goals.filter((goal) => goal !== value)
        : [...draft.companyProfile.goals, value],
    );
  };

  const handleChallengeKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }

    event.preventDefault();
    addChallenge();
  };

  const saveProfile = () => {
    setError(null);
    setIsPending(true);

    startTransition(async () => {
      try {
        await updateOrganization(normalizedDraft);
        router.replace(onSuccessHref);
        router.refresh();
      } catch (organizationError) {
        setError(
          organizationError instanceof Error
            ? organizationError.message
            : "Não foi possível salvar os dados da organização.",
        );
      } finally {
        setIsPending(false);
      }
    });
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isWizard) {
      const validationError = getStepError("profile", normalizedDraft)
        ?? getStepError("goals", normalizedDraft);

      if (validationError) {
        setError(validationError);
        return;
      }
    }

    saveProfile();
  };

  const goNext = () => {
    const validationError = getStepError(activeStep.id, normalizedDraft);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setStepIndex((current) => Math.min(current + 1, wizardSteps.length - 1));
  };

  const goBack = () => {
    setError(null);
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const renderProfileSection = () => (
    <div className="organization-form-grid">
      <div className="field field--wide">
        <label htmlFor="sector">Setor principal</label>
        <select
          id="sector"
          name="sector"
          value={draft.companyProfile.sector}
          onChange={(event) =>
            setCompanyProfileField("sector", event.currentTarget.value as UpdateOrganizationInput["companyProfile"]["sector"])
          }
        >
          {sectorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {draft.companyProfile.sector === "other" ? (
        <div className="field field--wide">
          <label htmlFor="customSector">Qual é o setor?</label>
          <input
            id="customSector"
            name="customSector"
            placeholder="Descreva o setor principal"
            type="text"
            value={draft.companyProfile.customSector}
            onChange={(event) =>
              setCompanyProfileField("customSector", event.currentTarget.value)
            }
          />
        </div>
      ) : null}

      <fieldset className="organization-choice-group field--wide">
        <legend>Porte da empresa</legend>
        <div className="organization-choice-grid organization-choice-grid--compact">
          {sizeOptions.map((option) => (
            <label
              className={`organization-choice-card${
                draft.companyProfile.size === option.value
                  ? " organization-choice-card--selected"
                  : ""
              }`}
              key={option.value}
            >
              <input
                checked={draft.companyProfile.size === option.value}
                name="size"
                type="radio"
                value={option.value}
                onChange={() => setCompanyProfileField("size", option.value)}
              />
              <span>{option.label}</span>
              <small>{option.description}</small>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );

  const renderGoalsSection = () => (
    <div className="organization-form-grid">
      <fieldset className="organization-choice-group field--wide">
        <legend>Objetivos prioritários</legend>
        <div className="organization-goals-grid">
          {goalOptions.map((option) => (
            <label
              className={`organization-goal-chip${
                draft.companyProfile.goals.includes(option.value)
                  ? " organization-goal-chip--selected"
                  : ""
              }`}
              key={option.value}
            >
              <input
                checked={draft.companyProfile.goals.includes(option.value)}
                type="checkbox"
                value={option.value}
                onChange={() => toggleGoal(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="organization-choice-group field--wide">
        <legend>Nível de maturidade</legend>
        <div className="organization-choice-grid">
          {maturityOptions.map((option) => (
            <label
              className={`organization-choice-card${
                draft.companyProfile.maturityLevel === option.value
                  ? " organization-choice-card--selected"
                  : ""
              }`}
              key={option.value}
            >
              <input
                checked={draft.companyProfile.maturityLevel === option.value}
                name="maturityLevel"
                type="radio"
                value={option.value}
                onChange={() =>
                  setCompanyProfileField("maturityLevel", option.value)
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );

  const renderContextSection = () => (
    <div className="organization-form-grid">
      <div className="field field--wide">
        <label htmlFor="currentChallenges">Desafios atuais</label>
        <div className="challenge-input">
          <input
            id="currentChallenges"
            name="currentChallenges"
            placeholder="Ex: consolidar indicadores entre unidades"
            type="text"
            value={challengeInput}
            onChange={(event) => setChallengeInput(event.currentTarget.value)}
            onKeyDown={handleChallengeKeyDown}
          />
          <button
            className="button button--secondary"
            type="button"
            onClick={addChallenge}
          >
            Adicionar
          </button>
        </div>
      </div>

      <div className="field field--wide">
        <p className="form-note">
          Use uma entrada por desafio. Esse campo é opcional e pode ficar vazio.
        </p>
        <div className="challenge-chip-list">
          {draft.companyProfile.currentChallenges.length > 0 ? (
            draft.companyProfile.currentChallenges.map((challenge) => (
              <button
                className="challenge-chip"
                key={challenge}
                type="button"
                onClick={() => removeChallenge(challenge)}
              >
                <span>{challenge}</span>
                <strong aria-hidden="true">×</strong>
              </button>
            ))
          ) : (
            <span className="challenge-chip challenge-chip--placeholder">
              Nenhum desafio informado
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const renderFiscalSection = () => (
    <div className="organization-form-grid">
      <div className="field">
        <label htmlFor="openingDate">Data de abertura</label>
        <input
          id="openingDate"
          name="openingDate"
          type="date"
          value={draft.openingDate}
          onChange={(event) => setField("openingDate", event.currentTarget.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="taxRegime">Regime tributário</label>
        <input
          id="taxRegime"
          name="taxRegime"
          placeholder="Ex: Simples Nacional"
          type="text"
          value={draft.taxRegime}
          onChange={(event) => setField("taxRegime", event.currentTarget.value)}
        />
      </div>
      <div className="field field--wide">
        <label htmlFor="primaryCnae">CNAE principal</label>
        <input
          id="primaryCnae"
          name="primaryCnae"
          placeholder="Ex: 62.01-5-01"
          type="text"
          value={draft.primaryCnae}
          onChange={(event) => setField("primaryCnae", event.currentTarget.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="stateRegistration">Inscrição estadual</label>
        <input
          id="stateRegistration"
          name="stateRegistration"
          type="text"
          value={draft.stateRegistration}
          onChange={(event) =>
            setField("stateRegistration", event.currentTarget.value)
          }
        />
      </div>
      <div className="field">
        <label htmlFor="municipalRegistration">Inscrição municipal</label>
        <input
          id="municipalRegistration"
          name="municipalRegistration"
          type="text"
          value={draft.municipalRegistration}
          onChange={(event) =>
            setField("municipalRegistration", event.currentTarget.value)
          }
        />
      </div>
    </div>
  );

  const renderReviewSection = () => (
    <div className="organization-review-grid">
      <article className="organization-review-card">
        <h3>Perfil operacional</h3>
        <dl>
          <ReviewItem
            label="Setor"
            value={formatCompanySector(
              normalizedDraft.companyProfile.sector,
              normalizedDraft.companyProfile.customSector,
            )}
          />
          <ReviewItem
            label="Porte"
            value={getSizeLabel(normalizedDraft.companyProfile.size)}
          />
        </dl>
      </article>

      <article className="organization-review-card">
        <h3>Objetivos e maturidade</h3>
        <dl>
          <ReviewItem
            label="Objetivos"
            value={normalizedDraft.companyProfile.goals
              .map((goal) => getGoalLabel(goal))
              .join(", ")}
          />
          <ReviewItem
            label="Maturidade"
            value={getMaturityLabel(normalizedDraft.companyProfile.maturityLevel)}
          />
        </dl>
      </article>

      <article className="organization-review-card">
        <h3>Contexto atual</h3>
        <dl>
          <ReviewItem
            label="Desafios"
            value={
              normalizedDraft.companyProfile.currentChallenges.join(", ")
              || "Nenhum desafio informado"
            }
          />
        </dl>
      </article>

      <article className="organization-review-card">
        <h3>Dados fiscais</h3>
        <dl>
          <ReviewItem
            label="Data de abertura"
            value={normalizedDraft.openingDate || "Não informada"}
          />
          <ReviewItem
            label="Regime tributário"
            value={normalizedDraft.taxRegime || "Não informado"}
          />
          <ReviewItem
            label="CNAE principal"
            value={normalizedDraft.primaryCnae || "Não informado"}
          />
          <ReviewItem
            label="Inscrição estadual"
            value={normalizedDraft.stateRegistration || "Não informada"}
          />
          <ReviewItem
            label="Inscrição municipal"
            value={normalizedDraft.municipalRegistration || "Não informada"}
          />
        </dl>
      </article>
    </div>
  );

  if (!isWizard) {
    return (
      <form className="organization-editor-form" onSubmit={submitForm}>
        <section className="organization-form-section">
          <header className="organization-form-section__header">
            <div>
              <p className="workspace-kicker">Perfil operacional</p>
              <h3>Posicionamento e porte</h3>
            </div>
          </header>
          {renderProfileSection()}
        </section>

        <section className="organization-form-section">
          <header className="organization-form-section__header">
            <div>
              <p className="workspace-kicker">Objetivos e maturidade</p>
              <h3>Direção estratégica da conta</h3>
            </div>
          </header>
          {renderGoalsSection()}
        </section>

        <section className="organization-form-section">
          <header className="organization-form-section__header">
            <div>
              <p className="workspace-kicker">Contexto atual</p>
              <h3>Desafios percebidos pela equipe</h3>
            </div>
          </header>
          {renderContextSection()}
        </section>

        <section className="organization-form-section">
          <header className="organization-form-section__header">
            <div>
              <p className="workspace-kicker">Dados fiscais</p>
              <h3>Informações cadastrais complementares</h3>
            </div>
          </header>
          {renderFiscalSection()}
        </section>

        {error ? <p className="form-error">{error}</p> : null}
        <div className="organization-profile-form__actions">
          <button className="button" disabled={isPending} type="submit">
            {isPending ? "Salvando dados" : saveLabel}
          </button>
          {cancelHref ? (
            <Link
              aria-disabled={isPending}
              className="button button--secondary"
              href={cancelHref}
            >
              Cancelar
            </Link>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <form className="onboarding-wizard" onSubmit={submitForm}>
      <div className="onboarding-wizard__steps" aria-label="Etapas do onboarding">
        {wizardSteps.map((step, index) => (
          <div
            className={`onboarding-step${
              index === stepIndex ? " onboarding-step--active" : ""
            }${index < stepIndex ? " onboarding-step--complete" : ""}`}
            key={step.id}
          >
            <span className="onboarding-step__index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <strong>{step.label}</strong>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="onboarding-wizard__panel">
        <header className="onboarding-wizard__header">
          <p className="workspace-kicker">Etapa {stepIndex + 1} de {wizardSteps.length}</p>
          <h2>{activeStep.label}</h2>
          <p>{activeStep.description}</p>
        </header>

        {activeStep.id === "profile" ? renderProfileSection() : null}
        {activeStep.id === "goals" ? renderGoalsSection() : null}
        {activeStep.id === "context" ? renderContextSection() : null}
        {activeStep.id === "fiscal" ? renderFiscalSection() : null}
        {activeStep.id === "review" ? renderReviewSection() : null}

        {error ? <p className="form-error">{error}</p> : null}

        <div className="onboarding-wizard__actions">
          <button
            className="button button--secondary"
            disabled={isPending || stepIndex === 0}
            type="button"
            onClick={goBack}
          >
            Voltar
          </button>

          {activeStep.id === "review" ? (
            <button className="button" disabled={isPending} type="submit">
              {isPending ? "Finalizando onboarding" : saveLabel}
            </button>
          ) : (
            <button className="button" disabled={isPending} type="button" onClick={goNext}>
              Continuar
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
