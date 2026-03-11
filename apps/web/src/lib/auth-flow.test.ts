import assert from "node:assert/strict";
import test from "node:test";

import { getVerifyEmailCopy } from "./auth-flow";

test("getVerifyEmailCopy differentiates sign-in and sign-up messaging", () => {
  assert.equal(
    getVerifyEmailCopy("sign-in").inlineMessage,
    "Verifique a titularidade do e-mail antes de entrar no ambiente.",
  );
  assert.equal(
    getVerifyEmailCopy("sign-up").inlineMessage,
    "O cadastro foi criado, mas o e-mail precisa ser verificado antes do primeiro acesso.",
  );
});
