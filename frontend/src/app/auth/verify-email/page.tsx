'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth';
import type { ApiError } from '@/types';

// Verification states
type VerificationState = 'loading' | 'success' | 'error' | 'no-token';

// Main verification component
function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<VerificationState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  // Verify email on mount
  const verifyEmail = useCallback(async () => {
    if (!token) {
      setState('no-token');
      return;
    }

    setState('loading');
    setErrorMessage(null);

    try {
      await authService.verifyEmail({ token });
      setState('success');
    } catch (error) {
      const apiErr = error as ApiError;
      setState('error');

      if (apiErr.code === 'INVALID_TOKEN' || apiErr.message?.includes('无效')) {
        setErrorMessage('验证链接无效，请重新获取验证邮件');
      } else if (apiErr.code === 'TOKEN_EXPIRED' || apiErr.message?.includes('过期')) {
        setErrorMessage('验证链接已过期，请重新获取验证邮件');
      } else if (apiErr.code === 'ALREADY_VERIFIED' || apiErr.message?.includes('已验证')) {
        setErrorMessage('邮箱已验证，无需重复验证');
      } else {
        setErrorMessage(apiErr.message || '验证失败，请稍后重试');
      }
    }
  }, [token]);

  useEffect(() => {
    verifyEmail();
  }, [verifyEmail]);

  // Countdown and redirect on success
  useEffect(() => {
    if (state !== 'success') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/auth/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, router]);

  // Handle resend verification email
  const handleResend = async () => {
    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      await authService.resendVerification();
      setResendSuccess(true);
    } catch (error) {
      const apiErr = error as ApiError;
      if (apiErr.code === 'RATE_LIMITED' || apiErr.message?.includes('频繁')) {
        setResendError('请求过于频繁，请稍后再试');
      } else {
        setResendError(apiErr.message || '发送失败，请稍后重试');
      }
    } finally {
      setIsResending(false);
    }
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <svg
            className="h-12 w-12 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">正在验证邮箱...</h2>
        <p className="text-sm text-muted-foreground">请稍候，我们正在验证你的邮箱地址</p>
      </div>
    );
  }

  // No token state
  if (state === 'no-token') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-gold/10">
          <svg
            className="h-8 w-8 text-accent-gold"
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
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">缺少验证令牌</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          请通过邮件中的链接访问此页面，或重新获取验证邮件。
        </p>
        <div className="space-y-3">
          <Button onClick={handleResend} className="w-full" isLoading={isResending}>
            重新发送验证邮件
          </Button>
          <Link href="/auth/login">
            <Button variant="ghost" className="w-full">
              返回登录
            </Button>
          </Link>
        </div>
        {resendSuccess && <p className="mt-4 text-sm text-accent-green">验证邮件已发送，请查收</p>}
        {resendError && <p className="mt-4 text-sm text-accent-red">{resendError}</p>}
      </div>
    );
  }

  // Success state
  if (state === 'success') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-green/10">
          <svg
            className="h-8 w-8 text-accent-green"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">邮箱验证成功！</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          你的邮箱已成功验证，现在可以使用完整功能了。
        </p>
        <p className="mb-6 text-sm text-muted-foreground">
          <span className="font-medium text-primary">{countdown}</span> 秒后自动跳转到登录页面...
        </p>
        <Link href="/auth/login">
          <Button className="w-full">立即登录</Button>
        </Link>
      </div>
    );
  }

  // Error state
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-red/10">
        <svg
          className="h-8 w-8 text-accent-red"
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
      </div>
      <h2 className="mb-2 text-lg font-semibold text-foreground">验证失败</h2>
      <p className="mb-6 text-sm text-muted-foreground">{errorMessage}</p>
      <div className="space-y-3">
        <Button onClick={handleResend} className="w-full" isLoading={isResending}>
          重新发送验证邮件
        </Button>
        <Link href="/auth/login">
          <Button variant="ghost" className="w-full">
            返回登录
          </Button>
        </Link>
      </div>
      {resendSuccess && <p className="mt-4 text-sm text-accent-green">验证邮件已发送，请查收</p>}
      {resendError && <p className="mt-4 text-sm text-accent-red">{resendError}</p>}
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-8">
      <svg
        className="h-8 w-8 animate-spin text-primary"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

export default function VerifyEmailPage() {
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
          <p className="mt-2 text-muted-foreground">邮箱验证</p>
        </div>

        {/* Content card */}
        <div className="bg-card/80 rounded-xl border border-border p-8 shadow-card backdrop-blur-xl">
          <Suspense fallback={<LoadingFallback />}>
            <VerifyEmailContent />
          </Suspense>
        </div>

        {/* Help text */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          遇到问题？{' '}
          <Link href="/help" className="text-primary hover:underline">
            联系客服
          </Link>
        </p>
      </div>
    </div>
  );
}
