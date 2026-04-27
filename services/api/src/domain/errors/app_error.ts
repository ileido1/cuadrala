/** Error de aplicación con código estable y mensaje en español para el cliente. */
export class AppError extends Error {
  public readonly code: string;

  public readonly statusCode: number;

  public constructor(_code: string, _message: string, _statusCode = 400) {
    super(_message);
    this.name = 'AppError';
    this.code = _code;
    this.statusCode = _statusCode;
  }
}
