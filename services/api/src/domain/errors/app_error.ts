/** Error de aplicación con código estable y mensaje en español para el cliente. */
export class AppError extends Error {
  public readonly code: string;

  public readonly statusCode: number;

  public readonly details?: unknown;

  public constructor(_code: string, _message: string, _statusCode = 400, _details?: unknown) {
    super(_message);
    this.name = 'AppError';
    this.code = _code;
    this.statusCode = _statusCode;
    this.details = _details;
  }
}
