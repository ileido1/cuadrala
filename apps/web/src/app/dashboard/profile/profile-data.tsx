'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '~/lib/api-client';
import type { ProfileUser, PlayerProfile, UserStats, UserRating } from '~/types/api';

interface ProfileDataState {
  user: ProfileUser | null;
  playerProfile: PlayerProfile | null;
  stats: UserStats | null;
  ratings: UserRating[];
  loading: {
    user: boolean;
    playerProfile: boolean;
    stats: boolean;
    ratings: boolean;
  };
  error: {
    user: boolean;
    playerProfile: boolean;
    stats: boolean;
    ratings: boolean;
  };
}

const initialState: ProfileDataState = {
  user: null,
  playerProfile: null,
  stats: null,
  ratings: [],
  loading: { user: true, playerProfile: true, stats: true, ratings: true },
  error: { user: false, playerProfile: false, stats: false, ratings: false },
};

function ProfileHeader({ user, playerProfile }: { user: ProfileUser | null; playerProfile: PlayerProfile | null }) {
  if (!user) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-32" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary-600">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
          {user.subscriptionType && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary-50 text-primary-700">
              {user.subscriptionType}
            </span>
          )}
        </div>
      </div>
      {playerProfile && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex gap-4 text-sm text-gray-500">
            {playerProfile.dominantHand && (
              <span>Mano dominante: {playerProfile.dominantHand}</span>
            )}
            {playerProfile.birthDate && (
              <span>Nacimiento: {new Date(playerProfile.birthDate).toLocaleDateString('es-AR')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCards({ stats, isLoading }: { stats: UserStats | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-16" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-16" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-16" />
        </div>
      </div>
    );
  }

  if (!stats || stats.matchesPlayed === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Partidos jugados</p>
          <p className="text-2xl font-bold text-gray-400">Sin datos aún</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Ratio de victorias</p>
          <p className="text-2xl font-bold text-gray-400">—</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Victorias / Derrotas</p>
          <p className="text-2xl font-bold text-gray-400">—</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <p className="text-sm text-gray-500 mb-1">Partidos jugados</p>
        <p className="text-2xl font-bold text-gray-900">{stats.matchesPlayed}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <p className="text-sm text-gray-500 mb-1">Ratio de victorias</p>
        <p className="text-2xl font-bold text-gray-900">{stats.winRate.toFixed(1)}%</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <p className="text-sm text-gray-500 mb-1">Victorias / Derrotas</p>
        <p className="text-2xl font-bold text-gray-900">
          {stats.matchesWon} / {stats.matchesLost}
        </p>
      </div>
    </div>
  );
}

function RatingsTable({ ratings, isLoading }: { ratings: UserRating[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded" />
          <div className="h-8 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ratings por categoría</h3>
        <p className="text-gray-400">Sin datos aún</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ratings por categoría</h3>
      <div className="space-y-2">
        {ratings.map((rating) => (
          <div
            key={rating.categoryId}
            className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
          >
            <span className="text-sm font-medium text-gray-700">{rating.categoryName}</span>
            <span className="text-sm font-semibold text-primary-600">{rating.rating}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfileData() {
  const [state, setState] = useState<ProfileDataState>(initialState);

  useEffect(() => {
    // Fetch user profile
    apiClient.profile.getMe()
      .then((res) => {
        const user = res.data as ProfileUser;
        setState((prev) => ({ ...prev, user, loading: { ...prev.loading, user: false }, error: { ...prev.error, user: false } }));

        // Fetch player profile
        apiClient.profile.getPlayerProfile()
          .then((res) => {
            const playerProfile = res.data as PlayerProfile;
            setState((prev) => ({ ...prev, playerProfile, loading: { ...prev.loading, playerProfile: false } }));
          })
          .catch(() => setState((prev) => ({ ...prev, loading: { ...prev.loading, playerProfile: false }, error: { ...prev.error, playerProfile: true } })));

        // Fetch stats and ratings using user.id
        apiClient.profile.getStats(user.id)
          .then((res) => {
            const stats = res.data as UserStats;
            setState((prev) => ({ ...prev, stats, loading: { ...prev.loading, stats: false } }));
          })
          .catch(() => setState((prev) => ({ ...prev, loading: { ...prev.loading, stats: false }, error: { ...prev.error, stats: true } })));

        apiClient.profile.getRatings(user.id)
          .then((res) => {
            const ratings = res.data as UserRating[];
            setState((prev) => ({ ...prev, ratings, loading: { ...prev.loading, ratings: false } }));
          })
          .catch(() => setState((prev) => ({ ...prev, loading: { ...prev.loading, ratings: false }, error: { ...prev.error, ratings: true } })));
      })
      .catch(() => {
        setState((prev) => ({
          ...prev,
          loading: { user: false, playerProfile: false, stats: false, ratings: false },
          error: { user: true, playerProfile: true, stats: true, ratings: true },
        }));
      });
  }, []);

  return (
    <div className="space-y-6">
      <ProfileHeader user={state.user} playerProfile={state.playerProfile} />
      <StatsCards stats={state.stats} isLoading={state.loading.stats} />
      <RatingsTable ratings={state.ratings} isLoading={state.loading.ratings} />
    </div>
  );
}
