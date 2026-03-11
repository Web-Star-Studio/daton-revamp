import { z } from "zod";

export const pendingEmailVerificationSummaryStorageKey =
  "daton-pending-email-verification-summary";

export const authFlowSchema = z.enum(["sign-in", "sign-up"]);

export const authenticatedAuthResultSchema = z.object({
  redirectTo: z.string(),
  status: z.literal("authenticated"),
});

export const verificationRequiredAuthResultSchema = z.object({
  email: z.email(),
  flow: authFlowSchema,
  message: z.string().min(1),
  status: z.literal("verification_required"),
});

export const authResultSchema = z.discriminatedUnion("status", [
  authenticatedAuthResultSchema,
  verificationRequiredAuthResultSchema,
]);

export const resendEmailVerificationResultSchema = z.object({
  message: z.string().min(1),
});

export const cancelEmailVerificationResultSchema = z.object({
  redirectTo: z.string(),
});

export type AuthFlow = z.infer<typeof authFlowSchema>;
export type AuthResult = z.infer<typeof authResultSchema>;
export type VerificationRequiredAuthResult = z.infer<
  typeof verificationRequiredAuthResultSchema
>;

export const getVerifyEmailCopy = (flow: AuthFlow) => ({
  description:
    flow === "sign-up"
      ? "O cadastro inicial foi registrado. Antes do primeiro acesso, confirme a titularidade do e-mail para concluir a liberação do ambiente."
      : "Para concluir a autenticação, confirme o código enviado para o seu e-mail de trabalho.",
  inlineMessage:
    flow === "sign-up"
      ? "O cadastro foi criado, mas o e-mail precisa ser verificado antes do primeiro acesso."
      : "Verifique a titularidade do e-mail antes de entrar no ambiente.",
  kicker: "Verificar e-mail",
  title:
    flow === "sign-up"
      ? "Confirme o e-mail do responsável para liberar o primeiro acesso ao Daton."
      : "Confirme o código de verificação para concluir a entrada no Daton.",
});
