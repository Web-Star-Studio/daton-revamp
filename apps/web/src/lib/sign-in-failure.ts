import { classifyWorkOsUserFacingError } from "@daton/auth";

export const getSignInFailureResult = (error: unknown) => {
  const classified = classifyWorkOsUserFacingError(error, "sign-in");

  return {
    classified,
    message: classified.message,
    status: classified.isExpected ? 401 : 500,
  };
};
