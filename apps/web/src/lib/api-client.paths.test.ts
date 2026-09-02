import { describe, it, expect, vi, beforeEach } from 'vitest';

// Records the path every request is issued against, so these tests assert the
// URL the real client builds instead of a mock of itself.
const calls: Array<{ method: string; url: string }> = [];

function recorder(method: string) {
  return (url: string) => {
    calls.push({ method, url });
    return Promise.resolve({ data: { data: null } });
  };
}

vi.mock('axios', () => {
  const instance = {
    get: recorder('GET'),
    post: recorder('POST'),
    put: recorder('PUT'),
    patch: recorder('PATCH'),
    delete: recorder('DELETE'),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: { create: () => instance, post: vi.fn() },
  };
});

const { apiClient } = await import('./api-client');

describe('ApiClient profile paths', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  // The PROFILE_ROUTER is mounted at /users in services/api
  // (api.v1.router.ts: API_V1_ROUTER.use('/users', PROFILE_ROUTER)).
  // Anything under /profile is a 404.
  it.each([
    ['getMe', () => apiClient.profile.getMe(), '/users/me'],
    ['getPlayerProfile', () => apiClient.profile.getPlayerProfile(), '/users/me/profile'],
    ['getStats', () => apiClient.profile.getStats('u1'), '/users/u1/stats'],
    ['getRatings', () => apiClient.profile.getRatings('u1'), '/users/u1/ratings'],
  ])('should request the path the API serves when calling %s', async (_name, call, expected) => {
    await call();

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ method: 'GET', url: expected });
  });

  it('should never request anything under /profile', async () => {
    await Promise.all([
      apiClient.profile.getMe(),
      apiClient.profile.getPlayerProfile(),
      apiClient.profile.getStats('u1'),
      apiClient.profile.getRatings('u1'),
      apiClient.profile.searchByDocument('123'),
    ]);

    expect(calls.filter((c) => c.url.startsWith('/profile'))).toEqual([]);
  });
});
