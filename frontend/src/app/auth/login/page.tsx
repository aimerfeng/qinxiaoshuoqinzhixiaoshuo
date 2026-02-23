'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/store/auth';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import type { ApiError } from '@/types';

// Login form schema
const loginSchema = z.object({
  email: z.string().min(1, '请输入邮箱地址').email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuthStore();
  const {
    redirectAfterLogin,
    isLoading: isAuthLoading,
    isHydrated,
  } = useRouteGuard({
    redirectIfAuthenticated: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  // Check for redirect URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = sessionStorage.getItem('anima_redirect_url');
      if (url) {
        setRedirectUrl(url);
      }
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setApiError(null);
    setIsLocked(false);
    setLockoutMessage(null);

    try {
      const response = await authService.login({
        email: data.email,
        password: data.password,
      });

      // Store tokens and user info
      login(response.user, response.accessToken, response.refreshToken);

      // Redirect to saved URL or default
      redirectAfterLogin();
    } catch (error) {
      const apiErr = error as ApiError;

      // Check for account lockout
      if (apiErr.code === 'ACCOUNT_LOCKED' || apiErr.message?.includes('锁定')) {
        setIsLocked(true);
        setLockoutMessage(apiErr.message || '账户已被临时锁定，请15分钟后重试');
      } else if (apiErr.details) {
        const fieldErrors = Object.entries(apiErr.details)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('; ');
        setApiError(fieldErrors);
      } else {
        setApiError(apiErr.message || '登录失败，请检查邮箱和密码');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Eye icon for password visibility toggle
  const EyeIcon = () => (
    <button
      type="button"
      className="text-muted-foreground transition-colors hover:text-foreground"
      onClick={() => setShowPassword(!showPassword)}
      tabIndex={-1}
      aria-label={showPassword ? '隐藏密码' : '显示密码'}
    >
      {showPassword ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      )}
    </button>
  );

  // Show loading state during auth check
  if (!isHydrated || isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
        </div>
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
          </div>
          <p className="text-sm text-muted-foreground">正在验证身份...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-pink/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo and title */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <h1 className="gradient-text text-3xl font-bold">Project Anima</h1>
          </Link>
          <p className="mt-2 text-muted-foreground">欢迎回来，继续你的创作之旅</p>
        </div>

        {/* Login form card */}
        <div className="bg-card/80 rounded-xl border border-border p-8 shadow-card backdrop-blur-xl">
          {/* Redirect message */}
          {redirectUrl && (
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                请先登录以继续访问
              </div>
            </div>
          )}

          {/* Account lockout warning */}
          {isLocked && lockoutMessage && (
            <div className="mb-6 rounded-lg border border-accent-gold/20 bg-accent-gold/10 p-4 text-sm text-accent-gold-dark">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {lockoutMessage}
              </div>
            </div>
          )}

          {/* API error message */}
          {apiError && !isLocked && (
            <div className="mb-6 rounded-lg border border-accent-red/20 bg-accent-red/10 p-4 text-sm text-accent-red">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {apiError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <Input
              label="邮箱地址"
              type="email"
              placeholder="your@email.com"
              error={errors.email?.message}
              leftIcon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              }
              {...register('email')}
            />

            {/* Password */}
            <Input
              label="密码"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              error={errors.password?.message}
              leftIcon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              }
              rightIcon={<EyeIcon />}
              {...register('password')}
            />

            {/* Remember me and Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary/50 focus:ring-offset-0"
                  {...register('rememberMe')}
                />
                <span className="text-sm text-muted-foreground">记住我</span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary transition-colors hover:text-primary/80"
              >
                忘记密码？
              </Link>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              disabled={isLocked}
            >
              登录
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">或</span>
            </div>
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-muted-foreground">
            还没有账户？{' '}
            <Link
              href="/auth/register"
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              立即注册
            </Link>
          </p>
        </div>

        {/* Terms */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          登录即表示你同意我们的{' '}
          <Link href="/terms" className="text-primary hover:underline">
            服务条款
          </Link>{' '}
          和{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            隐私政策
          </Link>
        </p>
      </div>
    </div>
  );
}
