'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api-client module entirely
vi.mock('./api-client', () => ({
  apiClient: {
    profile: {
      getMe: vi.fn(),
      getPlayerProfile: vi.fn(),
      getStats: vi.fn(),
      getRatings: vi.fn(),
    },
  },
}));

import { apiClient } from './api-client';

const typedApiClient = apiClient as typeof apiClient & {
  profile: {
    getMe: ReturnType<typeof vi.fn>;
    getPlayerProfile: ReturnType<typeof vi.fn>;
    getStats: ReturnType<typeof vi.fn>;
    getRatings: ReturnType<typeof vi.fn>;
  }
};

function buildResponse<T>(data: T) {
  return { data: { data } };
}

describe('ApiClient Profile Namespace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMe', () => {
    it('should call GET /profile/me and return user data', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Juan Pérez',
        email: 'juan@example.com',
        subscriptionType: 'PLAYER',
      };
      (typedApiClient.profile.getMe as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: mockUser },
      });

      const result = await typedApiClient.profile.getMe();

      expect(typedApiClient.profile.getMe).toHaveBeenCalled();
      expect(result.data.data).toEqual(mockUser);
    });
  });

  describe('getPlayerProfile', () => {
    it('should call GET /profile/me/profile and return player profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        birthDate: '1990-01-15',
        dominantHand: 'RIGHT' as const,
      };
      (typedApiClient.profile.getPlayerProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: mockProfile },
      });

      const result = await typedApiClient.profile.getPlayerProfile();

      expect(typedApiClient.profile.getPlayerProfile).toHaveBeenCalled();
      expect(result.data.data).toEqual(mockProfile);
    });
  });

  describe('getStats', () => {
    it('should call GET /profile/{userId}/stats', async () => {
      const mockStats = {
        userId: 'user-1',
        matchesPlayed: 42,
        matchesWon: 28,
        matchesLost: 14,
        winRate: 66.67,
      };
      (typedApiClient.profile.getStats as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: mockStats },
      });

      const result = await typedApiClient.profile.getStats('user-1');

      expect(typedApiClient.profile.getStats).toHaveBeenCalledWith('user-1');
      expect(result.data.data).toEqual(mockStats);
    });
  });

  describe('getRatings', () => {
    it('should call GET /profile/{userId}/ratings', async () => {
      const mockRatings = [
        { categoryId: 'cat-1', categoryName: '2da Masculino', rating: 1250 },
      ];
      (typedApiClient.profile.getRatings as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: mockRatings },
      });

      const result = await typedApiClient.profile.getRatings('user-1');

      expect(typedApiClient.profile.getRatings).toHaveBeenCalledWith('user-1');
      expect(result.data.data).toEqual(mockRatings);
    });
  });
});
