export class AppHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AppHttpError";
    this.status = status;
  }
}

export class HTTPException extends AppHttpError {
  constructor(status: number, input: { message: string }) {
    super(status, input.message);
    this.name = "HTTPException";
  }
}
