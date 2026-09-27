import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getTokenMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: getTokenMock,
}));

vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => ({ type: 'next' })),
    redirect: vi.fn(),
  },
}));

import { middleware } from '~/middleware';

function createRequest(url: string) {
  return {
    url,
    nextUrl: new URL(url),
  } as never;
}

describe('middleware session cookie protocol', () => {
  beforeEach(() => {
    getTokenMock.mockReset();
    getTokenMock.mockResolvedValue(null);
  });

  it.each([
    ['HTTPS', 'https://cuadrala.vercel.app/dashboard', true],
    ['HTTP', 'http://localhost:3001/dashboard', false],
  ])('uses the secure Auth.js cookie for %s requests', async (_protocol, url, secureCookie) => {
    await middleware(createRequest(url));

    expect(getTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        req: expect.objectContaining({ url }),
        secureCookie,
      }),
    );
  });
});
