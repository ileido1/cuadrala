import { describe, it, expect, vi, beforeEach } from 'vitest';

// Records the path every request is issued against, so these tests assert the
// URL the real client builds instead of a mock of itself.
const calls: Array<{ method: string; url: string; data?: unknown }> = [];

function recorder(method: string) {
  return (url: string, data?: unknown) => {
    calls.push({ method, url, ...(data !== undefined ? { data } : {}) });
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


describe('ApiClient authentication and registration paths', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('should register through the API contract and create the venue without a client owner id', async () => {
    await apiClient.auth.register('owner@example.com', 'secure-password', 'Venue Owner');
    await apiClient.venues.create({ name: 'Club Cuadrala', address: 'Caracas' });

    expect(calls).toEqual([
      {
        method: 'POST',
        url: '/auth/register',
        data: { email: 'owner@example.com', password: 'secure-password', name: 'Venue Owner' },
      },
      {
        method: 'POST',
        url: '/venues',
        data: { name: 'Club Cuadrala', address: 'Caracas' },
      },
    ]);
  });
});

describe('ApiClient dashboard paths', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('should request every route used by the active venue dashboard', async () => {
    await apiClient.venues.mine();
    await apiClient.venues.get('v1');
    await apiClient.venues.update('v1', { name: 'Club' });
    await apiClient.venues.dashboardStats('v1');
    await apiClient.venues.transactions.stats('v1');
    await apiClient.venues.transactions.history('v1', 1);
    await apiClient.venues.pendingTransactions('v1');
    await apiClient.venues.courts.list('v1', { status: 'ACTIVE' });
    await apiClient.venues.bookings.list('v1', { limit: 100 });
    await apiClient.venues.paymentMethods.list('v1');
    await apiClient.sports.list();

    expect(calls.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'GET', url: '/venues/mine' },
      { method: 'GET', url: '/venues/v1' },
      { method: 'PATCH', url: '/venues/v1' },
      { method: 'GET', url: '/venues/v1/dashboard-stats' },
      { method: 'GET', url: '/venues/v1/transactions/stats' },
      { method: 'GET', url: '/venues/v1/transactions/history' },
      { method: 'GET', url: '/venues/v1/transactions/pending' },
      { method: 'GET', url: '/venues/v1/courts' },
      { method: 'GET', url: '/venues/v1/bookings' },
      { method: 'GET', url: '/venues/v1/payment-methods' },
      { method: 'GET', url: '/sports' },
    ]);
  });
});
