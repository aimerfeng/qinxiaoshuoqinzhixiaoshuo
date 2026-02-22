'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth';
import type { ApiError } from '@/types';

// Password validation schema
const passwordSchema = z
  .string()
  .min(8, '密码至少需要8个字符')
  .regex(/[A-Z]/, '密码需要包含至少一个大写字母')
  .regex(/[a-z]/, '密码需要包含至少一个小写字母')
  .regex(/[0-9]/, '密码需要包含至少一个数字');

// Reset password form schema
const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, '请确认密码'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Password strength indicator component
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '至少8个字符', valid: password.length >= 8 },
    { label: '包含大写字母', valid: /[A-Z]/.test(password) },
    { label: '包含小写字母', valid: /[a-z]/.test(password) },
    { label: '包含数字', valid: /[0-9]/.test(password) },
  ];

  const validCount = checks.filter((c) => c.valid).length;
  const strengthColors = ['bg-accent-red', 'bg-accent-gold', 'bg-accent-gold', 'bg-accent-green'];
  const strengthLabels = ['弱', '一般', '较强', '强'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < validCount ? strengthColors[validCount - 1] : 'bg-border'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        密码强度:{' '}
        <span className={validCount >= 3 ? 'text-accent-green' : 'text-accent-gold'}>
          {strengthLabels[validCount - 1] || '弱'}
        </span>
      </p>
      {/* Checklist */}
      <ul className="space-y-1">
        {checks.map((check) => (
          <li
            key={check.label}
            className={`flex items-center gap-2 text-xs ${
              check.valid ? 'text-accent-green' : 'text-muted-foreground'
            }`}
          >
            {check.valid ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Main reset password form component
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isInvalidToken, setIsInvalidToken] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
  });

  const password = watch('password', '');

  // Check if token exists
  useEffect(() => {
    if (!token) {
      setIsInvalidToken(true);
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setIsInvalidToken(true);
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      await authService.resetPassword({
        token,
        password: data.password,
      });
      setIsSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (error) {
      const apiErr = error as ApiError;

      // Check for invalid/expired token
      if (
        apiErr.code === 'INVALID_TOKEN' ||
        apiErr.code === 'TOKEN_EXPIRED' ||
        apiErr.message?.includes('无效') ||
        apiErr.message?.includes('过期')
      ) {
        setIsInvalidToken(true);
      } else if (apiErr.details) {
        const fieldErrors = Object.entries(apiErr.details)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('; ');
        setApiError(fieldErrors);
      } else {
        setApiError(apiErr.message || '重置密码失败，请稍后重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Eye icon for password visibility toggle
  const EyeIcon = ({ isPassword }: { isPassword: boolean }) => (
    <button
      type="button"
      className="text-muted-foreground transition-colors hover:text-foreground"
      onClick={() =>
        isPassword ? setShowPassword(!showPassword) : setShowConfirmPassword(!showConfirmPassword)
      }
      tabIndex={-1}
      aria-label={(isPassword ? showPassword : showConfirmPassword) ? '隐藏密码' : '显示密码'}
    >
      {(isPassword ? showPassword : showConfirmPassword) ? (
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

  // Invalid token state
  if (isInvalidToken) {
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">链接无效或已过期</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          密码重置链接可能已过期或无效。请重新申请密码重置。
        </p>
        <div className="space-y-3">
          <Link href="/auth/forgot-password">
            <Button className="w-full">重新申请</Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="ghost" className="w-full">
              返回登录
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
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
        <h2 className="mb-2 text-lg font-semibold text-foreground">密码重置成功</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          你的密码已成功重置。正在跳转到登录页面...
        </p>
        <Link href="/auth/login">
          <Button className="w-full">立即登录</Button>
        </Link>
      </div>
    );
  }

  // Form state
  return (
    <>
      {/* API error message */}
      {apiError && (
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
        请输入你的新密码。密码需要满足以下要求以确保账户安全。
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* New Password */}
        <div>
          <Input
            label="新密码"
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
            rightIcon={<EyeIcon isPassword={true} />}
            {...register('password')}
          />
          <PasswordStrength password={password} />
        </div>

        {/* Confirm Password */}
        <Input
          label="确认新密码"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          leftIcon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          }
          rightIcon={<EyeIcon isPassword={false} />}
          {...register('confirmPassword')}
        />

        {/* Submit button */}
        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          重置密码
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

export default function ResetPasswordPage() {
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
          <p className="mt-2 text-muted-foreground">设置你的新密码</p>
        </div>

        {/* Form card */}
        <div className="bg-card/80 rounded-xl border border-border p-8 shadow-card backdrop-blur-xl">
          <Suspense fallback={<LoadingFallback />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
