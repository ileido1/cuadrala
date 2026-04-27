import { API_BASE_URL } from '../../config/env';
import type { ApiErrorPayload } from './api_types';
import { HttpError } from './http_error';

function isRecord(_value: unknown): _value is Record<string, unknown> {
  return typeof _value === 'object' && _value !== null && !Array.isArray(_value);
}

function isApiErrorPayload(_value: unknown): _value is ApiErrorPayload {
  if (!isRecord(_value)) return false;
  return _value.success === false && typeof _value.code === 'string' && typeof _value.message === 'string';
}

async function parseBody(_response: Response): Promise<unknown> {
  const TEXT = await _response.text();
  if (TEXT.length === 0) return undefined;
  try {
    return JSON.parse(TEXT) as unknown;
  } catch {
    return TEXT;
  }
}

function buildHeaders(_init: RequestInit | undefined, _hasJsonBody: boolean): HeadersInit {
  const NEXT: Record<string, string> = {
    Accept: 'application/json',
  };
  if (_hasJsonBody) {
    NEXT['Content-Type'] = 'application/json';
  }
  const EXISTING = _init?.headers;
  if (EXISTING === undefined) {
    return NEXT;
  }
  if (Array.isArray(EXISTING)) {
    return [...EXISTING, ...Object.entries(NEXT)];
  }
  if (EXISTING instanceof Headers) {
    const MERGED = new Headers(EXISTING);
    for (const [KEY, VAL] of Object.entries(NEXT)) {
      MERGED.set(KEY, VAL);
    }
    return MERGED;
  }
  return { ...EXISTING, ...NEXT };
}

export async function requestJson<TResponse>(_path: string, _init?: RequestInit): Promise<TResponse> {
  const URL = `${API_BASE_URL}${_path.startsWith('/') ? '' : '/'}${_path}`;
  const HAS_BODY = _init?.body !== undefined && _init.body !== null;
  const RESPONSE = await fetch(URL, {
    ..._init,
    headers: buildHeaders(_init, HAS_BODY),
  });
  const PARSED = await parseBody(RESPONSE);

  if (!RESPONSE.ok) {
    const ERR = isApiErrorPayload(PARSED) ? PARSED : undefined;
    const MESSAGE =
      ERR?.message ??
      (typeof PARSED === 'string' ? PARSED : `Error HTTP ${String(RESPONSE.status)}`);
    throw new HttpError(RESPONSE.status, ERR?.code ?? 'REQUEST_FAILED', MESSAGE, ERR);
  }

  return PARSED as TResponse;
}
