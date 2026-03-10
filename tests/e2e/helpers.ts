import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { formatCnpj } from "@daton/contracts";
import postgres from "postgres";

const databaseUrl = "postgres://postgres:postgres@127.0.0.1:5432/daton";

export const createUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createValidCnpj = (seed: string) => {
  const digits = seed.replace(/\D/g, "").padEnd(12, "0").slice(0, 12) || "123456780001";

  const sanitizedBase = /^(\d)\1{11}$/.test(digits) ? "123456780001" : digits;

  const calculateCheckDigit = (base: string, startWeight: number) => {
    let weight = startWeight;
    let total = 0;

    for (const digit of base) {
      total += Number(digit) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }

    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstCheckDigit = calculateCheckDigit(sanitizedBase, 5);
  const secondCheckDigit = calculateCheckDigit(`${sanitizedBase}${firstCheckDigit}`, 6);

  return `${sanitizedBase}${firstCheckDigit}${secondCheckDigit}`;
};

export const createWorkspace = async (
  page: Page,
  suffix: string,
) => {
  const legalName = `Daton Test ${suffix}`;
  const tradeName = `Daton ${suffix}`;
  const legalIdentifier = createValidCnpj(`${suffix}01`);
  const adminFullName = `Operador ${suffix}`;
  const adminEmail = `operator.${suffix}@example.com`;
  const password = `Daton-${suffix}-secure`;
  const hqName = `Matriz ${suffix}`;
  const hqCode = `HQ${suffix.slice(-4).toUpperCase()}`;
  const hqLegalIdentifier = legalIdentifier;

  await page.goto("/create-organization");
  await page.getByLabel("Razão social").fill(legalName);
  await page.getByLabel("Nome fantasia").fill(tradeName);
  await page.getByLabel("CNPJ", { exact: true }).fill(formatCnpj(legalIdentifier));
  await page.getByLabel("Nome completo do administrador").fill(adminFullName);
  await page.getByLabel("E-mail do administrador").fill(adminEmail);
  await page.getByLabel("Senha").fill(password);
  await page.getByLabel("Nome da matriz").fill(hqName);
  await page.getByLabel("Código da matriz").fill(hqCode);
  await page.getByRole("button", { name: "Criar ambiente Daton" }).click();

  await page.waitForURL("**/onboarding/organization");
  await expect(
    page.getByRole("heading", {
      name: new RegExp(`Estruture ${tradeName}`),
    }),
  ).toBeVisible();

  return {
    legalName,
    tradeName,
    legalIdentifier,
    adminFullName,
    adminEmail,
    password,
    hqName,
    hqCode,
    hqLegalIdentifier,
  };
};

export const completeOrganizationOnboarding = async (
  page: Page,
  overrides?: Partial<{
    customSector: string;
    openingDate: string;
  }>,
) => {
  await page.selectOption("#sector", "other");
  await page.getByLabel("Qual é o setor?").fill(
    overrides?.customSector ?? "Serviços especializados",
  );
  await page.getByText("Média").click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByText("Redução de emissões").click();
  await page.getByText("Compliance").click();
  await page.getByText("Avançado").click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("Desafios atuais").fill("Padronizar indicadores ESG");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("Data de abertura").fill(
    overrides?.openingDate ?? "2020-01-15",
  );
  await page.getByLabel("Regime tributário").fill("Lucro Real");
  await page.getByLabel("CNAE principal").fill("62.01-5-01");
  await page.getByLabel("Inscrição estadual").fill("123456789");
  await page.getByLabel("Inscrição municipal").fill("987654321");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Concluir e entrar no app" }).click();
  await page.waitForURL("**/app/settings/organization");
  await expect(
    page.getByText(overrides?.customSector ?? "Serviços especializados"),
  ).toBeVisible();
};

export const createDetachedAuthUser = async (request: APIRequestContext, suffix: string) => {
  const email = `manager.${suffix}@example.com`;
  const response = await request.post("http://127.0.0.1:8787/api/auth/sign-up/email", {
    data: {
      name: `Gestor ${suffix}`,
      email,
      password: `Manager-${suffix}-secure`,
    },
  });

  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    user: {
      id: string;
      email: string;
      name: string;
    };
  };

  return payload.user;
};

export const createTestCnpj = (seed: string) => createValidCnpj(seed);

export const attachMemberToOrganization = async (input: {
  organizationLegalIdentifier: string;
  userId: string;
  name: string;
  email: string;
}) => {
  const sql = postgres(databaseUrl, { prepare: false });
  const memberId = crypto.randomUUID();

  try {
    const [organization] = await sql<{ id: string }[]>`
      select id
      from organizations
      where legal_identifier = ${input.organizationLegalIdentifier}
      limit 1
    `;

    if (!organization) {
      throw new Error("Organização não encontrada para vincular o membro.");
    }

    await sql`
      insert into organization_members (id, organization_id, user_id, full_name, email, status, created_at, updated_at)
      values (${memberId}, ${organization.id}, ${input.userId}, ${input.name}, ${input.email}, 'active', now(), now())
    `;

    return memberId;
  } finally {
    await sql.end();
  }
};

export const getAssignedManagerMemberId = async (branchCode: string) => {
  const sql = postgres(databaseUrl, { prepare: false });

  try {
    const [assignment] = await sql<{ member_id: string }[]>`
      select bma.member_id
      from branch_manager_assignments bma
      inner join branches b on b.id = bma.branch_id
      where b.code = ${branchCode}
        and bma.unassigned_at is null
      limit 1
    `;

    return assignment?.member_id ?? null;
  } finally {
    await sql.end();
  }
};

export const setOrganizationOnboardingStatus = async (input: {
  legalIdentifier: string;
  status: "pending" | "completed" | "skipped";
}) => {
  const sql = postgres(databaseUrl, { prepare: false });

  try {
    const result = await sql`
      update organizations
      set onboarding_status = ${input.status}
      where legal_identifier = ${input.legalIdentifier}
    `;

    if (result.count === 0) {
      throw new Error(
        `Organização não encontrada para atualizar onboarding: ${input.legalIdentifier}`,
      );
    }
  } finally {
    await sql.end();
  }
};

export const expectRedirectToSignIn = async (page: Page) => {
  await page.goto("/app");
  await page.waitForURL("**/sign-in");
  await expect(page.getByRole("heading", { name: /Bem-vindo ao Daton/i })).toBeVisible();
};
