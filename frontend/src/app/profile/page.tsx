'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authService } from '@/services/auth';
import type { ApiError, Gender } from '@/types';

// Profile form schema
const profileSchema = z.object({
  nickname: z.string().max(50, '昵称不能超过50个字符').optional().or(z.literal('')),
  bio: z.string().max(500, '个人简介不能超过500个字符').optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY', '']).optional(),
  birthday: z.string().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Gender options for select
const genderOptions: { value: Gender | ''; label: string }[] = [
  { value: '', label: '不设置' },
  { value: 'MALE', label: '男' },
  { value: 'FEMALE', label: '女' },
  { value: 'OTHER', label: '其他' },
  { value: 'PREFER_NOT_TO_SAY', label: '不愿透露' },
];

// Membership level display
const membershipLabels: Record<string, { label: string; color: string }> = {
  regular: { label: '普通会员', color: 'text-muted-foreground' },
  official: { label: '正式会员', color: 'text-primary' },
  senior: { label: '资深会员', color: 'text-accent-gold' },
  honor: { label: '荣誉会员', color: 'text-accent-pink' },
};

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const {
    isAuthorized,
    isLoading: isAuthLoading,
    isHydrated,
  } = useRouteGuard({
    requireAuth: true,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nickname: '',
      bio: '',
      gender: '',
      birthday: '',
    },
  });

  // Reset form when user data changes or editing mode changes
  useEffect(() => {
    if (user) {
      reset({
        nickname: user.displayName || '',
        bio: user.bio || '',
        gender: user.profile?.gender || '',
        birthday: user.profile?.birthday ? user.profile.birthday.split('T')[0] : '',
      });
    }
  }, [user, reset, isEditing]);

  // Handle form submission
  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setApiError(null);
    setSuccessMessage(null);

    try {
      const response = await authService.updateProfile({
        nickname: data.nickname || undefined,
        bio: data.bio || undefined,
        gender: (data.gender as Gender) || undefined,
        birthday: data.birthday || undefined,
      });

      // Update user in store
      setUser(response.user);
      setSuccessMessage('资料更新成功！');
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      const apiErr = error as ApiError;
      setApiError(apiErr.message || '更新失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle avatar file selection
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setApiError('不支持的文件类型，请上传 JPG、PNG、GIF 或 WebP 格式的图片');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setApiError('文件大小超过限制（最大 5MB）');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload avatar
    setIsUploadingAvatar(true);
    setApiError(null);

    try {
      const response = await authService.uploadAvatar(file);

      // Update user avatar in store
      if (user) {
        setUser({
          ...user,
          avatar: response.avatar.url,
        });
      }

      setSuccessMessage('头像上传成功！');
      setAvatarPreview(null);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      const apiErr = error as ApiError;
      setApiError(apiErr.message || '头像上传失败，请稍后重试');
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setApiError(null);
    if (user) {
      reset({
        nickname: user.displayName || '',
        bio: user.bio || '',
        gender: user.profile?.gender || '',
        birthday: user.profile?.birthday ? user.profile.birthday.split('T')[0] : '',
      });
    }
  };

  // Show loading state during auth check
  if (!isHydrated || isAuthLoading || !isAuthorized) {
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

  const membershipInfo = membershipLabels[user?.membershipLevel || 'regular'];

  return (
    <div className="min-h-screen bg-background">
      {/* Background decoration - 二次元风格 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-accent-pink/5 blur-3xl" />
        {/* Decorative stars */}
        <div className="absolute right-1/4 top-20 h-2 w-2 animate-pulse rounded-full bg-primary/40" />
        <div
          className="absolute left-1/3 top-40 h-1.5 w-1.5 animate-pulse rounded-full bg-secondary/40"
          style={{ animationDelay: '0.5s' }}
        />
        <div
          className="absolute bottom-1/3 right-1/3 h-2 w-2 animate-pulse rounded-full bg-accent-pink/40"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-primary transition-colors hover:text-primary/80"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            返回首页
          </Link>
          <Button variant="ghost" size="sm" onClick={logout}>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            退出登录
          </Button>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-6 rounded-xl border border-accent-green/20 bg-accent-green/10 p-4 text-sm text-accent-green-dark backdrop-blur-sm">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {successMessage}
            </div>
          </div>
        )}

        {/* API error message */}
        {apiError && (
          <div className="mb-6 rounded-xl border border-accent-red/20 bg-accent-red/10 p-4 text-sm text-accent-red backdrop-blur-sm">
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

        {/* Profile card */}
        <div className="bg-card/80 overflow-hidden rounded-2xl border border-border shadow-card backdrop-blur-xl">
          {/* Header with gradient */}
          <div className="relative h-32 bg-gradient-to-r from-primary to-secondary">
            <div className="absolute inset-0 bg-[url('/patterns/stars.svg')] opacity-20" />
          </div>

          {/* Avatar section */}
          <div className="relative px-6 pb-6">
            <div className="relative -mt-16 mb-4 flex items-end justify-between">
              {/* Avatar */}
              <div className="relative">
                <div className="relative h-28 w-28 overflow-hidden rounded-2xl border-4 border-card bg-card shadow-lg">
                  {avatarPreview || user?.avatar ? (
                    <Image
                      src={avatarPreview || user?.avatar || ''}
                      alt="头像"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-secondary text-4xl font-bold text-white">
                      {user?.displayName?.[0] || user?.username?.[0] || '?'}
                    </div>
                  )}

                  {/* Upload overlay */}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                    </div>
                  )}
                </div>

                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-lg transition-all hover:scale-105 hover:bg-primary/90 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* Edit button */}
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="rounded-xl"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  编辑资料
                </Button>
              )}
            </div>

            {/* User info display */}
            {!isEditing ? (
              <div className="space-y-6">
                {/* Name and username */}
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {user?.displayName || user?.username}
                  </h1>
                  <p className="text-muted-foreground">@{user?.username}</p>
                </div>

                {/* Bio */}
                {user?.bio && <p className="text-foreground/80">{user.bio}</p>}

                {/* Info grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Email */}
                  <div className="bg-background/50 flex items-center gap-3 rounded-xl p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <svg
                        className="h-5 w-5"
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
                    <div>
                      <p className="text-xs text-muted-foreground">邮箱</p>
                      <p className="text-sm font-medium text-foreground">{user?.email}</p>
                    </div>
                  </div>

                  {/* Membership */}
                  <div className="bg-background/50 flex items-center gap-3 rounded-xl p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">会员等级</p>
                      <p className={`text-sm font-medium ${membershipInfo.color}`}>
                        {membershipInfo.label}
                      </p>
                    </div>
                  </div>

                  {/* Gender */}
                  {user?.profile?.gender && (
                    <div className="bg-background/50 flex items-center gap-3 rounded-xl p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-pink/10 text-accent-pink">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">性别</p>
                        <p className="text-sm font-medium text-foreground">
                          {genderOptions.find((g) => g.value === user.profile?.gender)?.label ||
                            '未设置'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Birthday */}
                  {user?.profile?.birthday && (
                    <div className="bg-background/50 flex items-center gap-3 rounded-xl p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-gold/10 text-accent-gold">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">生日</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(user.profile.birthday).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* User ID */}
                <div className="bg-background/50 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">用户 ID</p>
                  <p className="text-foreground/70 font-mono text-sm">{user?.id}</p>
                </div>
              </div>
            ) : (
              /* Edit form */
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Nickname */}
                <Input
                  label="昵称"
                  placeholder="输入你的昵称"
                  error={errors.nickname?.message}
                  {...register('nickname')}
                />

                {/* Bio */}
                <div className="w-full">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    个人简介
                  </label>
                  <textarea
                    placeholder="介绍一下自己吧..."
                    rows={3}
                    className="flex w-full rounded-lg border border-border bg-background px-4 py-3 text-sm transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                    {...register('bio')}
                  />
                  {errors.bio && (
                    <p className="mt-1.5 text-sm text-accent-red">{errors.bio.message}</p>
                  )}
                </div>

                {/* Gender */}
                <div className="w-full">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">性别</label>
                  <select
                    className="flex h-11 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                    {...register('gender')}
                  >
                    {genderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Birthday */}
                <Input
                  label="生日"
                  type="date"
                  error={errors.birthday?.message}
                  {...register('birthday')}
                />

                {/* Form actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 rounded-xl"
                    isLoading={isSubmitting}
                    disabled={!isDirty}
                  >
                    保存修改
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl">✨</span>
            <div>
              <p className="text-sm font-medium text-primary">个人资料页面</p>
              <p className="mt-1 text-xs text-primary/70">
                在这里你可以查看和编辑你的个人信息，上传头像，让其他用户更好地认识你！
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
