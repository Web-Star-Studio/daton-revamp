import assert from "node:assert/strict";
import test from "node:test";

import { classifyWorkOsUserFacingError } from "./workos-errors";

test("classifyWorkOsUserFacingError maps weak passwords for bootstrap", () => {
  assert.deepEqual(
    classifyWorkOsUserFacingError(
      {
        message: "Password does not meet strength requirements.",
        name: "BadRequestException",
        status: 400,
      },
      "bootstrap",
    ),
    {
      kind: "weak_password",
      isExpected: true,
      message: "A senha não atende aos requisitos mínimos de segurança.",
    },
  );
});

test("classifyWorkOsUserFacingError maps email verification failures", () => {
  assert.deepEqual(
    classifyWorkOsUserFacingError(
      {
        message: "Email ownership must be verified before authentication.",
        name: "BadRequestException",
        status: 400,
      },
      "sign-in",
    ),
    {
      kind: "email_verification_required",
      isExpected: true,
      message:
        "Verifique a titularidade do e-mail antes de entrar no ambiente.",
    },
  );
});

test("classifyWorkOsUserFacingError keeps invalid credentials generic", () => {
  assert.deepEqual(
    classifyWorkOsUserFacingError(
      {
        code: "invalid_credentials",
        message: "incorrect email or password",
        name: "UnauthorizedException",
        status: 401,
      },
      "sign-in",
    ),
    {
      kind: "invalid_credentials",
      isExpected: true,
      message: "E-mail ou senha inválidos.",
    },
  );
});

test("classifyWorkOsUserFacingError maps password auth disabled", () => {
  assert.deepEqual(
    classifyWorkOsUserFacingError(
      {
        code: "password_auth_disabled",
        message: "password authentication is disabled",
        name: "BadRequestException",
        status: 400,
      },
      "sign-in",
    ),
    {
      kind: "password_auth_disabled",
      isExpected: true,
      message: "O acesso com senha está desabilitado para este usuário.",
    },
  );
});

test("classifyWorkOsUserFacingError maps sso required", () => {
  assert.deepEqual(
    classifyWorkOsUserFacingError(
      {
        code: "sso_required",
        message: "sso_required",
        name: "BadRequestException",
        status: 400,
      },
      "sign-in",
    ),
    {
      kind: "sso_required",
      isExpected: true,
      message: "Este usuário precisa entrar usando SSO.",
    },
  );
});

test("classifyWorkOsUserFacingError maps invalid verification codes", () => {
  assert.deepEqual(
    classifyWorkOsUserFacingError(
      {
        message: "The code provided is invalid or has expired.",
        name: "BadRequestException",
        status: 400,
      },
      "sign-in",
    ),
    {
      kind: "verification_code_invalid",
      isExpected: true,
      message:
        "O código de verificação é inválido ou expirou. Solicite um novo código e tente novamente.",
    },
  );
});

test("classifyWorkOsUserFacingError uses contextual fallback for unknown WorkOS 400s", () => {
  assert.deepEqual(
    classifyWorkOsUserFacingError(
      {
        message: "Unexpected validation rule from upstream.",
        name: "BadRequestException",
        status: 400,
      },
      "bootstrap",
    ),
    {
      kind: "unknown",
      isExpected: true,
      message:
        "Não foi possível criar o ambiente inicial com os dados informados.",
    },
  );
});
