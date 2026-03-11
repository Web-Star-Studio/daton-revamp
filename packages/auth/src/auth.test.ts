import assert from "node:assert/strict";
import test from "node:test";

import {
  extractWorkOsEmailVerificationRequiredPayload,
  sealPendingEmailVerification,
  unsealPendingEmailVerification,
} from "./auth";

const sessionEnv = {
  DATON_SESSION_SECRET: "daton-session-secret-for-tests-1234567890",
};

test("extractWorkOsEmailVerificationRequiredPayload reads WorkOS rawData", () => {
  assert.deepEqual(
    extractWorkOsEmailVerificationRequiredPayload({
      code: "email_verification_required",
      name: "BadRequestException",
      rawData: {
        email_verification_id: "email_ver_123",
        pending_authentication_token: "pending_auth_123",
      },
      status: 400,
    }),
    {
      emailVerificationId: "email_ver_123",
      pendingAuthenticationToken: "pending_auth_123",
    },
  );
});

test("sealPendingEmailVerification round-trips the pending verification payload", async () => {
  const sealed = await sealPendingEmailVerification(
    {
      email: "dev@webstar.studio",
      emailVerificationId: "email_ver_123",
      flow: "sign-up",
      pendingAuthenticationToken: "pending_auth_123",
      targetWorkosOrganizationId: "org_123",
    },
    sessionEnv,
  );

  const unsealed = await unsealPendingEmailVerification(sealed, sessionEnv);

  assert.deepEqual(unsealed, {
    email: "dev@webstar.studio",
    emailVerificationId: "email_ver_123",
    flow: "sign-up",
    pendingAuthenticationToken: "pending_auth_123",
    targetWorkosOrganizationId: "org_123",
  });
});
