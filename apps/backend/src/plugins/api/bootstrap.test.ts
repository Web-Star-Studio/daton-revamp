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
