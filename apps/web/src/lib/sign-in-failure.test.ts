import assert from "node:assert/strict";
import test from "node:test";

import { getSignInFailureResult } from "./sign-in-failure";

test("getSignInFailureResult surfaces email verification requirements", () => {
  assert.deepEqual(
    getSignInFailureResult({
      message: "Email ownership must be verified before authentication.",
      name: "BadRequestException",
      status: 400,
    }),
    {
      classified: {
        kind: "email_verification_required",
        isExpected: true,
        message:
          "Verifique a titularidade do e-mail antes de entrar no ambiente.",
      },
      message:
        "Verifique a titularidade do e-mail antes de entrar no ambiente.",
      status: 401,
    },
  );
});

test("getSignInFailureResult keeps invalid credentials generic", () => {
  assert.deepEqual(
    getSignInFailureResult({
      code: "invalid_credentials",
      message: "incorrect email or password",
      name: "UnauthorizedException",
      status: 401,
    }),
    {
      classified: {
        kind: "invalid_credentials",
        isExpected: true,
        message: "E-mail ou senha inválidos.",
      },
      message: "E-mail ou senha inválidos.",
      status: 401,
    },
  );
});
