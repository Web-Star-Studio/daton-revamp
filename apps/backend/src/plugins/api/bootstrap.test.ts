import assert from "node:assert/strict";
import test from "node:test";

import { classifyBootstrapError } from "./bootstrap";

const logger = {
  warn() {
    return undefined;
  },
};

test("classifyBootstrapError surfaces WorkOS password policy failures", () => {
  assert.deepEqual(
    classifyBootstrapError(
      {
        message: "Password does not meet strength requirements.",
        name: "BadRequestException",
        status: 400,
      },
      logger,
    ),
    {
      message: "A senha não atende aos requisitos mínimos de segurança.",
      status: 400,
    },
  );
});

test("classifyBootstrapError maps direct legal identifier conflicts to 409", () => {
  assert.deepEqual(
    classifyBootstrapError(
      {
        code: "23505",
        constraint: "organizations_legal_identifier_idx",
        message: 'duplicate key value violates unique constraint "organizations_legal_identifier_idx"',
      },
      logger,
    ),
    {
      message: "Já existe uma organização com este CNPJ.",
      status: 409,
    },
  );
});

test("classifyBootstrapError maps wrapped legal identifier conflicts to 409", () => {
  const error = new Error("Failed query: insert into organizations");
  (error as Error & { cause?: unknown }).cause = {
    code: "23505",
    constraint: "organizations_legal_identifier_idx",
    detail: "Key (legal_identifier)=(REDACTED) already exists.",
  };

  assert.deepEqual(classifyBootstrapError(error, logger), {
    message: "Já existe uma organização com este CNPJ.",
    status: 409,
  });
});
