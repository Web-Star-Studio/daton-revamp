import { expect, test } from "@playwright/test";
import { EncryptJWT } from "jose";

import {
  createDetachedAuthUser,
  completeOrganizationOnboarding,
  createTestCnpj,
  createUniqueId,
  createWorkspace,
  expectRedirectToSignIn,
  setOrganizationOnboardingStatus,
} from "./helpers";

const textEncoder = new TextEncoder();
const pendingEmailVerificationSalt = textEncoder.encode(
  "daton.pending-email-verification.v1",
);
const pendingEmailVerificationInfo = textEncoder.encode(
  "daton/pending-email-verification-encryption",
);

const createPendingVerificationSetCookie = async (input: {
  email: string;
  emailVerificationId: string;
  flow: "sign-in" | "sign-up";
  pendingAuthenticationToken: string;
  targetWorkosOrganizationId: string | null;
}) => {
  const importedKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode("test-session-secret-1234567890"),
    "HKDF",
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: pendingEmailVerificationSalt.buffer.slice(
        pendingEmailVerificationSalt.byteOffset,
        pendingEmailVerificationSalt.byteOffset +
          pendingEmailVerificationSalt.byteLength,
      ),
      info: pendingEmailVerificationInfo.buffer.slice(
        pendingEmailVerificationInfo.byteOffset,
        pendingEmailVerificationInfo.byteOffset +
          pendingEmailVerificationInfo.byteLength,
      ),
    },
    importedKey,
    256,
  );
  const sealed = await new EncryptJWT(input)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("900s")
    .encrypt(new Uint8Array(derivedBits));

  return `daton-pending-email-verification=${sealed}; Path=/; HttpOnly; SameSite=Lax`;
};

test("bootstrap, branch management, and auth flows work end to end", async ({
  page,
}) => {
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

    if (url.pathname === "/api/auth/sign-in") {
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
  await expect(
    page.getByRole("heading", { name: "Criar filial" }),
  ).toBeVisible();

  await page.getByLabel("Nome da filial").fill(`Filial ${suffix}`);
  await page
    .getByLabel("Código da filial")
    .fill(`BR${suffix.slice(-4).toUpperCase()}`);
  await page.getByLabel("CNPJ").fill(branchCnpj);
  await page.getByRole("button", { name: "Criar filial" }).click();

  await expect(
    page.getByRole("heading", { name: `Filial ${suffix}` }),
  ).toBeVisible();
  expect(observedRequestOrigins.branchCreation).toContain(appOrigin);

  await page.goto("/app/branches/new");
  await page.getByLabel("Nome da filial").fill(`Duplicada ${suffix}`);
  await page
    .getByLabel("Código da filial")
    .fill(`BR${suffix.slice(-4).toUpperCase()}`);
  await page.getByLabel("CNPJ").fill(duplicateBranchCnpj);
  await page.getByRole("button", { name: "Criar filial" }).click();
  await expect(
    page.getByText("O código da filial deve ser único dentro da organização."),
  ).toBeVisible();

  await page.getByLabel("Nome da filial").fill(`Headquarters ${suffix}`);
  await page
    .getByLabel("Código da filial")
    .fill(`HQ${suffix.slice(-3).toUpperCase()}X`);
  await page.getByLabel("CNPJ").fill(secondHeadquartersCnpj);
  await page.getByLabel("Marcar como headquarters").check();
  await page.getByRole("button", { name: "Criar filial" }).click();
  await expect(
    page.getByRole("heading", { name: `Headquarters ${suffix}` }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/auth?mode=sign-in");

  await page.getByLabel("E-mail de trabalho").fill(workspace.adminEmail);
  await page.getByLabel("Senha").fill(`${workspace.password}-wrong`);
  await page.getByRole("button", { name: "Entrar no ambiente" }).click();
  await expect(page.getByText(/inválidos/i)).toBeVisible();

  await page.getByLabel("Senha").fill(workspace.password);
  await page.getByRole("button", { name: "Entrar no ambiente" }).click();
  await page.waitForURL("**/app/settings/organization");
  await expect(
    page.getByRole("heading", { level: 2, name: workspace.tradeName }),
  ).toBeVisible();
  expect(observedRequestOrigins.signIn).toContain(appOrigin);
});

test("sign-up shows the translated weak-password requirement", async ({
  page,
}) => {
  const suffix = createUniqueId("weak-password");

  await page.route("**/api/auth/sign-up", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        message: "A senha não atende aos requisitos mínimos de segurança.",
      }),
      contentType: "application/json",
      status: 400,
    });
  });

  await page.goto("/auth?mode=sign-up");
  await page.getByLabel("Razão social").fill(`Daton Test ${suffix}`);
  await page.getByLabel("Nome fantasia").fill(`Daton ${suffix}`);
  await page
    .getByLabel("CNPJ", { exact: true })
    .fill(createTestCnpj(`${suffix}21`));
  await page
    .getByLabel("Nome completo do administrador")
    .fill(`Operador ${suffix}`);
  await page
    .getByLabel("E-mail do administrador")
    .fill(`operator.${suffix}@example.com`);
  await page.getByLabel("Senha").fill("weakpass");
  await page.getByLabel(/declaro que li, entendi e concordo/i).check();
  await page.getByRole("button", { name: "Criar ambiente Daton" }).click();

  await expect(
    page.getByText("A senha não atende aos requisitos mínimos de segurança."),
  ).toBeVisible();
});

