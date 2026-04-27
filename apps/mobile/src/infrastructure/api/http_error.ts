import type { ApiErrorPayload } from './api_types';

export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly payload: ApiErrorPayload | undefined;

  constructor(
    _statusCode: number,
    _code: string,
    _message: string,
    _payload: ApiErrorPayload | undefined,
  ) {
    super(_message);
    this.name = 'HttpError';
    this.statusCode = _statusCode;
    this.code = _code;
    this.payload = _payload;
  }
}
