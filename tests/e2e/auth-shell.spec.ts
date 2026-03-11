import { expect, test } from "@playwright/test";

test("auth shell exposes the Clerk-backed entry points", async ({ page }) => {
  await page.goto("/auth?mode=sign-in");

  await expect(
    page.getByRole("heading", {
      name: /Bem-vindo ao Daton/i,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail de trabalho")).toBeVisible();
  await expect(page.getByRole("link", { name: "Criar ambiente" })).toBeVisible();

  await page.goto("/auth?mode=sign-up");
  await expect(
    page.getByRole("heading", {
      name: /Estruture a organização/i,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Razão social")).toBeVisible();
  await expect(page.getByRole("link", { name: "Criar credencial" })).toHaveCount(0);
});

test("unauthenticated app access redirects to sign-in", async ({ page }) => {
  await page.goto("/app");
  await page.waitForURL("**/auth?mode=sign-in");

  await expect(
    page.getByRole("heading", {
      name: /Bem-vindo ao Daton/i,
    }),
  ).toBeVisible();
});
