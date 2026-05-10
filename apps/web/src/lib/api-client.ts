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
    pendingTransactions: (
      venueId: string,
      params?: { from?: string; to?: string; matchId?: string }
    ) =>
      this.client.get(`/venues/${venueId}/transactions/pending`, {
        params,
      }),
    transactions: {
      confirm: (venueId: string, transactionId: string) =>
        this.client.patch(`/venues/${venueId}/transactions/${transactionId}/confirm`),
    },
    upcomingMatches: (id: string) =>
      this.client.get(`/venues/${id}/matches?upcoming=true`),
    matches: {
      list: (
        venueId: string,
        params?: { courtId?: string; date?: string; status?: string; page?: number; limit?: number }
      ) =>
        this.client.get(`/venues/${venueId}/matches`, { params }),
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
  };

  readonly matches = {
    list: (params?: { courtId?: string; date?: string; status?: string; page?: number; limit?: number }) =>
      this.client.get('/matches', { params }),
    get: (matchId: string) => this.client.get(`/matches/${matchId}`),
  };

  get instance(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiClient();
export default apiClient;