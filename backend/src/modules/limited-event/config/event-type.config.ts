import { Injectable } from '@nestjs/common';
import {
  LimitedEventType,
  LimitedEventTaskType,
  LimitedEventRewardType,
} from '@prisma/client';

/**
 * 活动类型配置接口
 * 定义每种活动类型的特征和默认配置
 */
export interface EventTypeConfig {
  /** 活动类型 */
  type: LimitedEventType;
  /** 显示名称 */
  displayName: string;
  /** 中文名称 */
  displayNameCn: string;
  /** 描述 */
  description: string;
  /** 中文描述 */
  descriptionCn: string;
  /** 最小持续时间（天） */
  minDurationDays: number;
  /** 最大持续时间（天） */
  maxDurationDays: number;
  /** 推荐持续时间（天） */
  recommendedDurationDays: number;
  /** 主题色 */
  themeColor: string;
  /** 渐变色（起始色 → 结束色） */
  gradientColors: [string, string];
  /** 图标名称 */
  iconName: string;
  /** 是否支持主题装饰 */
  hasThemeDecorations: boolean;
  /** 是否支持特殊视觉效果 */
  hasSpecialEffects: boolean;
  /** 推荐任务类型 */
  recommendedTaskTypes: LimitedEventTaskType[];
  /** 推荐奖励类型 */
  recommendedRewardTypes: LimitedEventRewardType[];
  /** 任务数量范围 */
  taskCountRange: { min: number; max: number };
  /** 里程碑数量范围 */
  milestoneCountRange: { min: number; max: number };
  /** 紧迫感等级（1-5，5最高） */
  urgencyLevel: number;
  /** 排序权重（用于列表排序） */
  sortWeight: number;
}

/**
 * 活动类型配置服务
 * 需求26.1.3: 活动类型配置（节日/周年庆/主题/闪电）
 *
 * 定义四种活动类型的特征：
 * - FESTIVAL (节日): 较长持续时间(7-14天)，主题奖励，特殊视觉元素
 * - ANNIVERSARY (周年庆): 年度庆典，独家奖励，里程碑式
 * - THEME (主题): 中等持续时间(3-7天)，特定主题聚焦
 * - FLASH (闪电): 短持续时间(24-72小时)，紧急任务，快速奖励
 */
