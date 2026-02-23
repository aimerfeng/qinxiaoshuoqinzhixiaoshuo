import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Theme, UserThemePreference, ThemeUnlockType, MemberLevel } from '@prisma/client';
import {
  CreateThemeDto,
  UpdateThemeDto,
  SetUserThemePreferenceDto,
  UpdateThemeCustomizationsDto,
  ThemeColorsDto,
  ThemeUnlockConditionDto,
  ThemeCustomizationsDto,
} from './dto/index.js';
import {
  ThemeDataDto,
  UserThemePreferenceDataDto,
  ThemeWithUnlockStatusDto,
  GetThemesResponseDto,
  GetUserThemesResponseDto,
  GetThemeResponseDto,
  CreateThemeResponseDto,
  UpdateThemeResponseDto,
  DeleteThemeResponseDto,
  GetUserActiveThemeResponseDto,
  SetUserThemePreferenceResponseDto,
  CheckThemeUnlockResponseDto,
} from './dto/theme-response.dto.js';

/**
 * 主题服务
 * 处理主题配置和用户主题偏好相关业务逻辑
 *
 * 需求23: 主题皮肤系统
 */
@Injectable()
export class ThemeService {
  private readonly logger = new Logger(ThemeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 将数据库主题转换为 DTO
   */
  private toThemeDto(theme: Theme): ThemeDataDto {
    return {
      id: theme.id,
      name: theme.name,
      displayName: theme.displayName,
      description: theme.description,
      previewImage: theme.previewImage,
      colors: theme.colors as unknown as ThemeColorsDto,
      isDefault: theme.isDefault,
      isPremium: theme.isPremium,
      isUnlockable: theme.isUnlockable,
      unlockCondition: theme.unlockCondition as ThemeUnlockConditionDto | null,
      unlockType: theme.unlockType as unknown as import('./dto/theme.dto.js').ThemeUnlockType,
      sortOrder: theme.sortOrder,
      isActive: theme.isActive,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    };
  }

  /**
   * 将数据库用户主题偏好转换为 DTO
   */
  private toUserThemePreferenceDto(
    preference: UserThemePreference & { theme?: Theme },
  ): UserThemePreferenceDataDto {
    return {
      id: preference.id,
      userId: preference.userId,
      themeId: preference.themeId,
      customizations: preference.customizations as ThemeCustomizationsDto | null,
      isActive: preference.isActive,
      unlockedAt: preference.unlockedAt,
      createdAt: preference.createdAt,
      updatedAt: preference.updatedAt,
      theme: preference.theme ? this.toThemeDto(preference.theme) : undefined,
    };
  }

  // ==================== 主题管理 API ====================

  /**
   * 获取所有主题列表（管理员用）
   */
  async getAllThemes(): Promise<GetThemesResponseDto> {
    try {
      const themes = await this.prisma.theme.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      return {
        message: '获取主题列表成功',
        themes: themes.map((theme) => this.toThemeDto(theme)),
        total: themes.length,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get all themes: ${errorMessage}`);
      throw new InternalServerErrorException('获取主题列表失败');
    }
  }

  /**
   * 获取启用的主题列表（公开）
   */
  async getActiveThemes(): Promise<GetThemesResponseDto> {
    try {
      const themes = await this.prisma.theme.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      return {
        message: '获取主题列表成功',
        themes: themes.map((theme) => this.toThemeDto(theme)),
        total: themes.length,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get active themes: ${errorMessage}`);
      throw new InternalServerErrorException('获取主题列表失败');
    }
  }

  /**
   * 获取单个主题详情
   */
  async getThemeById(themeId: string): Promise<GetThemeResponseDto> {
    try {
      const theme = await this.prisma.theme.findUnique({
        where: { id: themeId },
      });

      if (!theme) {
        throw new NotFoundException('主题不存在');
      }

      return {
        message: '获取主题详情成功',
        theme: this.toThemeDto(theme),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get theme by id: ${errorMessage}`);
      throw new InternalServerErrorException('获取主题详情失败');
    }
  }

  /**
   * 通过名称获取主题
   */
  async getThemeByName(name: string): Promise<GetThemeResponseDto> {
    try {
      const theme = await this.prisma.theme.findUnique({
        where: { name },
      });

      if (!theme) {
        throw new NotFoundException('主题不存在');
      }

      return {
        message: '获取主题详情成功',
        theme: this.toThemeDto(theme),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get theme by name: ${errorMessage}`);
      throw new InternalServerErrorException('获取主题详情失败');
    }
  }

  /**
   * 创建主题（管理员用）
   */
  async createTheme(data: CreateThemeDto): Promise<CreateThemeResponseDto> {
    try {
      // 检查名称是否已存在
      const existingTheme = await this.prisma.theme.findUnique({
        where: { name: data.name },
      });

      if (existingTheme) {
        throw new ConflictException('主题标识符已存在');
      }

      // 如果设置为默认主题，先取消其他默认主题
      if (data.isDefault) {
        await this.prisma.theme.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const theme = await this.prisma.theme.create({
        data: {
          name: data.name,
          displayName: data.displayName,
          description: data.description,
          previewImage: data.previewImage,
          colors: data.colors as object,
          isDefault: data.isDefault ?? false,
          isPremium: data.isPremium ?? false,
          isUnlockable: data.isUnlockable ?? false,
          unlockCondition: data.unlockCondition as object | undefined,
          unlockType: (data.unlockType as ThemeUnlockType) ?? ThemeUnlockType.DEFAULT,
          sortOrder: data.sortOrder ?? 0,
        },
      });

      this.logger.log(`Created theme: ${theme.name}`);

      return {
        message: '创建主题成功',
        theme: this.toThemeDto(theme),
      };
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create theme: ${errorMessage}`);
      throw new InternalServerErrorException('创建主题失败');
    }
  }

  /**
   * 更新主题（管理员用）
   */
  async updateTheme(themeId: string, data: UpdateThemeDto): Promise<UpdateThemeResponseDto> {
    try {
      const existingTheme = await this.prisma.theme.findUnique({
        where: { id: themeId },
      });

      if (!existingTheme) {
        throw new NotFoundException('主题不存在');
      }

      // 如果设置为默认主题，先取消其他默认主题
      if (data.isDefault && !existingTheme.isDefault) {
        await this.prisma.theme.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const theme = await this.prisma.theme.update({
        where: { id: themeId },
        data: {
          displayName: data.displayName,
          description: data.description,
          previewImage: data.previewImage,
          colors: data.colors as object | undefined,
          isDefault: data.isDefault,
          isPremium: data.isPremium,
          isUnlockable: data.isUnlockable,
          unlockCondition: data.unlockCondition as object | undefined,
          unlockType: data.unlockType as ThemeUnlockType | undefined,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        },
      });

      this.logger.log(`Updated theme: ${theme.name}`);

      return {
        message: '更新主题成功',
        theme: this.toThemeDto(theme),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update theme: ${errorMessage}`);
      throw new InternalServerErrorException('更新主题失败');
    }
  }

  /**
   * 删除主题（管理员用）
   */
  async deleteTheme(themeId: string): Promise<DeleteThemeResponseDto> {
    try {
      const existingTheme = await this.prisma.theme.findUnique({
        where: { id: themeId },
      });

      if (!existingTheme) {
        throw new NotFoundException('主题不存在');
      }

      if (existingTheme.isDefault) {
        throw new ForbiddenException('不能删除默认主题');
      }

      await this.prisma.theme.delete({
        where: { id: themeId },
      });

      this.logger.log(`Deleted theme: ${existingTheme.name}`);

      return {
        message: '删除主题成功',
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete theme: ${errorMessage}`);
      throw new InternalServerErrorException('删除主题失败');
    }
  }

  // ==================== 用户主题偏好 API ====================

  /**
   * 获取用户可用的主题列表（含解锁状态）
   *
   * 需求23验收标准1: WHEN 用户进入主题设置 THEN System SHALL 显示可用主题列表和预览
   * 需求23验收标准7: WHEN 正式会员查看主题 THEN System SHALL 显示专属主题并标记"会员专属"
   * 需求23验收标准8: WHEN 用户查看锁定主题 THEN System SHALL 显示解锁条件和预览
   */
  async getUserThemes(userId: string): Promise<GetUserThemesResponseDto> {
    try {
      // 获取所有启用的主题
      const themes = await this.prisma.theme.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      // 获取用户的主题偏好
      const userPreferences = await this.prisma.userThemePreference.findMany({
        where: { userId },
      });

      // 获取用户信息（用于检查会员等级）
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { memberLevel: true },
      });

      const preferencesMap = new Map(
        userPreferences.map((pref) => [pref.themeId, pref]),
      );

      // 构建带解锁状态的主题列表
      const themesWithStatus: ThemeWithUnlockStatusDto[] = themes.map((theme) => {
        const preference = preferencesMap.get(theme.id);
        const isUnlocked = this.checkThemeUnlocked(theme, user?.memberLevel, preference);

        return {
          ...this.toThemeDto(theme),
          isUnlocked,
          isCurrentActive: preference?.isActive ?? false,
          userCustomizations: preference?.customizations as ThemeCustomizationsDto | null,
        };
      });

      return {
        message: '获取用户主题列表成功',
        themes: themesWithStatus,
        total: themesWithStatus.length,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user themes: ${errorMessage}`);
      throw new InternalServerErrorException('获取用户主题列表失败');
    }
  }

  /**
   * 获取用户当前激活的主题
   */
  async getUserActiveTheme(userId: string): Promise<GetUserActiveThemeResponseDto> {
    try {
      const preference = await this.prisma.userThemePreference.findFirst({
        where: { userId, isActive: true },
        include: { theme: true },
      });

      if (!preference) {
        // 返回默认主题
        const defaultTheme = await this.prisma.theme.findFirst({
          where: { isDefault: true, isActive: true },
        });

        return {
          message: '获取用户当前主题成功',
          preference: null,
          theme: defaultTheme ? this.toThemeDto(defaultTheme) : null,
        };
      }

      return {
        message: '获取用户当前主题成功',
        preference: this.toUserThemePreferenceDto(preference),
        theme: this.toThemeDto(preference.theme),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user active theme: ${errorMessage}`);
      throw new InternalServerErrorException('获取用户当前主题失败');
    }
  }

  /**
   * 设置用户主题偏好（切换主题）
   *
   * 需求23验收标准2: WHEN 用户选择主题 THEN System SHALL 即时预览效果
   * 需求23验收标准3: WHEN 用户确认切换 THEN System SHALL 应用主题并保存到用户偏好
   */
  async setUserThemePreference(
    userId: string,
    data: SetUserThemePreferenceDto,
  ): Promise<SetUserThemePreferenceResponseDto> {
    try {
      // 检查主题是否存在
      const theme = await this.prisma.theme.findUnique({
        where: { id: data.themeId },
      });

      if (!theme) {
        throw new NotFoundException('主题不存在');
      }

      if (!theme.isActive) {
        throw new ForbiddenException('该主题已被禁用');
      }

      // 获取用户信息
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { memberLevel: true },
      });

      // 检查用户是否有权限使用该主题
      const existingPreference = await this.prisma.userThemePreference.findUnique({
        where: { userId_themeId: { userId, themeId: data.themeId } },
      });

      const isUnlocked = this.checkThemeUnlocked(theme, user?.memberLevel, existingPreference);

      if (!isUnlocked) {
        throw new ForbiddenException('您尚未解锁该主题');
      }

      // 使用事务：先取消所有激活状态，再设置新的激活主题
      const preference = await this.prisma.$transaction(async (tx) => {
        // 取消当前用户所有主题的激活状态
        await tx.userThemePreference.updateMany({
          where: { userId, isActive: true },
          data: { isActive: false },
        });

        // 创建或更新用户主题偏好
        return tx.userThemePreference.upsert({
          where: { userId_themeId: { userId, themeId: data.themeId } },
          create: {
            userId,
            themeId: data.themeId,
            customizations: data.customizations as object | undefined,
            isActive: true,
          },
          update: {
            customizations: data.customizations as object | undefined,
            isActive: true,
          },
          include: { theme: true },
        });
      });

      this.logger.log(`User ${userId} switched to theme: ${theme.name}`);

      return {
        message: '切换主题成功',
        preference: this.toUserThemePreferenceDto(preference),
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to set user theme preference: ${errorMessage}`);
      throw new InternalServerErrorException('切换主题失败');
    }
  }

  /**
   * 更新用户主题自定义配置
   */
  async updateUserThemeCustomizations(
    userId: string,
    themeId: string,
    data: UpdateThemeCustomizationsDto,
  ): Promise<SetUserThemePreferenceResponseDto> {
    try {
      const preference = await this.prisma.userThemePreference.findUnique({
        where: { userId_themeId: { userId, themeId } },
        include: { theme: true },
      });

      if (!preference) {
        throw new NotFoundException('用户主题偏好不存在');
      }

      const updatedPreference = await this.prisma.userThemePreference.update({
        where: { id: preference.id },
        data: {
          customizations: data.customizations as object | undefined,
        },
        include: { theme: true },
      });

      this.logger.log(`User ${userId} updated customizations for theme: ${themeId}`);

      return {
        message: '更新主题自定义配置成功',
        preference: this.toUserThemePreferenceDto(updatedPreference),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update theme customizations: ${errorMessage}`);
      throw new InternalServerErrorException('更新主题自定义配置失败');
    }
  }

  /**
   * 检查主题解锁状态
   *
   * 需求23验收标准7: WHEN 正式会员查看主题 THEN System SHALL 显示专属主题并标记"会员专属"
   */
  async checkThemeUnlockStatus(
    userId: string,
    themeId: string,
  ): Promise<CheckThemeUnlockResponseDto> {
    try {
      const theme = await this.prisma.theme.findUnique({
        where: { id: themeId },
      });

      if (!theme) {
        throw new NotFoundException('主题不存在');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { memberLevel: true },
      });

      const preference = await this.prisma.userThemePreference.findUnique({
        where: { userId_themeId: { userId, themeId } },
      });

      const isUnlocked = this.checkThemeUnlocked(theme, user?.memberLevel, preference);
      const unlockRequirement = this.getUnlockRequirementDescription(theme);

      return {
        message: '检查主题解锁状态成功',
        isUnlocked,
        unlockRequirement: isUnlocked ? undefined : unlockRequirement,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to check theme unlock status: ${errorMessage}`);
      throw new InternalServerErrorException('检查主题解锁状态失败');
    }
  }

  /**
   * 解锁主题（用于活动奖励、成就解锁等）
   */
  async unlockThemeForUser(userId: string, themeId: string): Promise<SetUserThemePreferenceResponseDto> {
    try {
      const theme = await this.prisma.theme.findUnique({
        where: { id: themeId },
      });

      if (!theme) {
        throw new NotFoundException('主题不存在');
      }

      // 创建用户主题偏好记录（表示已解锁）
      const preference = await this.prisma.userThemePreference.upsert({
        where: { userId_themeId: { userId, themeId } },
        create: {
          userId,
          themeId,
          isActive: false,
          unlockedAt: new Date(),
        },
        update: {
          unlockedAt: new Date(),
        },
        include: { theme: true },
      });

      this.logger.log(`Unlocked theme ${theme.name} for user ${userId}`);

      return {
        message: '解锁主题成功',
        preference: this.toUserThemePreferenceDto(preference),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to unlock theme for user: ${errorMessage}`);
      throw new InternalServerErrorException('解锁主题失败');
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 检查主题是否已解锁
   */
  private checkThemeUnlocked(
    theme: Theme,
    memberLevel?: MemberLevel | null,
    preference?: UserThemePreference | null,
  ): boolean {
    // 默认主题或非解锁主题直接可用
    if (!theme.isUnlockable || theme.unlockType === ThemeUnlockType.DEFAULT) {
      return true;
    }

    // 如果用户已有偏好记录，说明已解锁
    if (preference) {
      return true;
    }

    // 根据解锁类型检查
    switch (theme.unlockType) {
      case ThemeUnlockType.MEMBERSHIP:
        // 检查会员等级
        if (!memberLevel) return false;
        const condition = theme.unlockCondition as { requirement?: string } | null;
        const requiredLevel = condition?.requirement as MemberLevel | undefined;
        if (!requiredLevel) return true;
        return this.checkMemberLevelSufficient(memberLevel, requiredLevel);

      case ThemeUnlockType.ACHIEVEMENT:
      case ThemeUnlockType.PURCHASE:
      case ThemeUnlockType.EVENT:
      case ThemeUnlockType.CREATOR:
        // 这些类型需要通过 unlockThemeForUser 方法显式解锁
        return false;

      default:
        return false;
    }
  }

  /**
   * 检查会员等级是否满足要求
   */
  private checkMemberLevelSufficient(
    currentLevel: MemberLevel,
    requiredLevel: MemberLevel,
  ): boolean {
    const levelOrder: MemberLevel[] = [
      MemberLevel.REGULAR,
      MemberLevel.OFFICIAL,
      MemberLevel.SENIOR,
      MemberLevel.HONORARY,
    ];

    const currentIndex = levelOrder.indexOf(currentLevel);
    const requiredIndex = levelOrder.indexOf(requiredLevel);

    return currentIndex >= requiredIndex;
  }

  /**
   * 获取解锁条件描述
   */
  private getUnlockRequirementDescription(theme: Theme): string {
    const condition = theme.unlockCondition as { requirement?: string | number } | null;

    switch (theme.unlockType) {
      case ThemeUnlockType.MEMBERSHIP:
        const level = condition?.requirement as string | undefined;
        const levelNames: Record<string, string> = {
          OFFICIAL: '正式会员',
          SENIOR: '资深会员',
          HONORARY: '荣誉会员',
        };
        return `需要达到${levelNames[level || ''] || '会员'}等级`;

      case ThemeUnlockType.ACHIEVEMENT:
        return '完成指定成就后解锁';

      case ThemeUnlockType.PURCHASE:
        return `需要购买解锁（${condition?.requirement || ''}零芥子）`;

      case ThemeUnlockType.EVENT:
        return '活动限定主题';

      case ThemeUnlockType.CREATOR:
        return '创作者专属主题';

      default:
        return '需要满足特定条件解锁';
    }
  }
}
