import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '@/constants';
import type { ApiResponse, ApiError } from '@/types';

// 全局 Token 刷新管理 - 确保同一时间只有一个刷新请求
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * 获取当前存储的 auth 状态
 */
function getStoredAuthState() {
  if (typeof window === 'undefined') {
    return { token: null, refreshToken: null, state: null };
  }
  
  try {
    const authData = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (authData) {
      const { state } = JSON.parse(authData);
      return {
        token: state?.token || null,
        refreshToken: state?.refreshToken || null,
        state,
      };
    }
  } catch {
    // JSON parse failed
  }
  
  return { token: null, refreshToken: null, state: null };
}

/**
 * 更新存储的 auth 状态
 */
function updateStoredAuthState(newToken: string, newRefreshToken: string, user?: unknown) {
  if (typeof window === 'undefined') return;
  
  try {
    const authData = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (authData) {
      const { state } = JSON.parse(authData);
      const newState = {
        ...state,
        token: newToken,
        refreshToken: newRefreshToken,
        isAuthenticated: true,
      };
      if (user) {
        newState.user = user;
      }
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify({ state: newState }));
    }
  } catch {
    // Ignore errors
  }
}

/**
 * 清除存储的 auth 状态
 */
function clearStoredAuthState() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
}

/**
 * 全局 Token 刷新函数
 * 所有并发的 401 请求都会等待同一个 promise
 */
async function doRefreshToken(): Promise<string | null> {
  const { refreshToken } = getStoredAuthState();
  
  if (!refreshToken) {
    return null;
  }
  
  // 如果已经在刷新中，等待现有的 promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  
  // 设置刷新锁
  isRefreshing = true;
  
  refreshPromise = (async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });
      
      if (response.data?.data?.accessToken) {
        const newToken = response.data.data.accessToken;
        const newRefreshToken = response.data.data.refreshToken || refreshToken;
        const user = response.data.data.user;
        
        updateStoredAuthState(newToken, newRefreshToken, user);
        return newToken;
      }
      
      throw new Error('Invalid refresh response');
    } catch {
      clearStoredAuthState();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

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
    const { token } = getStoredAuthState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

    if (error.response?.status === 401 && originalRequest) {
      // 所有 401 请求都等待同一个刷新 promise
      const newToken = await doRefreshToken();
      
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } else {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
          window.location.href = '/auth/login';
        }
      }
    }

    const apiError: ApiError = {
      code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
      message: error.response?.data?.error?.message || error.message || 'An error occurred',
      details: error.response?.data?.error?.details,
    };

    return Promise.reject(apiError);
  }
);

export { api };
export { doRefreshToken as refreshAccessToken };

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
