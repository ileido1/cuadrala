import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const API_BASE_PATH = process.env.NEXT_PUBLIC_API_BASE_PATH ?? '/api/v1/';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}${API_BASE_PATH}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('accessToken');
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await axios.post(
              `${API_URL}${API_BASE_PATH}auth/refresh`,
              { refreshToken }
            );

            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');

            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  readonly auth = {
    login: (email: string, password: string) =>
      this.client.post('/auth/login', { email, password }),

    refresh: (refreshToken: string) =>
      this.client.post('/auth/refresh', { refreshToken }),

    logout: (refreshToken: string) =>
      this.client.post('/auth/logout', { refreshToken }),

    register: (email: string, password: string, name: string) =>
      this.client.post('/auth/register', { email, password, name }),
  };

  readonly venues = {
    list: () => this.client.get('/venues'),
    get: (id: string) => this.client.get(`/venues/${id}`),
    dashboardStats: (venueId: string) =>
      this.client.get(`/venues/${venueId}/dashboard-stats`),
    pendingTransactions: (
      venueId: string,
      params?: { from?: string; to?: string; matchId?: string }
    ) =>
      this.client.get(`/venues/${venueId}/transactions/pending`, {
        params,
      }),
    transactions: {
      stats: (venueId: string) =>
        this.client.get(`/venues/${venueId}/transactions/stats`),
      history: (venueId: string, page?: number) =>
        this.client.get(`/venues/${venueId}/transactions/history`, {
          params: page ? { page } : {},
        }),
      confirm: (venueId: string, transactionId: string) =>
        this.client.patch(`/venues/${venueId}/transactions/${transactionId}/confirm`),
    },
    update: (venueId: string, data: unknown) =>
      this.client.patch(`/venues/${venueId}`, data),
    upcomingMatches: (id: string) =>
      this.client.get(`/venues/${id}/matches?upcoming=true`),
    matches: {
      list: (
        venueId: string,
        params?: { courtId?: string; date?: string; from?: string; to?: string; status?: string; page?: number; limit?: number }
      ) =>
        this.client.get(`/venues/${venueId}/matches`, { params }),
    },
    reservations: {
      list: (
        venueId: string,
        params?: { courtId?: string; date?: string; from?: string; to?: string; page?: number; limit?: number }
      ) =>
        this.client.get(`/venues/${venueId}/reservations`, { params }),
      create: (venueId: string, data: {
        courtId: string;
        sportId?: string;
        categoryId?: string;
        scheduledAt: string;
        durationMinutes: number;
        notes?: string;
      }) =>
        this.client.post(`/venues/${venueId}/reservations`, data),
      cancel: (venueId: string, reservationId: string) =>
        this.client.delete(`/venues/${venueId}/reservations/${reservationId}`),
    },
    slots: {
      block: (venueId: string, courtId: string, data: {
        date: string;
        startTime: string;
        durationMinutes: number;
        notes?: string;
      }) =>
        this.client.post(`/venues/${venueId}/courts/${courtId}/slots/block`, data),
      unblock: (venueId: string, courtId: string, data: {
        date: string;
        startTime: string;
      }) =>
        this.client.delete(`/venues/${venueId}/courts/${courtId}/slots/block`, { data }),
    },
    courts: {
      list: (venueId: string, params?: { status?: 'ACTIVE' | 'INACTIVE' }) =>
        this.client.get(`/venues/${venueId}/courts`, { params }),
      create: (venueId: string, data: { name: string; sportType?: string; indoor?: boolean; lighting?: boolean; surfaceType?: string | null }) =>
        this.client.post(`/venues/${venueId}/courts`, data),
      update: (venueId: string, courtId: string, data: { name?: string; sportType?: string; indoor?: boolean; lighting?: boolean; surfaceType?: string | null }) =>
        this.client.put(`/venues/${venueId}/courts/${courtId}`, data),
      cancel: (venueId: string, courtId: string) =>
        this.client.delete(`/venues/${venueId}/courts/${courtId}`),
      slots: (venueId: string, courtId: string, params: { date: string; durationMinutes?: number; stepMinutes?: number; sportId?: string; categoryId?: string }) =>
        this.client.get(`/venues/${venueId}/courts/${courtId}/slots`, { params }),
    },
  };

  readonly tournaments = {
    list: (params?: { status?: string; sportId?: string; categoryId?: string; page?: number; limit?: number }) =>
      this.client.get('/tournaments', { params }),
    get: (id: string) => this.client.get(`/tournaments/${id}`),
    byVenue: (venueId: string, params?: { status?: string; sportId?: string; categoryId?: string; page?: number; limit?: number }) =>
      this.client.get(`/tournaments/venue/${venueId}`, { params }),
    bracket: (tournamentId: string) => this.client.get(`/tournaments/${tournamentId}/bracket`),
    submitMatchResult: (tournamentId: string, matchId: string, scores: { userId: string; points: number }[]) =>
      this.client.post(`/tournaments/${tournamentId}/matches/${matchId}/results`, { scores }),
    updateStatus: (tournamentId: string, status: string) =>
      this.client.patch(`/tournaments/${tournamentId}/status`, { status }),
    chat: {
      messages: (tournamentId: string, params?: { limit?: number; cursorCreatedAt?: string }) =>
        this.client.get(`/tournaments/${tournamentId}/chat/messages`, { params }),
    },
  };

  readonly matches = {
    list: (params?: { courtId?: string; date?: string; status?: string; page?: number; limit?: number }) =>
      this.client.get('/matches', { params }),
    get: (matchId: string) => this.client.get(`/matches/${matchId}`),
    chat: {
      messages: (matchId: string, params?: { limit?: number; cursorCreatedAt?: string }) =>
        this.client.get(`/matches/${matchId}/chat/messages`, { params }),
    },
  };

  readonly profile = {
    getMe: () => this.client.get('/profile/me'),
    getPlayerProfile: () => this.client.get('/profile/me/profile'),
    getStats: (userId: string) => this.client.get(`/profile/${userId}/stats`),
    getRatings: (userId: string) => this.client.get(`/profile/${userId}/ratings`),
  };

  get instance(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
