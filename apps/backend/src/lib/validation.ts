import { ZodError, type ZodType } from "zod";

import { AppHttpError } from "./errors";

export const parseOrThrow = <T>(schema: ZodType<T>, value: unknown) => {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppHttpError(400, error.issues[0]?.message ?? "Dados inválidos.");
    }

    throw error;
  }
};
