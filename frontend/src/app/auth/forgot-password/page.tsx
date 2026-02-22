'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth';
import type { ApiError } from '@/types';

// Forgot password form schema
const forgotPasswordSchema = z.object({
  email: z.string().min(1, '请输入邮箱地址').email('请输入有效的邮箱地址'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setApiError(null);
    setIsRateLimited(false);
    setRateLimitMessage(null);

    try {
      await authService.forgotPassword({ email: data.email });
      setIsSuccess(true);
    } catch (error) {
      const apiErr = error as ApiError;

      // Check for rate limiting (HTTP 429)
      if (
        apiErr.code === 'RATE_LIMITED' ||
        apiErr.message?.includes('频繁') ||
        apiErr.message?.includes('稍后')
      ) {
        setIsRateLimited(true);
        setRateLimitMessage(apiErr.message || '请求过于频繁，请稍后再试');
      } else if (apiErr.details) {
        const fieldErrors = Object.entries(apiErr.details)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('; ');
        setApiError(fieldErrors);
      } else {
        setApiError(apiErr.message || '发送重置邮件失败，请稍后重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          <p className="mt-2 text-muted-foreground">{isSuccess ? '邮件已发送' : '找回你的密码'}</p>
        </div>

        {/* Form card */}
        <div className="bg-card/80 rounded-xl border border-border p-8 shadow-card backdrop-blur-xl">
          {isSuccess ? (
            // Success state
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">重置邮件已发送</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                我们已向 <span className="font-medium text-foreground">{getValues('email')}</span>{' '}
                发送了密码重置链接。 请查收邮件并点击链接重置密码。
              </p>
              <p className="mb-6 text-xs text-muted-foreground">
                如果没有收到邮件，请检查垃圾邮件文件夹，或稍后重试。
              </p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsSuccess(false);
                    setApiError(null);
                  }}
                >
                  重新发送
                </Button>
                <Link href="/auth/login">
                  <Button variant="ghost" className="w-full">
                    返回登录
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            // Form state
            <>
              {/* Rate limit warning */}
              {isRateLimited && rateLimitMessage && (
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {rateLimitMessage}
                  </div>
                </div>
              )}

              {/* API error message */}
              {apiError && !isRateLimited && (
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

              {/* Instructions */}
              <p className="mb-6 text-sm text-muted-foreground">
                输入你注册时使用的邮箱地址，我们将发送密码重置链接到该邮箱。
              </p>

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

                {/* Submit button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  isLoading={isLoading}
                  disabled={isRateLimited}
                >
                  发送重置链接
                </Button>
              </form>

              {/* Back to login */}
              <div className="mt-6 text-center">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  返回登录
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
