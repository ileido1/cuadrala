import { describe, it, expect, vi, beforeEach } from 'vitest';

type ErrorHandler = (error: unknown) => Promise<unknown>;

let onResponseError: ErrorHandler;
const post = vi.fn();
const retried: unknown[] = [];

vi.mock('axios', () => {
  // The client calls itself as a function to replay the original request,
  // so the instance has to be callable and carry the verb methods.
  const instance = Object.assign(
    (config: unknown) => {
      retried.push(config);
      return Promise.resolve({ data: { data: 'replayed' } });
    },
    {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: {
          use: (_ok: unknown, err: ErrorHandler) => {
            onResponseError = err;
          },
        },
      },
    }
  );
  return { default: { create: () => instance, post } };
});

await import('./api-client');

function unauthorized() {
  return {
    response: { status: 401 },
    config: { headers: {} as Record<string, string> },
  };
}

const store = new Map<string, string>();

beforeEach(() => {
  post.mockReset();
  retried.length = 0;
  store.clear();
  store.set('refreshToken', 'r0');
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('window', { location: { href: '' } });
});

describe('401 handling', () => {
  it('refreshes once for concurrent 401s', async () => {
    // Refresh tokens rotate: a second call would spend a token the first one
    // already consumed and log the user out of a recoverable session.
    post.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { data: { accessToken: 'a1', refreshToken: 'r1' } } }), 5)
        )
    );

    await Promise.all([
      onResponseError(unauthorized()),
      onResponseError(unauthorized()),
      onResponseError(unauthorized()),
    ]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(retried).toHaveLength(3);
    expect(store.get('accessToken')).toBe('a1');
  });

  it('rejects instead of storing a missing access token', async () => {
    // Storing undefined writes the string "undefined" and every later request
    // carries `Bearer undefined` — an endless 401 loop, not a clean logout.
    post.mockResolvedValue({ data: { data: { refreshToken: 'r1' } } });

    await expect(onResponseError(unauthorized())).rejects.toThrow(/access token/);

    expect(store.has('accessToken')).toBe(false);
    expect(store.has('refreshToken')).toBe(false);
  });

  it('does not touch localStorage on the server', async () => {
    vi.stubGlobal('window', undefined);
    const boom = new Error('localStorage is not defined');
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw boom;
      },
      removeItem: () => {
        throw boom;
      },
    });

    const failure = unauthorized();
    await expect(onResponseError(failure)).rejects.toBe(failure);
    expect(post).not.toHaveBeenCalled();
  });
});
