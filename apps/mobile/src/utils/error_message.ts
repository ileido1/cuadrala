import { HttpError } from '../infrastructure/api/http_error';

export function getErrorMessage(_error: unknown): string {
  if (_error instanceof HttpError) return _error.message;
  if (_error instanceof Error) return _error.message;
  return 'Ocurrió un error inesperado.';
}
