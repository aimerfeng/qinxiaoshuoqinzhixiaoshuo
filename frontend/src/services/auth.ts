import { api, apiRequest } from '@/lib/api';
import type { User, Gender } from '@/types';

// Auth API types
export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceFingerprint?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// Profile API types
export interface UpdateProfileRequest {
  nickname?: string;
  bio?: string;
  gender?: Gender;
  birthday?: string;
}

export interface UpdateProfileResponse {
  message: string;
  user: User;
}

export interface AvatarUploadResponse {
  message: string;
  avatar: {
    url: string;
    thumbnails: {
      small: string;
      medium: string;
    };
  };
}

// Auth service functions
export const authService = {
  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('post', '/auth/register', data);
  },

  /**
   * Login user
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('post', '/auth/login', data);
  },

  /**
   * Refresh access token
   */
  refreshToken: async (data: RefreshTokenRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('post', '/auth/refresh', data);
  },

  /**
   * Request password reset email
   */
  forgotPassword: async (data: ForgotPasswordRequest): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('post', '/auth/forgot-password', data);
  },

  /**
   * Reset password with token
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('post', '/auth/reset-password', data);
  },

  /**
   * Verify email with token
   */
  verifyEmail: async (data: VerifyEmailRequest): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('post', '/auth/verify-email', data);
  },

  /**
   * Resend verification email
   */
  resendVerification: async (): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('post', '/auth/resend-verification', {});
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<User> => {
    return apiRequest<User>('get', '/users/profile');
  },

  /**
   * Update current user profile
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<UpdateProfileResponse> => {
    return apiRequest<UpdateProfileResponse>('patch', '/users/profile', data);
  },

  /**
   * Upload user avatar
   */
  uploadAvatar: async (file: File): Promise<AvatarUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ success: boolean; data: AvatarUploadResponse }>(
      '/users/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.data.success) {
      throw new Error('Avatar upload failed');
    }

    return response.data.data;
  },
};
