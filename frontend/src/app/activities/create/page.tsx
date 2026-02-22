'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  ChevronLeft,
  Calendar,
  Users,
  Coins,
  BookOpen,
  MessageSquare,
  Quote,
  Trophy,
  AlertCircle,
  Check,
  Send,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { activityService } from '@/services/activity';
import type {
  ActivityType,
  ActivityRules,
  CreateActivityRequest,
} from '@/types/activity';
import {
  ACTIVITY_TYPE_NAMES,
  ACTIVITY_TYPE_DESCRIPTIONS,
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_LIMITS,
} from '@/types/activity';

/**
 * 创建活动表单页面
 *
 * 需求16: 社区活动系统
 * 任务16.2.3: 创建活动表单
 */

// 活动类型列表
const ACTIVITY_TYPES: ActivityType[] = [
  'READING_CHALLENGE',
  'WRITING_CONTEST',
  'COMMUNITY_EVENT',
  'SPECIAL_EVENT',
];

// 表单步骤
type FormStep = 'basic' | 'rules' | 'reward' | 'preview';

const FORM_STEPS: { key: FormStep; label: string }[] = [
  { key: 'basic', label: '基本信息' },
  { key: 'rules', label: '活动规则' },
  { key: 'reward', label: '奖励设置' },
  { key: 'preview', label: '预览提交' },
];

// 表单数据接口
interface FormData {
  title: string;
  description: string;
  type: ActivityType;
  coverImage: string;
  startTime: string;
  endTime: string;
  maxParticipants: number | null;
  rewardPerPerson: number;
  rules: ActivityRules;
}

// 表单错误接口
interface FormErrors {
  title?: string;
  description?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  maxParticipants?: string;
  rewardPerPerson?: string;
  rules?: string;
}

// 初始表单数据
const initialFormData: FormData = {
  title: '',
  description: '',
  type: 'READING_CHALLENGE',
  coverImage: '',
  startTime: '',
  endTime: '',
  maxParticipants: 100,
  rewardPerPerson: 10,
  rules: {},
};

// 格式化日期为 datetime-local 输入格式
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// 格式化日期显示
function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

// 计算活动时长（天）
function calculateDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// 计算总奖池
function calculateTotalPool(maxParticipants: number | null, rewardPerPerson: number): number {
  if (!maxParticipants) return 0;
  return maxParticipants * rewardPerPerson;
}

// 获取活动类型图标组件
function getActivityTypeIcon(type: ActivityType) {
  switch (type) {
    case 'READING_CHALLENGE':
      return <BookOpen className="w-5 h-5" />;
    case 'WRITING_CONTEST':
      return <MessageSquare className="w-5 h-5" />;
    case 'COMMUNITY_EVENT':
      return <Quote className="w-5 h-5" />;
    default:
      return <Trophy className="w-5 h-5" />;
  }
}

