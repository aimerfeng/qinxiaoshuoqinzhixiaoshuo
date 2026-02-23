import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ProfileVisibility,
  DirectMessagePermission,
  UserSettings,
} from '@prisma/client';
import {
  UpdateSettingsDto,
  GetSettingsResponseDto,
  UpdateSettingsResponseDto,
  ResetSettingsResponseDto,
  UserSettingsDataDto,
} from './dto/index.js';

/**
 * 默认用户设置
 */
const DEFAULT_SETTINGS = {
  // 账户安全设置
  twoFactorEnabled: false,
  loginNotificationEnabled: true,

  // 隐私设置
  profileVisibility: ProfileVisibility.PUBLIC,
  showOnlineStatus: true,
  allowDirectMessages: DirectMessagePermission.EVERYONE,
  showReadingActivity: true,

  // 通知设置
  emailNotifications: true,
  pushNotifications: true,
  commentNotifications: true,
  likeNotifications: true,
  followNotifications: true,
  mentionNotifications: true,
  updateNotifications: true,

  // 阅读设置
  defaultFontSize: 16,
  defaultLineHeight: 1.8,
  defaultTheme: 'light',
  autoNightMode: false,
  nightModeStartTime: null as string | null,
  nightModeEndTime: null as string | null,

  // 主题设置
  theme: 'system',
  accentColor: null as string | null,
};