test("sign-in transitions into verification, surfaces invalid codes, and supports resend", async ({
  page,
}) => {
  let verificationAttempts = 0;

  await page.route("**/api/auth/sign-in", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        email: "dev@example.com",
        flow: "sign-in",
        message:
          "Verifique a titularidade do e-mail antes de entrar no ambiente.",
        status: "verification_required",
      }),
      contentType: "application/json",
      headers: {
        "set-cookie": await createPendingVerificationSetCookie({
          email: "dev@example.com",
          emailVerificationId: "email_ver_123",
          flow: "sign-in",
          pendingAuthenticationToken: "pending_auth_123",
          targetWorkosOrganizationId: null,
        }),
      },
      status: 200,
    });
  });
  await page.route("**/api/auth/verify-email/resend", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        message: "Enviamos um novo código de verificação para o seu e-mail.",
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/auth/verify-email", async (route, request) => {
    if (request.method() === "DELETE") {
      await route.fulfill({
        body: JSON.stringify({
          redirectTo: "/auth?mode=sign-in",
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    verificationAttempts += 1;

    await route.fulfill(
      verificationAttempts === 1
        ? {
            body: JSON.stringify({
              message:
                "O código de verificação é inválido ou expirou. Solicite um novo código e tente novamente.",
            }),
            contentType: "application/json",
            status: 400,
          }
        : {
            body: JSON.stringify({
              redirectTo: "/auth?mode=sign-in&verified=1",
              status: "authenticated",
            }),
            contentType: "application/json",
            status: 200,
          },
    );
  });

  await page.goto("/auth?mode=sign-in");
  await page.getByLabel("E-mail de trabalho").fill("dev@example.com");
  await page.getByLabel("Senha").fill("Strong-password-123");
  await page.getByRole("button", { name: "Entrar no ambiente" }).click();

  await page.waitForURL("**/auth?mode=verify-email");
  await expect(
    page.getByRole("heading", {
      name: "Confirme o código de verificação para concluir a entrada no Daton.",
    }),
  ).toBeVisible();

  await page.getByLabel("Código de verificação").fill("000000");
  await page.getByRole("button", { name: "Verificar e entrar" }).click();
  await expect(
    page.getByText(
      "O código de verificação é inválido ou expirou. Solicite um novo código e tente novamente.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Reenviar código" }).click();
  await expect(
    page.getByText("Enviamos um novo código de verificação para o seu e-mail."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Voltar para a entrada" }).click();
  await page.waitForURL("**/auth?mode=sign-in");
});

test("sign-up transitions into verification and continues after a valid code", async ({
  page,
}) => {
  const suffix = createUniqueId("verify-signup");

  await page.route("**/api/auth/sign-up", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        email: `operator.${suffix}@example.com`,
        flow: "sign-up",
        message:
          "Verifique a titularidade do e-mail para concluir o primeiro acesso.",
        status: "verification_required",
      }),
      contentType: "application/json",
      headers: {
        "set-cookie": await createPendingVerificationSetCookie({
          email: `operator.${suffix}@example.com`,
          emailVerificationId: "email_ver_456",
          flow: "sign-up",
          pendingAuthenticationToken: "pending_auth_456",
          targetWorkosOrganizationId: "org_123",
        }),
      },
      status: 200,
    });
  });
  await page.route("**/api/auth/verify-email", async (route, request) => {
    if (request.method() === "DELETE") {
      await route.fulfill({
        body: JSON.stringify({
          redirectTo: "/auth?mode=sign-up",
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        redirectTo: "/auth?mode=sign-in&verified=1",
        status: "authenticated",
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto("/auth?mode=sign-up");
  await page.getByLabel("Razão social").fill(`Daton Test ${suffix}`);
  await page.getByLabel("Nome fantasia").fill(`Daton ${suffix}`);
  await page
    .getByLabel("CNPJ", { exact: true })
    .fill(createTestCnpj(`${suffix}22`));
  await page
    .getByLabel("Nome completo do administrador")
    .fill(`Operador ${suffix}`);
  await page
    .getByLabel("E-mail do administrador")
    .fill(`operator.${suffix}@example.com`);
  await page.getByLabel("Senha").fill("Strong-password-123!");
  await page.getByLabel(/declaro que li, entendi e concordo/i).check();
  await page.getByRole("button", { name: "Criar ambiente Daton" }).click();

  await page.waitForURL("**/auth?mode=verify-email");
  await expect(
    page.getByText(
      "Verifique a titularidade do e-mail para concluir o primeiro acesso.",
    ),
  ).toBeVisible();

  await page.getByLabel("Código de verificação").fill("123456");
  await page.getByRole("button", { name: "Verificar e continuar" }).click();
  await page.waitForURL("**/auth?mode=sign-in&verified=1");
});

test("wizard blocks access until completion and enforces required onboarding fields", async ({
  page,
}) => {
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
  await expect(
    page.getByText("Selecione ao menos um objetivo de negócio."),
  ).toBeVisible();

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

test("detached authenticated users can bootstrap an organization", async ({
  page,
  request,
}) => {
  const suffix = createUniqueId("detached");
  const user = await createDetachedAuthUser(request, suffix);

  await page.goto("/auth?mode=sign-in");
  await page.getByLabel("E-mail de trabalho").fill(user.email);
  await page.getByLabel("Senha").fill(`Manager-${suffix}-secure`);
  await page.getByRole("button", { name: "Entrar no ambiente" }).click();

  await page.waitForURL("**/auth?mode=sign-up");

  const legalName = `Detached Org ${suffix}`;
  const tradeName = `Detached ${suffix}`;
  const legalIdentifier = createTestCnpj(`${suffix}90`);

  await page.getByLabel("Razão social").fill(legalName);
  await page.getByLabel("Nome fantasia").fill(tradeName);
  await page.getByLabel("CNPJ", { exact: true }).fill(legalIdentifier);
  await page.getByLabel(/declaro que li, entendi e concordo/i).check();
  await page.getByRole("button", { name: "Criar ambiente Daton" }).click();

  await page.waitForURL("**/onboarding/organization");
  await expect(
    page.getByRole("heading", {
      name: "Perfil operacional",
    }),
  ).toBeVisible();
});
