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

import { OrganizationProfileReview } from "@/components/organization-profile-review";
import { updateOrganization } from "@/lib/api";
import {
  type OrganizationProfileDraft,
  getOrganizationProfileDefaults,
  normalizeOrganizationProfileDraft,
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
  onCancel?: () => void;
  onSuccessHref: string;
  organization: SessionOrganization;
  saveLabel?: string;
  variant?: "page" | "modal";
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

const getStepError = (
  step: WizardStep["id"],
  draft: UpdateOrganizationInput,
): string | null => {
  if (step === "profile") {
    if (
      draft.companyProfile.sector === "other" &&
      !(draft.companyProfile.customSector ?? "").trim()
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

export function OrganizationProfileForm({
  cancelHref,
  mode = "editor",
  onCancel,
  onSuccessHref,
  organization,
  saveLabel = "Salvar dados",
  variant = "page",
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
  const isModalVariant = variant === "modal";
  const normalizedDraft = normalizeOrganizationProfileDraft(draft);
  const activeStep = wizardSteps[stepIndex] ?? defaultWizardStep;

  const setField = <
    K extends keyof Omit<OrganizationProfileDraft, "companyProfile">,
  >(
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

  const flushPendingChallenge = (sourceDraft: OrganizationProfileDraft) => {
    const value = challengeInput.trim();

    if (!value) {
      return sourceDraft;
    }

    setChallengeInput("");

    if (sourceDraft.companyProfile.currentChallenges.includes(value)) {
      return sourceDraft;
    }

    const nextDraft = {
      ...sourceDraft,
      companyProfile: {
        ...sourceDraft.companyProfile,
        currentChallenges: [
          ...sourceDraft.companyProfile.currentChallenges,
          value,
        ],
      },
    };

    setDraft(nextDraft);
    return nextDraft;
  };

  const removeChallenge = (value: string) => {
    setCompanyProfileField(
      "currentChallenges",
      draft.companyProfile.currentChallenges.filter(
        (challenge) => challenge !== value,
      ),
    );
  };

  const toggleGoal = (
    value: OrganizationProfileDraft["companyProfile"]["goals"][number],
  ) => {
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

  const saveProfile = (payload: UpdateOrganizationInput) => {
    setError(null);
    setIsPending(true);

    startTransition(async () => {
      try {
        await updateOrganization(payload);
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

    if (isWizard && activeStep.id !== "review") {
      return;
    }

    const draftWithPendingChallenge = flushPendingChallenge(draft);
    const payload = normalizeOrganizationProfileDraft(
      draftWithPendingChallenge,
    );

    if (isWizard) {
      const validationError =
        getStepError("profile", payload) ?? getStepError("goals", payload);

      if (validationError) {
        setError(validationError);
        return;
      }
    }

    saveProfile(payload);
  };

  const goNext = () => {
    const draftWithPendingChallenge = flushPendingChallenge(draft);
    const payload = normalizeOrganizationProfileDraft(
      draftWithPendingChallenge,
    );
    const validationError = getStepError(activeStep.id, payload);

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
    <div className="wizard-step-stack">
      <section className="wizard-section">
        <div className="organization-form-grid">
          <div className="field field--wide">
            <label htmlFor="sector">Setor principal</label>
            <select
              id="sector"
              name="sector"
              value={draft.companyProfile.sector}
              onChange={(event) =>
                setCompanyProfileField(
                  "sector",
                  event.currentTarget
                    .value as UpdateOrganizationInput["companyProfile"]["sector"],
                )
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
                  setCompanyProfileField(
                    "customSector",
                    event.currentTarget.value,
                  )
                }
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="wizard-section">
        <fieldset className="organization-choice-group">
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
      </section>
    </div>
  );

  const renderGoalsSection = () => (
    <div className="wizard-step-stack">
      <section className="wizard-section">
        <fieldset className="organization-choice-group">
          <div className="organization-goals-grid organization-goals-grid--cards">
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
                {draft.companyProfile.goals.includes(option.value) ? (
                  <span
                    className="organization-goal-chip__check"
                    aria-hidden="true"
                  >
                    <svg fill="none" viewBox="0 0 24 24">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                      />
                    </svg>
                  </span>
                ) : null}
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="wizard-section wizard-section--compact">
        <fieldset className="organization-choice-group">
          <div className="organization-segmented-control">
            {maturityOptions.map((option) => (
              <label
                className="organization-segmented-control__option"
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
      </section>
    </div>
  );

  const renderContextSection = () => (
    <section className="wizard-section">
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
          <div className="challenge-chip-list">
            {draft.companyProfile.currentChallenges.length > 0
              ? draft.companyProfile.currentChallenges.map((challenge) => (
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
              : null}
          </div>
        </div>
      </div>
    </section>
  );

  const renderFiscalSection = () => (
    <section className="wizard-section">
      <div className="organization-form-grid">
        <div className="field">
          <label htmlFor="openingDate">Data de abertura</label>
          <input
            id="openingDate"
            name="openingDate"
            type="date"
            value={draft.openingDate}
            onChange={(event) =>
              setField("openingDate", event.currentTarget.value)
            }
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
            onChange={(event) =>
              setField("taxRegime", event.currentTarget.value)
            }
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
            onChange={(event) =>
              setField("primaryCnae", event.currentTarget.value)
            }
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
    </section>
  );

  const renderReviewSection = () => (
    <section className="wizard-section">
      <OrganizationProfileReview draft={normalizedDraft} />
    </section>
  );

  if (!isWizard) {
    return (
      <form
        className={`organization-editor-form${
          isModalVariant ? " organization-editor-form--modal" : ""
        }`}
        onSubmit={submitForm}
      >
        <div
          className={
            isModalVariant
              ? "app-modal__body app-modal__body--editor organization-profile-modal__body"
              : undefined
          }
        >
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
        </div>

        <footer className="organization-profile-form__actions collaborator-form__footer">
          {onCancel ? (
            <button
              className="button button--secondary"
              disabled={isPending}
              onClick={onCancel}
              type="button"
            >
              Cancelar
            </button>
          ) : null}
          <button className="button" disabled={isPending} type="submit">
            {isPending ? "Salvando dados" : saveLabel}
          </button>
          {!onCancel && cancelHref ? (
            isPending ? (
              <span
                aria-disabled="true"
                className="button button--secondary button--disabled"
              >
                Cancelar
              </span>
            ) : (
              <Link className="button button--secondary" href={cancelHref}>
                Cancelar
              </Link>
            )
          ) : null}
        </footer>
      </form>
    );
  }

  return (
    <form className="onboarding-wizard" onSubmit={submitForm}>
      <div className="onboarding-wizard__panel">
        <div
          className="onboarding-wizard__progress"
          aria-label="Progresso do onboarding"
        >
          {wizardSteps.map((step, index) => (
            <span
              className={`onboarding-wizard__progress-bar${
                index <= stepIndex
                  ? " onboarding-wizard__progress-bar--active"
                  : ""
              }`}
              key={step.id}
            />
          ))}
        </div>

        <header className="onboarding-wizard__header">
          <h2>{activeStep.label}</h2>
          <p>{activeStep.description}</p>
        </header>

        <div className="onboarding-wizard__body">
          {activeStep.id === "profile" ? renderProfileSection() : null}
          {activeStep.id === "goals" ? renderGoalsSection() : null}
          {activeStep.id === "context" ? renderContextSection() : null}
          {activeStep.id === "fiscal" ? renderFiscalSection() : null}
          {activeStep.id === "review" ? renderReviewSection() : null}
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <footer className="onboarding-wizard__actions">
          <button
            className="onboarding-wizard__nav onboarding-wizard__nav--back"
            disabled={isPending || stepIndex === 0}
            type="button"
            onClick={goBack}
          >
            <svg fill="none" viewBox="0 0 24 24">
              <path
                d="M10 19 3 12m0 0 7-7m-7 7h18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            Voltar
          </button>

          {activeStep.id === "review" ? (
            <button
              className="onboarding-wizard__nav onboarding-wizard__nav--next"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Finalizando onboarding" : saveLabel}
            </button>
          ) : (
            <button
              className="onboarding-wizard__nav onboarding-wizard__nav--next"
              disabled={isPending}
              type="button"
              onClick={goNext}
            >
              Próximo Passo
              <svg fill="none" viewBox="0 0 24 24">
                <path
                  d="m14 5 7 7m0 0-7 7m7-7H3"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          )}
        </footer>
      </div>
    </form>
  );
}
