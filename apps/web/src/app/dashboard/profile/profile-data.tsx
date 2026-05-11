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
      <div className="card p-6 animate-pulse">
        <div className="h-20 bg-secondary-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="card p-6 animate-fade-in">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center flex-shrink-0 shadow-md">
          <span className="text-2xl sm:text-3xl font-bold text-primary-600">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-secondary-900 truncate">{user.name}</h2>
          <p className="text-sm text-secondary-500 truncate">{user.email}</p>
          {user.subscriptionType && (
            <span className="inline-block mt-3 px-3 py-1.5 text-xs font-semibold rounded-full bg-primary-50 text-primary-600">
              {user.subscriptionType}
            </span>
          )}
        </div>
      </div>
      {playerProfile && (
        <div className="mt-6 pt-5 border-t border-outline">
          <div className="flex flex-wrap gap-5 text-sm text-secondary-600">
            {playerProfile.dominantHand && (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
                {playerProfile.dominantHand}
              </span>
            )}
            {playerProfile.birthDate && (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(playerProfile.birthDate).toLocaleDateString('es-AR')}
              </span>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in stagger-1">
        <div className="card p-5 animate-pulse">
          <div className="h-4 bg-secondary-200 rounded w-28 mb-3" />
          <div className="h-9 bg-secondary-200 rounded w-16" />
        </div>
        <div className="card p-5 animate-pulse">
          <div className="h-4 bg-secondary-200 rounded w-28 mb-3" />
          <div className="h-9 bg-secondary-200 rounded w-16" />
        </div>
        <div className="card p-5 animate-pulse">
          <div className="h-4 bg-secondary-200 rounded w-28 mb-3" />
          <div className="h-9 bg-secondary-200 rounded w-16" />
        </div>
      </div>
    );
  }

  if (!stats || stats.matchesPlayed === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-secondary-500 mb-2">Partidos jugados</p>
          <p className="text-2xl font-bold text-secondary-400">Sin datos aún</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-secondary-500 mb-2">Ratio de victorias</p>
          <p className="text-2xl font-bold text-secondary-400">—</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-secondary-500 mb-2">Victorias / Derrotas</p>
          <p className="text-2xl font-bold text-secondary-400">—</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in stagger-1">
      <div className="card p-5">
        <p className="text-sm text-secondary-500 mb-2">Partidos jugados</p>
        <p className="text-3xl font-bold text-secondary-900">{stats.matchesPlayed}</p>
      </div>
      <div className="card p-5">
        <p className="text-sm text-secondary-500 mb-2">Ratio de victorias</p>
        <p className="text-3xl font-bold text-primary-500">{stats.winRate.toFixed(1)}%</p>
      </div>
      <div className="card p-5">
        <p className="text-sm text-secondary-500 mb-2">Victorias / Derrotas</p>
        <p className="text-3xl font-bold text-secondary-900">
          <span className="text-primary-500">{stats.matchesWon}</span>
          <span className="text-secondary-400 mx-1">/</span>
          <span>{stats.matchesLost}</span>
        </p>
      </div>
    </div>
  );
}

function RatingsTable({ ratings, isLoading }: { ratings: UserRating[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-5 bg-secondary-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          <div className="h-12 bg-secondary-200 rounded-xl" />
          <div className="h-12 bg-secondary-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="section-heading mb-4">Ratings por categoría</h3>
        <p className="text-secondary-400">Sin datos aún</p>
      </div>
    );
  }

  return (
    <div className="card p-5 animate-fade-in stagger-2">
      <h3 className="section-heading mb-4">Ratings por categoría</h3>
      <div className="space-y-2">
        {ratings.map((rating) => (
          <div
            key={rating.categoryId}
            className="flex justify-between items-center py-3.5 px-4 bg-surface-container rounded-xl"
          >
            <span className="text-sm font-semibold text-secondary-700">{rating.categoryName}</span>
            <span className="text-sm font-bold text-primary-500">{rating.rating}</span>
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