export default function CreateActivityPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();

  // 表单状态
  const [currentStep, setCurrentStep] = useState<FormStep>('basic');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 初始化默认时间
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    setFormData(prev => ({
      ...prev,
      startTime: formatDateTimeLocal(tomorrow),
      endTime: formatDateTimeLocal(nextWeek),
    }));
  }, []);

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/activities/create');
    }
  }, [authLoading, isAuthenticated, router]);

  // 更新表单字段
  const updateField = useCallback(<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // 更新规则字段
  const updateRules = useCallback(<K extends keyof ActivityRules>(
    field: K,
    value: ActivityRules[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      rules: { ...prev.rules, [field]: value },
    }));
  }, []);

  // 验证基本信息
  const validateBasicInfo = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = '请输入活动名称';
    } else if (formData.title.length < ACTIVITY_LIMITS.TITLE_MIN_LENGTH) {
      newErrors.title = `活动名称至少需要 ${ACTIVITY_LIMITS.TITLE_MIN_LENGTH} 个字符`;
    } else if (formData.title.length > ACTIVITY_LIMITS.TITLE_MAX_LENGTH) {
      newErrors.title = `活动名称不能超过 ${ACTIVITY_LIMITS.TITLE_MAX_LENGTH} 个字符`;
    }

    if (!formData.description.trim()) {
      newErrors.description = '请输入活动描述';
    } else if (formData.description.length < ACTIVITY_LIMITS.DESCRIPTION_MIN_LENGTH) {
      newErrors.description = `活动描述至少需要 ${ACTIVITY_LIMITS.DESCRIPTION_MIN_LENGTH} 个字符`;
    } else if (formData.description.length > ACTIVITY_LIMITS.DESCRIPTION_MAX_LENGTH) {
      newErrors.description = `活动描述不能超过 ${ACTIVITY_LIMITS.DESCRIPTION_MAX_LENGTH} 个字符`;
    }

    if (!formData.startTime) {
      newErrors.startTime = '请选择开始时间';
    }

    if (!formData.endTime) {
      newErrors.endTime = '请选择结束时间';
    }

    if (formData.startTime && formData.endTime) {
      const duration = calculateDuration(formData.startTime, formData.endTime);
      if (duration < ACTIVITY_LIMITS.MIN_DURATION_DAYS) {
        newErrors.endTime = `活动时长至少需要 ${ACTIVITY_LIMITS.MIN_DURATION_DAYS} 天`;
      } else if (duration > ACTIVITY_LIMITS.MAX_DURATION_DAYS) {
        newErrors.endTime = `活动时长不能超过 ${ACTIVITY_LIMITS.MAX_DURATION_DAYS} 天`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // 验证规则配置
  const validateRules = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (formData.type === 'READING_CHALLENGE') {
      if (!formData.rules.targetChapterCount || formData.rules.targetChapterCount < 1) {
        newErrors.rules = '请设置目标章节数（至少1章）';
      }
    } else if (formData.type === 'WRITING_CONTEST') {
      if (!formData.rules.minCommentLength || formData.rules.minCommentLength < 10) {
        newErrors.rules = '请设置最小评论字数（至少10字）';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // 验证奖励设置
  const validateReward = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (formData.maxParticipants !== null) {
      if (formData.maxParticipants < ACTIVITY_LIMITS.MIN_PARTICIPANTS) {
        newErrors.maxParticipants = `参与人数不能少于 ${ACTIVITY_LIMITS.MIN_PARTICIPANTS} 人`;
      } else if (formData.maxParticipants > ACTIVITY_LIMITS.MAX_PARTICIPANTS) {
        newErrors.maxParticipants = `参与人数不能超过 ${ACTIVITY_LIMITS.MAX_PARTICIPANTS} 人`;
      }
    }

    if (formData.rewardPerPerson < ACTIVITY_LIMITS.MIN_REWARD_PER_PERSON) {
      newErrors.rewardPerPerson = `单人奖励不能少于 ${ACTIVITY_LIMITS.MIN_REWARD_PER_PERSON} 零芥子`;
    } else if (formData.rewardPerPerson > ACTIVITY_LIMITS.MAX_REWARD_PER_PERSON) {
      newErrors.rewardPerPerson = `单人奖励不能超过 ${ACTIVITY_LIMITS.MAX_REWARD_PER_PERSON} 零芥子`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // 下一步
  const handleNext = useCallback(() => {
    let isValid = false;
    
    switch (currentStep) {
      case 'basic':
        isValid = validateBasicInfo();
        if (isValid) setCurrentStep('rules');
        break;
      case 'rules':
        isValid = validateRules();
        if (isValid) setCurrentStep('reward');
        break;
      case 'reward':
        isValid = validateReward();
        if (isValid) setCurrentStep('preview');
        break;
    }
  }, [currentStep, validateBasicInfo, validateRules, validateReward]);

  // 上一步
  const handlePrev = useCallback(() => {
    switch (currentStep) {
      case 'rules':
        setCurrentStep('basic');
        break;
      case 'reward':
        setCurrentStep('rules');
        break;
      case 'preview':
        setCurrentStep('reward');
        break;
    }
  }, [currentStep]);

  // 提交表单
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const request: CreateActivityRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        rewardPerPerson: formData.rewardPerPerson,
        rules: formData.rules,
      };

      if (formData.coverImage) {
        request.coverImage = formData.coverImage;
      }

      if (formData.maxParticipants !== null) {
        request.maxParticipants = formData.maxParticipants;
      }

      const response = await activityService.createActivity(request);

      if (response.data.success && response.data.activityId) {
        router.push(`/activities/${response.data.activityId}`);
      } else {
        setSubmitError(response.data.message || '创建活动失败');
      }
    } catch (error: unknown) {
      console.error('Failed to create activity:', error);
      const err = error as { response?: { data?: { message?: string } } };
      setSubmitError(err.response?.data?.message || '创建活动失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 计算总奖池
  const totalPool = calculateTotalPool(formData.maxParticipants, formData.rewardPerPerson);
  const duration = calculateDuration(formData.startTime, formData.endTime);
  const typeColors = ACTIVITY_TYPE_COLORS[formData.type];

  // 加载中
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // 未登录
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pb-20">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              创建活动
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              发起社区活动，激励读者参与互动
            </p>
          </div>
        </motion.div>

        {/* 步骤指示器 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((step, index) => {
              const stepIndex = FORM_STEPS.findIndex(s => s.key === currentStep);
              const isActive = step.key === currentStep;
              const isCompleted = index < stepIndex;

              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                        transition-all duration-300
                        ${isCompleted
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                          : isActive
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white ring-4 ring-indigo-500/20'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }
                      `}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {index < FORM_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* 表单内容 */}
        <AnimatePresence mode="wait">
          {/* 步骤1: 基本信息 */}
          {currentStep === 'basic' && (
            <motion.div
              key="basic"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* 活动类型选择 */}
              <div className="p-6 rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  选择活动类型
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {ACTIVITY_TYPES.map((type) => {
                    const colors = ACTIVITY_TYPE_COLORS[type];
                    const isSelected = formData.type === type;
                    
                    return (
                      <button
                        key={type}
                        onClick={() => updateField('type', type)}
                        className={`
                          p-4 rounded-xl border-2 text-left transition-all duration-200
                          ${isSelected
                            ? `${colors.bg} ${colors.border} ring-2 ring-offset-2 ring-indigo-500/30`
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{ACTIVITY_TYPE_ICONS[type]}</span>
                          <span className={`font-medium ${isSelected ? colors.text : 'text-gray-900 dark:text-white'}`}>
                            {ACTIVITY_TYPE_NAMES[type]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {ACTIVITY_TYPE_DESCRIPTIONS[type]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 活动名称和描述 */}
              <div className="p-6 rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 shadow-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    活动名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="输入活动名称（4-30字符）"
                    maxLength={ACTIVITY_LIMITS.TITLE_MAX_LENGTH}
                    className={`
                      w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-800
                      text-gray-900 dark:text-white placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all
                      ${errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                    `}
                  />
                  <div className="flex justify-between mt-1">
                    {errors.title && (
                      <span className="text-xs text-red-500">{errors.title}</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">
                      {formData.title.length}/{ACTIVITY_LIMITS.TITLE_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    活动描述 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="详细描述活动规则和参与方式（10-500字符）"
                    maxLength={ACTIVITY_LIMITS.DESCRIPTION_MAX_LENGTH}
                    rows={4}
                    className={`
                      w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-800
                      text-gray-900 dark:text-white placeholder-gray-400 resize-none
                      focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all
                      ${errors.description ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                    `}
                  />
                  <div className="flex justify-between mt-1">
                    {errors.description && (
                      <span className="text-xs text-red-500">{errors.description}</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">
                      {formData.description.length}/{ACTIVITY_LIMITS.DESCRIPTION_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                {/* 封面图片 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    封面图片（可选）
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      value={formData.coverImage}
                      onChange={(e) => updateField('coverImage', e.target.value)}
                      placeholder="输入图片URL"
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                    {formData.coverImage && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                        <img
                          src={formData.coverImage}
                          alt="封面预览"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 时间设置 */}
              <div className="p-6 rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  活动时间
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      开始时间 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => updateField('startTime', e.target.value)}
                      className={`
                        w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-800
                        text-gray-900 dark:text-white
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all
                        ${errors.startTime ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                      `}
                    />
                    {errors.startTime && (
                      <span className="text-xs text-red-500 mt-1 block">{errors.startTime}</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      结束时间 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => updateField('endTime', e.target.value)}
                      className={`
                        w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-800
                        text-gray-900 dark:text-white
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all
                        ${errors.endTime ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                      `}
                    />
                    {errors.endTime && (
                      <span className="text-xs text-red-500 mt-1 block">{errors.endTime}</span>
                    )}
                  </div>
                </div>
                {duration > 0 && (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    活动时长: <span className="font-medium text-indigo-600 dark:text-indigo-400">{duration} 天</span>
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* 步骤2: 活动规则 */}
          {currentStep === 'rules' && (
            <motion.div
              key="rules"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-3 rounded-xl ${typeColors.bg}`}>
                    {getActivityTypeIcon(formData.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {ACTIVITY_TYPE_NAMES[formData.type]} 规则配置
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {ACTIVITY_TYPE_DESCRIPTIONS[formData.type]}
                    </p>
                  </div>
                </div>

                {/* 阅读打卡规则 */}
                {formData.type === 'READING_CHALLENGE' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        目标作品ID（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.rules.targetWorkId || ''}
                        onChange={(e) => updateRules('targetWorkId', e.target.value || undefined)}
                        placeholder="留空则不限制作品"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        目标章节数 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={formData.rules.targetChapterCount || ''}
                        onChange={(e) => updateRules('targetChapterCount', parseInt(e.target.value) || undefined)}
                        placeholder="参与者需要阅读的章节数"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* 评论征集规则 */}
                {formData.type === 'WRITING_CONTEST' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        目标作品ID（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.rules.targetWorkId || ''}
                        onChange={(e) => updateRules('targetWorkId', e.target.value || undefined)}
                        placeholder="留空则不限制作品"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        最小评论字数 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={1000}
                        value={formData.rules.minCommentLength || ''}
                        onChange={(e) => updateRules('minCommentLength', parseInt(e.target.value) || undefined)}
                        placeholder="评论需要达到的最小字数"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* 引用挑战规则 */}
                {formData.type === 'COMMUNITY_EVENT' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        目标作品ID（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.rules.targetWorkId || ''}
                        onChange={(e) => updateRules('targetWorkId', e.target.value || undefined)}
                        placeholder="留空则不限制作品"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        目标段落ID（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.rules.targetParagraphId || ''}
                        onChange={(e) => updateRules('targetParagraphId', e.target.value || undefined)}
                        placeholder="指定需要引用的段落"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* 官方活动规则 */}
                {formData.type === 'SPECIAL_EVENT' && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">官方活动</span>
                    </div>
                    <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                      官方活动由平台运营发起，普通用户无法创建此类型活动。
                    </p>
                  </div>
                )}

                {/* 自定义规则 */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    其他规则说明（可选）
                  </label>
                  <textarea
                    value={formData.rules.customRules || ''}
                    onChange={(e) => updateRules('customRules', e.target.value || undefined)}
                    placeholder="补充说明活动的其他规则或注意事项"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>

                {errors.rules && (
                  <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {errors.rules}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 步骤3: 奖励设置 */}
          {currentStep === 'reward' && (
            <motion.div
              key="reward"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  奖励配置
                </h3>

                <div className="space-y-6">
                  {/* 参与人数上限 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Users className="w-4 h-4 inline mr-1" />
                      参与人数上限
                    </label>
                    <input
                      type="number"
                      min={ACTIVITY_LIMITS.MIN_PARTICIPANTS}
                      max={ACTIVITY_LIMITS.MAX_PARTICIPANTS}
                      value={formData.maxParticipants || ''}
                      onChange={(e) => updateField('maxParticipants', parseInt(e.target.value) || null)}
                      placeholder={`${ACTIVITY_LIMITS.MIN_PARTICIPANTS}-${ACTIVITY_LIMITS.MAX_PARTICIPANTS} 人`}
                      className={`
                        w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-800
                        text-gray-900 dark:text-white placeholder-gray-400
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all
                        ${errors.maxParticipants ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                      `}
                    />
                    {errors.maxParticipants && (
                      <span className="text-xs text-red-500 mt-1 block">{errors.maxParticipants}</span>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      留空表示不限制参与人数
                    </p>
                  </div>

                  {/* 单人奖励 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Coins className="w-4 h-4 inline mr-1" />
                      单人奖励 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={ACTIVITY_LIMITS.MIN_REWARD_PER_PERSON}
                        max={ACTIVITY_LIMITS.MAX_REWARD_PER_PERSON}
                        value={formData.rewardPerPerson}
                        onChange={(e) => updateField('rewardPerPerson', parseInt(e.target.value) || ACTIVITY_LIMITS.MIN_REWARD_PER_PERSON)}
                        className={`
                          w-full px-4 py-3 pr-16 rounded-xl border bg-white dark:bg-gray-800
                          text-gray-900 dark:text-white
                          focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all
                          ${errors.rewardPerPerson ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                        `}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                        零芥子
                      </span>
                    </div>
                    {errors.rewardPerPerson && (
                      <span className="text-xs text-red-500 mt-1 block">{errors.rewardPerPerson}</span>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      每位完成活动的参与者将获得的奖励（{ACTIVITY_LIMITS.MIN_REWARD_PER_PERSON}-{ACTIVITY_LIMITS.MAX_REWARD_PER_PERSON} 零芥子）
                    </p>
                  </div>
                </div>

                {/* 奖池预览 */}
                {formData.maxParticipants && (
                  <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
                    <h4 className="font-medium text-amber-700 dark:text-amber-300 mb-3">奖池预览</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {formData.maxParticipants}
                        </p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70">最大参与人数</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {formData.rewardPerPerson}
                        </p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70">单人奖励</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {totalPool}
                        </p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70">总奖池</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-amber-600/80 dark:text-amber-400/80 text-center">
                      创建活动时将从您的零芥子余额中锁定 {totalPool} 零芥子作为奖池
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 步骤4: 预览提交 */}
          {currentStep === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* 活动预览卡片 */}
              <div className="rounded-2xl overflow-hidden bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 shadow-lg">
                {/* 封面 */}
                <div className="relative h-48 overflow-hidden">
                  {formData.coverImage ? (
                    <img
                      src={formData.coverImage}
                      alt={formData.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <span className="text-6xl opacity-30">{ACTIVITY_TYPE_ICONS[formData.type]}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${typeColors.bg} ${typeColors.text} backdrop-blur-sm`}>
                      {ACTIVITY_TYPE_NAMES[formData.type]}
                    </span>
                    <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 backdrop-blur-sm">
                      待审核
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-xl font-bold text-white mb-1">{formData.title}</h2>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-medium">
                        {(user?.displayName || user?.username || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white/80 text-sm">{user?.displayName || user?.username}</span>
                    </div>
                  </div>
                </div>

                {/* 活动信息 */}
                <div className="p-6 space-y-4">
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {formData.description}
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateTime(formData.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateTime(formData.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{formData.maxParticipants ? `最多 ${formData.maxParticipants} 人` : '不限人数'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Coins className="w-4 h-4" />
                      <span>{formData.rewardPerPerson} 零芥子/人</span>
                    </div>
                  </div>

                  {/* 规则摘要 */}
                  {(formData.rules.targetChapterCount || formData.rules.minCommentLength || formData.rules.customRules) && (
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                      <h4 className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">活动规则</h4>
                      <ul className="text-xs text-indigo-600 dark:text-indigo-400 space-y-1">
                        {formData.rules.targetChapterCount && (
                          <li>• 阅读目标: {formData.rules.targetChapterCount} 章</li>
                        )}
                        {formData.rules.minCommentLength && (
                          <li>• 最小评论字数: {formData.rules.minCommentLength} 字</li>
                        )}
                        {formData.rules.customRules && (
                          <li>• {formData.rules.customRules}</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* 提交提示 */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-medium mb-1">提交须知</p>
                    <ul className="space-y-1 text-amber-600 dark:text-amber-400">
                      <li>• 活动创建后将进入审核状态，审核通过后自动发布</li>
                      <li>• 创建活动将从您的零芥子余额中锁定 {totalPool} 零芥子作为奖池</li>
                      <li>• 活动被拒绝或取消后，锁定的零芥子将退还到您的账户</li>
                      <li>• 活动结束后，未发放的奖励将自动退还</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 提交错误 */}
              {submitError && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <X className="w-5 h-5" />
                    <span>{submitError}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 底部操作栏 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800"
        >
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            {currentStep !== 'basic' ? (
              <button
                onClick={handlePrev}
                className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                上一步
              </button>
            ) : (
              <div />
            )}

            {currentStep !== 'preview' ? (
              <button
                onClick={handleNext}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2"
              >
                下一步
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    提交审核
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
