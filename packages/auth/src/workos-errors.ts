const workOsAuthErrorNames = new Set([
  "BadRequestException",
  "OauthException",
  "UnauthorizedException",
]);

const workOsAuthErrorCodes = new Map<
  string,
  | "email_verification_required"
  | "invalid_credentials"
  | "mfa_enrollment_required"
  | "password_auth_disabled"
  | "sso_required"
>([
  ["email_verification_required", "email_verification_required"],
  ["invalid_credentials", "invalid_credentials"],
  ["invalid_grant", "invalid_credentials"],
  ["mfa_enrollment", "mfa_enrollment_required"],
  ["password_auth_disabled", "password_auth_disabled"],
  ["sso_required", "sso_required"],
]);

const knownWorkOsMessagePatterns: Array<{
  kind:
    | "email_verification_required"
    | "invalid_credentials"
    | "mfa_enrollment_required"
    | "password_auth_disabled"
    | "sso_required"
    | "verification_code_invalid"
    | "weak_password";
  pattern: RegExp;
}> = [
  {
    kind: "weak_password",
    pattern: /\bpassword does not meet strength requirements\b/i,
  },
  {
    kind: "email_verification_required",
    pattern: /\bemail ownership must be verified before authentication\b/i,
  },
  {
    kind: "invalid_credentials",
    pattern:
      /\b(invalid_grant|invalid_credentials|incorrect email or password|incorrect password)\b/i,
  },
  {
    kind: "password_auth_disabled",
    pattern: /\bpassword authentication is disabled\b/i,
  },
  {
    kind: "sso_required",
    pattern: /\bsso_required\b|\bsso required\b/i,
  },
  {
    kind: "mfa_enrollment_required",
    pattern: /\bmfa_enrollment\b|\bmfa enrollment\b/i,
  },
  {
    kind: "verification_code_invalid",
    pattern:
      /\b(code provided is invalid or has expired|verification code is invalid or expired|invalid verification code|expired verification code)\b/i,
  },
];

export type WorkOsUserFacingErrorContext = "bootstrap" | "sign-in";

export type WorkOsUserFacingErrorKind =
  | "email_verification_required"
  | "invalid_credentials"
  | "mfa_enrollment_required"
  | "password_auth_disabled"
  | "sso_required"
  | "unknown"
  | "verification_code_invalid"
  | "weak_password";

export type ClassifiedWorkOsUserFacingError = {
  isExpected: boolean;
  kind: WorkOsUserFacingErrorKind;
  message: string;
};

const getErrorStatus = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return null;
  }

  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }

  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode;
  }

  return null;
};

const getErrorCode = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return null;
  }

  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  if ("error" in error && typeof error.error === "string") {
    return error.error;
  }

  return null;
};

const getErrorName = (error: unknown) =>
  error &&
  typeof error === "object" &&
  "name" in error &&
  typeof error.name === "string"
    ? error.name
    : null;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "";
};

const getContextFallbackMessage = (context: WorkOsUserFacingErrorContext) =>
  context === "bootstrap"
    ? "Não foi possível criar o ambiente inicial com os dados informados."
    : "Não foi possível entrar no ambiente agora.";

const getMessageForKind = (
  kind: Exclude<WorkOsUserFacingErrorKind, "unknown">,
) => {
  switch (kind) {
    case "weak_password":
      return "A senha não atende aos requisitos mínimos de segurança.";
    case "email_verification_required":
      return "Verifique a titularidade do e-mail antes de entrar no ambiente.";
    case "invalid_credentials":
      return "E-mail ou senha inválidos.";
    case "password_auth_disabled":
      return "O acesso com senha está desabilitado para este usuário.";
    case "sso_required":
      return "Este usuário precisa entrar usando SSO.";
    case "mfa_enrollment_required":
      return "Este usuário precisa concluir a configuração de MFA antes de entrar.";
    case "verification_code_invalid":
      return "O código de verificação é inválido ou expirou. Solicite um novo código e tente novamente.";
  }
};

const getKnownWorkOsErrorKind = (
  error: unknown,
): WorkOsUserFacingErrorKind | null => {
  const code = getErrorCode(error)?.toLowerCase();

  if (code && workOsAuthErrorCodes.has(code)) {
    return workOsAuthErrorCodes.get(code) ?? null;
  }

  const message = getErrorMessage(error);

  for (const candidate of knownWorkOsMessagePatterns) {
    if (candidate.pattern.test(message)) {
      return candidate.kind;
    }
  }

  return null;
};

const isLikelyWorkOsAuthError = (error: unknown) => {
  if (getKnownWorkOsErrorKind(error)) {
    return true;
  }

  const name = getErrorName(error);
  const status = getErrorStatus(error);

  if (name === "UnauthorizedException") {
    return true;
  }

  if (
    name &&
    workOsAuthErrorNames.has(name) &&
    status !== null &&
    [400, 401, 403].includes(status)
  ) {
    return true;
  }

  const code = getErrorCode(error);
  return Boolean(code && workOsAuthErrorCodes.has(code.toLowerCase()));
};

export const isWorkOsAuthenticationFailure = (error: unknown) =>
  isLikelyWorkOsAuthError(error);

export const classifyWorkOsUserFacingError = (
  error: unknown,
  context: WorkOsUserFacingErrorContext,
): ClassifiedWorkOsUserFacingError => {
  const kind = getKnownWorkOsErrorKind(error);

  if (kind && kind !== "unknown") {
    return {
      kind,
      isExpected: true,
      message: getMessageForKind(kind),
    };
  }

  return {
    kind: "unknown",
    isExpected: isLikelyWorkOsAuthError(error),
    message: getContextFallbackMessage(context),
  };
};
