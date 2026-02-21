import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '@/constants';
import type { ApiResponse, ApiError } from '@/types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const authData = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (authData) {
        try {
          const { state } = JSON.parse(authData);
          if (state?.token) {
            config.headers.Authorization = `Bearer ${state.token}`;
          }
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && originalRequest) {
      // Get refresh token
      if (typeof window !== 'undefined') {
        const authData = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (authData) {
          try {
            const { state } = JSON.parse(authData);
            if (state?.refreshToken) {
              // Attempt to refresh token
              const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken: state.refreshToken,
              });

              if (refreshResponse.data?.data?.token) {
                // Update stored tokens
                const newState = {
                  ...state,
                  token: refreshResponse.data.data.token,
                  refreshToken: refreshResponse.data.data.refreshToken || state.refreshToken,
                };
                localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify({ state: newState }));

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${newState.token}`;
                return api(originalRequest);
              }
            }
          } catch {
            // Refresh failed, clear auth data
            localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            // Redirect to login if in browser
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
        }
      }
    }

    // Transform error response
    const apiError: ApiError = {
      code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
      message: error.response?.data?.error?.message || error.message || 'An error occurred',
      details: error.response?.data?.error?.details,
    };

    return Promise.reject(apiError);
  }
);

export { api };

// Helper function for typed API calls
export async function apiRequest<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  data?: unknown
): Promise<T> {
  const response = await api.request<ApiResponse<T>>({
    method,
    url,
    data: method !== 'get' ? data : undefined,
    params: method === 'get' ? data : undefined,
  });

  if (!response.data.success) {
    throw response.data.error;
  }

  return response.data.data as T;
}
