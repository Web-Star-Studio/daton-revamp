import { expect, test } from "@playwright/test";

import {
  attachMemberToOrganization,
  completeOrganizationOnboarding,
  createDetachedAuthUser,
  createTestCnpj,
  createUniqueId,
  createWorkspace,
  expectRedirectToSignIn,
  getAssignedManagerMemberId,
  setOrganizationOnboardingStatus,
} from "./helpers";

test("bootstrap, branch management, and auth flows work end to end", async ({ page, request }) => {
  await expectRedirectToSignIn(page);

  const suffix = createUniqueId("flow");
  const workspace = await createWorkspace(page, suffix);
  const branchCnpj = createTestCnpj(`${suffix}02`);
  const duplicateBranchCnpj = createTestCnpj(`${suffix}03`);
  const blockedHeadquartersCnpj = createTestCnpj(`${suffix}04`);

  await page.goto("/app");
  await page.waitForURL("**/onboarding/organization");
  await completeOrganizationOnboarding(page);

  await page.getByRole("link", { name: "Nova filial" }).click();
  await expect(page.getByRole("heading", { name: "Criar filial" })).toBeVisible();

  await page.getByLabel("Nome da filial").fill(`Filial ${suffix}`);
  await page.getByLabel("Código da filial").fill(`BR${suffix.slice(-4).toUpperCase()}`);
  await page.getByLabel("CNPJ").fill(branchCnpj);
  await page.getByRole("button", { name: "Criar filial" }).click();

  await expect(page.getByRole("heading", { name: `Filial ${suffix}` })).toBeVisible();

  await page.goto("/app/branches/new");
  await page.getByLabel("Nome da filial").fill(`Duplicada ${suffix}`);
  await page.getByLabel("Código da filial").fill(`BR${suffix.slice(-4).toUpperCase()}`);
  await page.getByLabel("CNPJ").fill(duplicateBranchCnpj);
  await page.getByRole("button", { name: "Criar filial" }).click();
  await expect(page.getByText("O código da filial deve ser único dentro da organização.")).toBeVisible();

  await page.getByLabel("Nome da filial").fill(`Matriz bloqueada ${suffix}`);
  await page.getByLabel("Código da filial").fill(`HQ${suffix.slice(-3).toUpperCase()}X`);
  await page.getByLabel("CNPJ").fill(blockedHeadquartersCnpj);
  await page.getByLabel("Marcar como matriz").check();
  await page.getByRole("button", { name: "Criar filial" }).click();
  await expect(page.getByText("Apenas uma filial matriz ativa é permitida.")).toBeVisible();

  const detachedUser = await createDetachedAuthUser(request, suffix);
  const memberId = await attachMemberToOrganization({
    organizationLegalIdentifier: workspace.legalIdentifier,
    userId: detachedUser.id,
    name: detachedUser.name,
    email: detachedUser.email,
  });

  await page.goto("/app/settings/organization");
  await page.getByRole("link", { name: new RegExp(`Filial ${suffix}`) }).click();
  await page.getByLabel("ID do membro gestor").fill(memberId);
  await page.getByRole("button", { name: "Salvar alterações da filial" }).click();
  await expect(page.getByText("Salvar alterações da filial")).toBeVisible();
  await expect.poll(() => getAssignedManagerMemberId(`BR${suffix.slice(-4).toUpperCase()}`)).toBe(memberId);

  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/sign-in");

  await page.getByLabel("E-mail de trabalho").fill(workspace.adminEmail);
  await page.getByLabel("Senha").fill(`${workspace.password}-wrong`);
  await page.getByRole("button", { name: "Entrar no ambiente" }).click();
  await expect(page.getByText(/inválidos/i)).toBeVisible();

  await page.getByLabel("Senha").fill(workspace.password);
  await page.getByRole("button", { name: "Entrar no ambiente" }).click();
  await page.waitForURL("**/app/settings/organization");
  await expect(page.getByRole("heading", { level: 2, name: workspace.tradeName })).toBeVisible();
});

test("wizard blocks access until completion and enforces required onboarding fields", async ({ page }) => {
  const suffix = createUniqueId("onboarding");
  const workspace = await createWorkspace(page, suffix);

  await page.goto("/app");
  await page.waitForURL("**/onboarding/organization");

  await page.selectOption("#sector", "other");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Informe o setor da empresa.")).toBeVisible();

  await page.getByLabel("Qual é o setor?").fill("Operações urbanas");
  await page.locator(".organization-choice-card").filter({ hasText: /^Grande$/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Continuar" }).click();
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
