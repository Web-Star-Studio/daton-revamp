import { expect, test } from "@playwright/test";

import {
  completeOrganizationOnboarding,
  createTestCnpj,
  createUniqueId,
  createWorkspace,
  expectRedirectToSignIn,
  setOrganizationOnboardingStatus,
} from "./helpers";

test("bootstrap, branch management, and auth flows work end to end", async ({ page }) => {
  const observedRequestOrigins = {
    bootstrap: [] as string[],
    branchCreation: [] as string[],
    signIn: [] as string[],
  };

  page.on("request", (request) => {
    if (request.method() !== "POST") {
      return;
    }

    const url = new URL(request.url());

    if (url.pathname === "/api/v1/bootstrap/organization") {
      observedRequestOrigins.bootstrap.push(url.origin);
    }

    if (url.pathname === "/api/v1/branches") {
      observedRequestOrigins.branchCreation.push(url.origin);
    }

    if (url.pathname === "/api/auth/sign-in/email") {
      observedRequestOrigins.signIn.push(url.origin);
    }
  });

  await expectRedirectToSignIn(page);
  const appOrigin = new URL(page.url()).origin;

  const suffix = createUniqueId("flow");
  const workspace = await createWorkspace(page, suffix);
  const branchCnpj = createTestCnpj(`${suffix}02`);
  const duplicateBranchCnpj = createTestCnpj(`${suffix}03`);
  const secondHeadquartersCnpj = createTestCnpj(`${suffix}04`);

  expect(observedRequestOrigins.bootstrap).toContain(appOrigin);

  await page.goto("/app");
  await page.waitForURL("**/onboarding/organization");
  await completeOrganizationOnboarding(page);

  await page.goto("/app/branches/new");
  await expect(page.getByRole("heading", { name: "Criar filial" })).toBeVisible();

  await page.getByLabel("Nome da filial").fill(`Filial ${suffix}`);
  await page.getByLabel("Código da filial").fill(`BR${suffix.slice(-4).toUpperCase()}`);
  await page.getByLabel("CNPJ").fill(branchCnpj);
  await page.getByRole("button", { name: "Criar filial" }).click();

  await expect(page.getByRole("heading", { name: `Filial ${suffix}` })).toBeVisible();
  expect(observedRequestOrigins.branchCreation).toContain(appOrigin);

  await page.goto("/app/branches/new");
  await page.getByLabel("Nome da filial").fill(`Duplicada ${suffix}`);
  await page.getByLabel("Código da filial").fill(`BR${suffix.slice(-4).toUpperCase()}`);
  await page.getByLabel("CNPJ").fill(duplicateBranchCnpj);
  await page.getByRole("button", { name: "Criar filial" }).click();
  await expect(page.getByText("O código da filial deve ser único dentro da organização.")).toBeVisible();

  await page.getByLabel("Nome da filial").fill(`Headquarters ${suffix}`);
  await page.getByLabel("Código da filial").fill(`HQ${suffix.slice(-3).toUpperCase()}X`);
  await page.getByLabel("CNPJ").fill(secondHeadquartersCnpj);
  await page.getByLabel("Marcar como headquarters").check();
  await page.getByRole("button", { name: "Criar filial" }).click();
  await expect(page.getByRole("heading", { name: `Headquarters ${suffix}` })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/auth?mode=sign-in");

  await page.getByLabel("E-mail de trabalho").fill(workspace.adminEmail);
  await page.getByLabel("Senha").fill(`${workspace.password}-wrong`);
  await page.getByRole("button", { name: "Entrar no ambiente" }).click();
  await expect(page.getByText(/inválidos/i)).toBeVisible();

  await page.getByLabel("Senha").fill(workspace.password);
  await page.getByRole("button", { name: "Entrar no ambiente" }).click();
  await page.waitForURL("**/app/settings/organization");
  await expect(page.getByRole("heading", { level: 2, name: workspace.tradeName })).toBeVisible();
  expect(observedRequestOrigins.signIn).toContain(appOrigin);
});

test("wizard blocks access until completion and enforces required onboarding fields", async ({ page }) => {
  const suffix = createUniqueId("onboarding");
  const workspace = await createWorkspace(page, suffix);

  await page.goto("/app");
  await page.waitForURL("**/onboarding/organization");

  await page.selectOption("#sector", "other");
  await page.getByRole("button", { name: "Próximo Passo" }).click();
  await expect(page.getByText("Informe o setor da empresa.")).toBeVisible();

  await page.getByLabel("Qual é o setor?").fill("Operações urbanas");
  await page.getByText("Grande", { exact: true }).click();
  await page.getByRole("button", { name: "Próximo Passo" }).click();

  await page.getByRole("button", { name: "Próximo Passo" }).click();
  await expect(page.getByText("Selecione ao menos um objetivo de negócio.")).toBeVisible();

  await page.goto("/app/settings/organization");
  await page.waitForURL("**/onboarding/organization");

  await setOrganizationOnboardingStatus({
    legalIdentifier: workspace.legalIdentifier,
    status: "skipped",
  });

  await page.goto("/app/settings/organization");
  await page.waitForURL("**/onboarding/organization");

  await completeOrganizationOnboarding(page, {
    customSector: "Operações urbanas",
    openingDate: "2019-03-10",
  });

  await page.getByRole("link", { name: "Editar dados" }).click();
  await page.getByLabel("Qual é o setor?").fill("Operações industriais");
  await page.getByText("Iniciante").click();
  await page.getByRole("button", { name: "Salvar dados" }).click();
  await expect(page.getByText("Operações industriais")).toBeVisible();
  await expect(page.getByText("Iniciante")).toBeVisible();
});