@Injectable()
export class EventTypeConfigService {
  /**
   * 活动类型配置映射
   */
  private readonly EVENT_TYPE_CONFIGS: Record<LimitedEventType, EventTypeConfig> = {
    [LimitedEventType.FESTIVAL]: {
      type: LimitedEventType.FESTIVAL,
      displayName: 'Festival',
      displayNameCn: '节日活动',
      description: 'Celebrate special holidays with themed rewards and decorations',
      descriptionCn: '庆祝特殊节日，享受主题奖励和装饰',
      minDurationDays: 7,
      maxDurationDays: 14,
      recommendedDurationDays: 10,
      themeColor: '#EF4444', // 红色，节日喜庆
      gradientColors: ['#EF4444', '#F97316'],
      iconName: 'celebration',
      hasThemeDecorations: true,
      hasSpecialEffects: true,
      recommendedTaskTypes: [
        LimitedEventTaskType.DAILY_LOGIN,
        LimitedEventTaskType.READ_CHAPTERS,
        LimitedEventTaskType.SOCIAL_INTERACTION,
        LimitedEventTaskType.COLLECT_ITEMS,
        LimitedEventTaskType.SHARE_CONTENT,
      ],
      recommendedRewardTypes: [
        LimitedEventRewardType.TOKENS,
        LimitedEventRewardType.BADGE,
        LimitedEventRewardType.AVATAR_FRAME,
        LimitedEventRewardType.THEME,
        LimitedEventRewardType.EXCLUSIVE_ITEM,
      ],
      taskCountRange: { min: 5, max: 15 },
      milestoneCountRange: { min: 3, max: 7 },
      urgencyLevel: 2,
      sortWeight: 100,
    },

    [LimitedEventType.ANNIVERSARY]: {
      type: LimitedEventType.ANNIVERSARY,
      displayName: 'Anniversary',
      displayNameCn: '周年庆',
      description: 'Annual celebration with exclusive rewards and milestone-based progression',
      descriptionCn: '年度庆典，独家奖励，里程碑式进度',
      minDurationDays: 7,
      maxDurationDays: 21,
      recommendedDurationDays: 14,
      themeColor: '#FBBF24', // 金色，庆典
      gradientColors: ['#FBBF24', '#F59E0B'],
      iconName: 'trophy',
      hasThemeDecorations: true,
      hasSpecialEffects: true,
      recommendedTaskTypes: [
        LimitedEventTaskType.DAILY_LOGIN,
        LimitedEventTaskType.READ_CHAPTERS,
        LimitedEventTaskType.CREATE_CONTENT,
        LimitedEventTaskType.SOCIAL_INTERACTION,
        LimitedEventTaskType.TIP_CREATORS,
        LimitedEventTaskType.COMPLETE_ACHIEVEMENT,
        LimitedEventTaskType.INVITE_FRIENDS,
      ],
      recommendedRewardTypes: [
        LimitedEventRewardType.TOKENS,
        LimitedEventRewardType.BADGE,
        LimitedEventRewardType.TITLE,
        LimitedEventRewardType.AVATAR_FRAME,
        LimitedEventRewardType.THEME,
        LimitedEventRewardType.EXCLUSIVE_ITEM,
      ],
      taskCountRange: { min: 8, max: 20 },
      milestoneCountRange: { min: 5, max: 10 },
      urgencyLevel: 2,
      sortWeight: 200, // 周年庆优先级最高
    },

    [LimitedEventType.THEME]: {
      type: LimitedEventType.THEME,
      displayName: 'Theme',
      displayNameCn: '主题活动',
      description: 'Focused activities around a specific theme or topic',
      descriptionCn: '围绕特定主题或话题的聚焦活动',
      minDurationDays: 3,
      maxDurationDays: 7,
      recommendedDurationDays: 5,
      themeColor: '#8B5CF6', // 紫色，主题
      gradientColors: ['#8B5CF6', '#6366F1'],
      iconName: 'palette',
      hasThemeDecorations: true,
      hasSpecialEffects: false,
      recommendedTaskTypes: [
        LimitedEventTaskType.READ_CHAPTERS,
        LimitedEventTaskType.CREATE_CONTENT,
        LimitedEventTaskType.SOCIAL_INTERACTION,
        LimitedEventTaskType.SHARE_CONTENT,
        LimitedEventTaskType.CUSTOM,
      ],
      recommendedRewardTypes: [
        LimitedEventRewardType.TOKENS,
        LimitedEventRewardType.BADGE,
        LimitedEventRewardType.EXPERIENCE,
        LimitedEventRewardType.EXCLUSIVE_ITEM,
      ],
      taskCountRange: { min: 3, max: 10 },
      milestoneCountRange: { min: 2, max: 5 },
      urgencyLevel: 3,
      sortWeight: 50,
    },

    [LimitedEventType.FLASH]: {
      type: LimitedEventType.FLASH,
      displayName: 'Flash',
      displayNameCn: '闪电活动',
      description: 'Short-duration events with urgent tasks and quick rewards',
      descriptionCn: '短时限活动，紧急任务，快速奖励',
      minDurationDays: 1, // 24小时
      maxDurationDays: 3, // 72小时
      recommendedDurationDays: 2, // 48小时
      themeColor: '#10B981', // 绿色，快速
      gradientColors: ['#10B981', '#34D399'],
      iconName: 'bolt',
      hasThemeDecorations: false,
      hasSpecialEffects: false,
      recommendedTaskTypes: [
        LimitedEventTaskType.DAILY_LOGIN,
        LimitedEventTaskType.READ_CHAPTERS,
        LimitedEventTaskType.SOCIAL_INTERACTION,
        LimitedEventTaskType.SHARE_CONTENT,
      ],
      recommendedRewardTypes: [
        LimitedEventRewardType.TOKENS,
        LimitedEventRewardType.EXPERIENCE,
        LimitedEventRewardType.EXCLUSIVE_ITEM,
      ],
      taskCountRange: { min: 2, max: 5 },
      milestoneCountRange: { min: 1, max: 3 },
      urgencyLevel: 5, // 最高紧迫感
      sortWeight: 150, // 闪电活动优先显示
    },
  };


