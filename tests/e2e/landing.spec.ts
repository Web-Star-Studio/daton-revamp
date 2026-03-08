import { expect, test } from "@playwright/test";

test("landing page exposes the primary workspace entry points", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /Governança apresentada com a disciplina de um software editorial/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Criar organização" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Acessar ambiente existente" })).toBeVisible();
  await expect(
    page.getByText("Clareza em superfície branca com profundidade em campo escuro."),
  ).toBeVisible();
});
