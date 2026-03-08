import { expect, test } from "@playwright/test";

import {
  attachMemberToOrganization,
  createDetachedAuthUser,
  createTestCnpj,
  createUniqueId,
  createWorkspace,
  expectRedirectToSignIn,
  getAssignedManagerMemberId,
} from "./helpers";

test("bootstrap, branch management, and auth flows work end to end", async ({ page, request }) => {
  await expectRedirectToSignIn(page);

  const suffix = createUniqueId("flow");
  const workspace = await createWorkspace(page, suffix);
  const branchCnpj = createTestCnpj(`${suffix}02`);
  const duplicateBranchCnpj = createTestCnpj(`${suffix}03`);
  const blockedHeadquartersCnpj = createTestCnpj(`${suffix}04`);

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
  await page.waitForURL("**/app");
  await expect(page.getByRole("heading", { level: 2, name: workspace.tradeName })).toBeVisible();
});