  /**
   * 获取指定活动类型的配置
   * @param type 活动类型
   * @returns 活动类型配置
   */
  getConfig(type: LimitedEventType): EventTypeConfig {
    return this.EVENT_TYPE_CONFIGS[type];
  }

  /**
   * 获取所有活动类型配置
   * @returns 所有活动类型配置数组，按sortWeight降序排列
   */
  getAllConfigs(): EventTypeConfig[] {
    return Object.values(this.EVENT_TYPE_CONFIGS).sort(
      (a, b) => b.sortWeight - a.sortWeight,
    );
  }

  /**
   * 获取活动类型的显示名称
   * @param type 活动类型
   * @param locale 语言（'en' | 'cn'）
   * @returns 显示名称
   */
  getDisplayName(type: LimitedEventType, locale: 'en' | 'cn' = 'cn'): string {
    const config = this.EVENT_TYPE_CONFIGS[type];
    return locale === 'cn' ? config.displayNameCn : config.displayName;
  }

  /**
   * 获取活动类型的描述
   * @param type 活动类型
   * @param locale 语言（'en' | 'cn'）
   * @returns 描述
   */
  getDescription(type: LimitedEventType, locale: 'en' | 'cn' = 'cn'): string {
    const config = this.EVENT_TYPE_CONFIGS[type];
    return locale === 'cn' ? config.descriptionCn : config.description;
  }

  /**
   * 验证活动持续时间是否在允许范围内
   * @param type 活动类型
   * @param durationDays 持续天数
   * @returns 验证结果
   */
  validateDuration(
    type: LimitedEventType,
    durationDays: number,
  ): { valid: boolean; message?: string } {
    const config = this.EVENT_TYPE_CONFIGS[type];

    if (durationDays < config.minDurationDays) {
      return {
        valid: false,
        message: `${config.displayNameCn}活动持续时间不能少于${config.minDurationDays}天`,
      };
    }

    if (durationDays > config.maxDurationDays) {
      return {
        valid: false,
        message: `${config.displayNameCn}活动持续时间不能超过${config.maxDurationDays}天`,
      };
    }

    return { valid: true };
  }

  /**
   * 验证任务数量是否在允许范围内
   * @param type 活动类型
   * @param taskCount 任务数量
   * @returns 验证结果
   */
  validateTaskCount(
    type: LimitedEventType,
    taskCount: number,
  ): { valid: boolean; message?: string } {
    const config = this.EVENT_TYPE_CONFIGS[type];

    if (taskCount < config.taskCountRange.min) {
      return {
        valid: false,
        message: `${config.displayNameCn}活动任务数量不能少于${config.taskCountRange.min}个`,
      };
    }

    if (taskCount > config.taskCountRange.max) {
      return {
        valid: false,
        message: `${config.displayNameCn}活动任务数量不能超过${config.taskCountRange.max}个`,
      };
    }

    return { valid: true };
  }

  /**
   * 验证里程碑数量是否在允许范围内
   * @param type 活动类型
   * @param milestoneCount 里程碑数量
   * @returns 验证结果
   */
  validateMilestoneCount(
    type: LimitedEventType,
    milestoneCount: number,
  ): { valid: boolean; message?: string } {
    const config = this.EVENT_TYPE_CONFIGS[type];

    if (milestoneCount < config.milestoneCountRange.min) {
      return {
        valid: false,
        message: `${config.displayNameCn}活动里程碑数量不能少于${config.milestoneCountRange.min}个`,
      };
    }

    if (milestoneCount > config.milestoneCountRange.max) {
      return {
        valid: false,
        message: `${config.displayNameCn}活动里程碑数量不能超过${config.milestoneCountRange.max}个`,
      };
    }

    return { valid: true };
  }