/**
 * 设置服务
 * 处理用户设置相关业务逻辑
 *
 * 需求21: 设置中心
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 将数据库设置转换为 DTO
   */
  private toSettingsDto(settings: UserSettings): UserSettingsDataDto {
    return {
      id: settings.id,
      userId: settings.userId,
      twoFactorEnabled: settings.twoFactorEnabled,
      loginNotificationEnabled: settings.loginNotificationEnabled,
      profileVisibility: settings.profileVisibility,
      showOnlineStatus: settings.showOnlineStatus,
      allowDirectMessages: settings.allowDirectMessages,
      showReadingActivity: settings.showReadingActivity,
      emailNotifications: settings.emailNotifications,
      pushNotifications: settings.pushNotifications,
      commentNotifications: settings.commentNotifications,
      likeNotifications: settings.likeNotifications,
      followNotifications: settings.followNotifications,
      mentionNotifications: settings.mentionNotifications,
      updateNotifications: settings.updateNotifications,
      defaultFontSize: settings.defaultFontSize,
      defaultLineHeight: settings.defaultLineHeight,
      defaultTheme: settings.defaultTheme,
      autoNightMode: settings.autoNightMode,
      nightModeStartTime: settings.nightModeStartTime,
      nightModeEndTime: settings.nightModeEndTime,
      theme: settings.theme,
      accentColor: settings.accentColor,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * 获取用户设置
   * 如果用户没有设置记录，则创建默认设置
   *
   * 需求21验收标准1: WHEN 用户进入设置中心 THEN System SHALL 显示分类设置菜单
   */
  async getUserSettings(userId: string): Promise<GetSettingsResponseDto> {
    try {
      let settings = await this.prisma.userSettings.findUnique({
        where: { userId },
      });

      // 如果没有设置记录，创建默认设置
      if (!settings) {
        settings = await this.prisma.userSettings.create({
          data: {
            userId,
            ...DEFAULT_SETTINGS,
          },
        });
        this.logger.log(`Created default settings for user: ${userId}`);
      }

      return {
        message: '获取用户设置成功',
        settings: this.toSettingsDto(settings),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user settings: ${errorMessage}`);
      throw new InternalServerErrorException('获取用户设置失败');
    }
  }

  /**
   * 更新用户设置
   *
   * 需求21验收标准5: WHEN 用户设置主页隐私 THEN System SHALL 支持"公开/仅关注者/仅自己"三级
   * 需求21验收标准6: WHEN 用户设置通知偏好 THEN System SHALL 支持按类型单独开关
   * 需求21验收标准7: WHEN 用户设置免打扰时段 THEN System SHALL 在该时段内不推送通知
   * 需求21验收标准8: WHEN 用户修改阅读设置 THEN System SHALL 保存为默认配置并同步到云端
   * 需求21验收标准9: WHEN 用户切换主题 THEN System SHALL 即时应用并保存偏好
   */
  async updateUserSettings(
    userId: string,
    data: UpdateSettingsDto,
  ): Promise<UpdateSettingsResponseDto> {
    try {
      // 构建更新数据，只包含传入的字段
      const updateData: Partial<
        Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
      > = {};

      // 账户安全设置
      if (data.twoFactorEnabled !== undefined) {
        updateData.twoFactorEnabled = data.twoFactorEnabled;
      }
      if (data.loginNotificationEnabled !== undefined) {
        updateData.loginNotificationEnabled = data.loginNotificationEnabled;
      }

      // 隐私设置
      if (data.profileVisibility !== undefined) {
        updateData.profileVisibility = data.profileVisibility;
      }
      if (data.showOnlineStatus !== undefined) {
        updateData.showOnlineStatus = data.showOnlineStatus;
      }
      if (data.allowDirectMessages !== undefined) {
        updateData.allowDirectMessages = data.allowDirectMessages;
      }
      if (data.showReadingActivity !== undefined) {
        updateData.showReadingActivity = data.showReadingActivity;
      }

      // 通知设置
      if (data.emailNotifications !== undefined) {
        updateData.emailNotifications = data.emailNotifications;
      }
      if (data.pushNotifications !== undefined) {
        updateData.pushNotifications = data.pushNotifications;
      }
      if (data.commentNotifications !== undefined) {
        updateData.commentNotifications = data.commentNotifications;
      }
      if (data.likeNotifications !== undefined) {
        updateData.likeNotifications = data.likeNotifications;
      }
      if (data.followNotifications !== undefined) {
        updateData.followNotifications = data.followNotifications;
      }
      if (data.mentionNotifications !== undefined) {
        updateData.mentionNotifications = data.mentionNotifications;
      }
      if (data.updateNotifications !== undefined) {
        updateData.updateNotifications = data.updateNotifications;
      }

      // 阅读设置
      if (data.defaultFontSize !== undefined) {
        updateData.defaultFontSize = data.defaultFontSize;
      }
      if (data.defaultLineHeight !== undefined) {
        updateData.defaultLineHeight = data.defaultLineHeight;
      }
      if (data.defaultTheme !== undefined) {
        updateData.defaultTheme = data.defaultTheme;
      }
      if (data.autoNightMode !== undefined) {
        updateData.autoNightMode = data.autoNightMode;
      }
      if (data.nightModeStartTime !== undefined) {
        updateData.nightModeStartTime = data.nightModeStartTime;
      }
      if (data.nightModeEndTime !== undefined) {
        updateData.nightModeEndTime = data.nightModeEndTime;
      }

      // 主题设置
      if (data.theme !== undefined) {
        updateData.theme = data.theme;
      }
      if (data.accentColor !== undefined) {
        updateData.accentColor = data.accentColor;
      }

      // 使用 upsert 确保设置记录存在
      const settings = await this.prisma.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          ...DEFAULT_SETTINGS,
          ...updateData,
        },
        update: updateData,
      });

      this.logger.log(`Updated settings for user: ${userId}`);

      return {
        message: '更新用户设置成功',
        settings: this.toSettingsDto(settings),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update user settings: ${errorMessage}`);
      throw new InternalServerErrorException('更新用户设置失败');
    }
  }

  /**
   * 重置用户设置为默认值
   */
  async resetUserSettings(userId: string): Promise<ResetSettingsResponseDto> {
    try {
      const settings = await this.prisma.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          ...DEFAULT_SETTINGS,
        },
        update: {
          ...DEFAULT_SETTINGS,
        },
      });

      this.logger.log(`Reset settings to default for user: ${userId}`);

      return {
        message: '重置用户设置成功',
        settings: this.toSettingsDto(settings),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to reset user settings: ${errorMessage}`);
      throw new InternalServerErrorException('重置用户设置失败');
    }
  }
}
