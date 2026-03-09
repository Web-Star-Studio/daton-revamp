import {
  businessGoals,
  companySectors,
  companySizes,
  maturityLevels,
  type BusinessGoal,
  type CompanySector,
  type CompanySize,
  type MaturityLevel,
} from "@daton/contracts";

import type { ServerSession } from "./server-api";

type SessionOrganization = NonNullable<ServerSession["organization"]>;
export type OrganizationProfileDraft = {
  openingDate: string;
  taxRegime: string;
  primaryCnae: string;
  stateRegistration: string;
  municipalRegistration: string;
  companyProfile: {
    sector: CompanySector;
    customSector: string;
    size: CompanySize;
    goals: BusinessGoal[];
    maturityLevel: MaturityLevel;
    currentChallenges: string[];
  };
};

type LabeledValue<T extends string> = {
  description?: string;
  label: string;
  value: T;
};

export const sectorOptions: LabeledValue<CompanySector>[] = [
  { value: "manufacturing", label: "Manufatura" },
  { value: "agro", label: "Agro" },
  { value: "food_beverage", label: "Alimentos e bebidas" },
  { value: "mining", label: "Mineração" },
  { value: "oil_gas", label: "Óleo e gás" },
  { value: "energy", label: "Energia" },
  { value: "chemical", label: "Químico" },
  { value: "pulp_paper", label: "Papel e celulose" },
  { value: "steel", label: "Siderurgia" },
  { value: "logistics", label: "Logística" },
  { value: "financial", label: "Financeiro" },
  { value: "telecom", label: "Telecom" },
  { value: "public", label: "Setor público" },
  { value: "pharma_cosmetics", label: "Farma e cosméticos" },
  { value: "automotive", label: "Automotivo" },
  { value: "technology", label: "Tecnologia" },
  { value: "consumer_goods", label: "Bens de consumo" },
  { value: "utilities", label: "Utilities" },
  { value: "healthcare", label: "Saúde" },
  { value: "education", label: "Educação" },
  { value: "retail", label: "Varejo" },
  { value: "construction", label: "Construção" },
  { value: "services", label: "Serviços" },
  { value: "other", label: "Outro" },
];

export const sizeOptions: LabeledValue<CompanySize>[] = [
  { value: "micro", label: "Micro", description: "Até 9 pessoas" },
  { value: "small", label: "Pequena", description: "10 a 49 pessoas" },
  { value: "medium", label: "Média", description: "50 a 249 pessoas" },
  { value: "large", label: "Grande", description: "250 a 999 pessoas" },
  { value: "xlarge", label: "Muito grande", description: "1000 a 4999 pessoas" },
  { value: "enterprise", label: "Enterprise", description: "5000+ pessoas" },
];

export const goalOptions: LabeledValue<BusinessGoal>[] = [
  { value: "emissions_reduction", label: "Redução de emissões" },
  { value: "environmental_compliance", label: "Conformidade ambiental" },
  { value: "health_safety", label: "Saúde e segurança" },
  { value: "energy_efficiency", label: "Eficiência energética" },
  { value: "water_management", label: "Gestão hídrica" },
  { value: "waste_reduction", label: "Redução de resíduos" },
  { value: "sustainability", label: "Sustentabilidade" },
  { value: "quality", label: "Qualidade" },
  { value: "compliance", label: "Compliance" },
  { value: "performance", label: "Performance" },
  { value: "innovation", label: "Inovação" },
  { value: "cost_reduction", label: "Redução de custos" },
];

export const maturityOptions: LabeledValue<MaturityLevel>[] = [
  { value: "beginner", label: "Iniciante" },
  { value: "intermediate", label: "Intermediário" },
  { value: "advanced", label: "Avançado" },
];

const sectorLabelMap = Object.fromEntries(
  sectorOptions.map((option) => [option.value, option.label]),
) as Record<CompanySector, string>;

const sizeLabelMap = Object.fromEntries(
  sizeOptions.map((option) => [option.value, option.label]),
) as Record<CompanySize, string>;

const goalLabelMap = Object.fromEntries(
  goalOptions.map((option) => [option.value, option.label]),
) as Record<BusinessGoal, string>;

const maturityLabelMap = Object.fromEntries(
  maturityOptions.map((option) => [option.value, option.label]),
) as Record<MaturityLevel, string>;

export const companyProfileOptionSets = {
  businessGoals,
  companySectors,
  companySizes,
  maturityLevels,
};

export const getSectorLabel = (value: CompanySector) => sectorLabelMap[value];
export const getSizeLabel = (value: CompanySize) => sizeLabelMap[value];
export const getGoalLabel = (value: BusinessGoal) => goalLabelMap[value];
export const getMaturityLabel = (value: MaturityLevel) => maturityLabelMap[value];

export const getOrganizationProfileDefaults = (
  organization: SessionOrganization,
): OrganizationProfileDraft => {
  const companyProfile = organization.onboardingData.company_profile;

  return {
    openingDate: organization.openingDate ?? "",
    taxRegime: organization.taxRegime ?? "",
    primaryCnae: organization.primaryCnae ?? "",
    stateRegistration: organization.stateRegistration ?? "",
    municipalRegistration: organization.municipalRegistration ?? "",
    companyProfile: {
      sector: companyProfile?.sector ?? "manufacturing",
      customSector: companyProfile?.customSector ?? "",
      size: companyProfile?.size ?? "medium",
      goals: companyProfile?.goals ?? [],
      maturityLevel: companyProfile?.maturityLevel ?? "intermediate",
      currentChallenges: companyProfile?.currentChallenges ?? [],
    },
  };
};

export const formatCompanySector = (
  sector: CompanySector,
  customSector?: string | null,
) => {
  if (sector === "other") {
    return customSector?.trim() || "Outro";
  }

  return getSectorLabel(sector);
};