  /**
   * 获取推荐的任务类型
   * @param type 活动类型
   * @returns 推荐的任务类型数组
   */
  getRecommendedTaskTypes(type: LimitedEventType): LimitedEventTaskType[] {
    return this.EVENT_TYPE_CONFIGS[type].recommendedTaskTypes;
  }

  /**
   * 获取推荐的奖励类型
   * @param type 活动类型
   * @returns 推荐的奖励类型数组
   */
  getRecommendedRewardTypes(type: LimitedEventType): LimitedEventRewardType[] {
    return this.EVENT_TYPE_CONFIGS[type].recommendedRewardTypes;
  }

  /**
   * 检查任务类型是否为该活动类型推荐
   * @param eventType 活动类型
   * @param taskType 任务类型
   * @returns 是否推荐
   */
  isTaskTypeRecommended(
    eventType: LimitedEventType,
    taskType: LimitedEventTaskType,
  ): boolean {
    return this.EVENT_TYPE_CONFIGS[eventType].recommendedTaskTypes.includes(taskType);
  }

  /**
   * 检查奖励类型是否为该活动类型推荐
   * @param eventType 活动类型
   * @param rewardType 奖励类型
   * @returns 是否推荐
   */
  isRewardTypeRecommended(
    eventType: LimitedEventType,
    rewardType: LimitedEventRewardType,
  ): boolean {
    return this.EVENT_TYPE_CONFIGS[eventType].recommendedRewardTypes.includes(rewardType);
  }

  /**
   * 获取活动类型的主题样式
   * @param type 活动类型
   * @returns 主题样式配置
   */
  getThemeStyle(type: LimitedEventType): {
    themeColor: string;
    gradientColors: [string, string];
    iconName: string;
    hasThemeDecorations: boolean;
    hasSpecialEffects: boolean;
  } {
    const config = this.EVENT_TYPE_CONFIGS[type];
    return {
      themeColor: config.themeColor,
      gradientColors: config.gradientColors,
      iconName: config.iconName,
      hasThemeDecorations: config.hasThemeDecorations,
      hasSpecialEffects: config.hasSpecialEffects,
    };
  }

  /**
   * 计算活动的紧迫感文案
   * @param type 活动类型
   * @param remainingHours 剩余小时数
   * @returns 紧迫感文案
   */
  getUrgencyText(type: LimitedEventType, remainingHours: number): string {
    const config = this.EVENT_TYPE_CONFIGS[type];

    if (remainingHours <= 0) {
      return '活动已结束';
    }

    if (remainingHours <= 24) {
      return config.urgencyLevel >= 4 ? '⚡ 最后冲刺！' : '即将结束';
    }

    if (remainingHours <= 72) {
      return config.urgencyLevel >= 3 ? '🔥 抓紧时间！' : '剩余时间不多';
    }

    if (type === LimitedEventType.FLASH) {
      return '⚡ 限时闪电活动';
    }

    return '活动进行中';
  }

  /**
   * 根据活动类型获取默认配置模板
   * @param type 活动类型
   * @returns 默认配置模板
   */
  getDefaultTemplate(type: LimitedEventType): {
    durationDays: number;
    taskCount: number;
    milestoneCount: number;
    taskTypes: LimitedEventTaskType[];
    rewardTypes: LimitedEventRewardType[];
  } {
    const config = this.EVENT_TYPE_CONFIGS[type];
    return {
      durationDays: config.recommendedDurationDays,
      taskCount: Math.floor(
        (config.taskCountRange.min + config.taskCountRange.max) / 2,
      ),
      milestoneCount: Math.floor(
        (config.milestoneCountRange.min + config.milestoneCountRange.max) / 2,
      ),
      taskTypes: config.recommendedTaskTypes.slice(0, 5),
      rewardTypes: config.recommendedRewardTypes.slice(0, 3),
    };
  }
}
