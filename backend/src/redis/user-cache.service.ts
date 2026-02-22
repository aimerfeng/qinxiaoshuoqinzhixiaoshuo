import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service.js';

/**
 * 缓存的用户基本信息
 */
export interface CachedUserInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
}

/**
 * 缓存的用户详细信息
 */
export interface CachedUserProfile extends CachedUserInfo {
  bio: string | null;
  backgroundImage: string | null;
  website: string | null;
  location: string | null;
  createdAt: string;
}

/**
 * 用户阅读设置缓存
 */
export interface CachedReadingSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  backgroundColor: string;
  textColor: string;
  pageMode: string;
  nightMode: boolean;
}

/**
 * 用户缓存服务
 *
 * 根据需求10验收标准2：使用 Redis 缓存会话信息
 *
 * 功能：
 * 1. 缓存用户基本信息（减少数据库查询）
 * 2. 缓存用户阅读设置
 * 3. 缓存用户关注列表
 * 4. 支持批量获取用户信息
 */
@Injectable()
export class UserCacheService {
  private readonly logger = new Logger(UserCacheService.name);

  // 缓存键前缀
  private readonly USER_INFO_KEY = 'user:info';
  private readonly USER_PROFILE_KEY = 'user:profile';
  private readonly USER_SETTINGS_KEY = 'user:settings';
  private readonly USER_FOLLOWING_KEY = 'user:following';
  private readonly USER_FOLLOWERS_KEY = 'user:followers';

  // 缓存 TTL 配置
  private readonly USER_INFO_TTL = 3600; // 1 小时
  private readonly USER_PROFILE_TTL = 1800; // 30 分钟
  private readonly USER_SETTINGS_TTL = 7200; // 2 小时
  private readonly FOLLOWING_TTL = 600; // 10 分钟

  constructor(private readonly cacheService: CacheService) {}

  // ==================== 用户基本信息缓存 ====================

  /**
   * 获取缓存的用户基本信息
   * @param userId 用户 ID
   */
  async getUserInfo(userId: string): Promise<CachedUserInfo | null> {
    const cacheKey = `${this.USER_INFO_KEY}:${userId}`;
    return this.cacheService.get<CachedUserInfo>(cacheKey);
  }

  /**
   * 设置用户基本信息缓存
   * @param userId 用户 ID
   * @param userInfo 用户信息
   */
  async setUserInfo(userId: string, userInfo: CachedUserInfo): Promise<void> {
    const cacheKey = `${this.USER_INFO_KEY}:${userId}`;
    await this.cacheService.set(cacheKey, userInfo, this.USER_INFO_TTL);
    this.logger.debug(`User info cached: ${userId}`);
  }

  /**
   * 批量获取用户基本信息
   * @param userIds 用户 ID 列表
   */
  async getUserInfoBatch(
    userIds: string[],
  ): Promise<Map<string, CachedUserInfo | null>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const keys = userIds.map((id) => `${this.USER_INFO_KEY}:${id}`);
    const result = await this.cacheService.mget<CachedUserInfo>(keys);

    // 转换键名（移除前缀）
    const mapped = new Map<string, CachedUserInfo | null>();
    userIds.forEach((id, index) => {
      const key = keys[index];
      mapped.set(id, result.get(key) || null);
    });

    return mapped;
  }

  /**
   * 批量设置用户基本信息
   * @param users 用户信息列表
   */
  async setUserInfoBatch(users: CachedUserInfo[]): Promise<void> {
    if (users.length === 0) {
      return;
    }

    const entries = users.map((user) => ({
      key: `${this.USER_INFO_KEY}:${user.id}`,
      value: user,
    }));

    await this.cacheService.mset(entries, this.USER_INFO_TTL);
    this.logger.debug(`User info batch cached: ${users.length} users`);
  }

  /**
   * 使用户基本信息缓存失效
   * @param userId 用户 ID
   */
  async invalidateUserInfo(userId: string): Promise<void> {
    const cacheKey = `${this.USER_INFO_KEY}:${userId}`;
    await this.cacheService.delete(cacheKey);
    this.logger.debug(`User info cache invalidated: ${userId}`);
  }

  // ==================== 用户详细资料缓存 ====================

  /**
   * 获取缓存的用户详细资料
   * @param userId 用户 ID
   */
  async getUserProfile(userId: string): Promise<CachedUserProfile | null> {
    const cacheKey = `${this.USER_PROFILE_KEY}:${userId}`;
    return this.cacheService.get<CachedUserProfile>(cacheKey);
  }

  /**
   * 设置用户详细资料缓存
   * @param userId 用户 ID
   * @param profile 用户资料
   */
  async setUserProfile(
    userId: string,
    profile: CachedUserProfile,
  ): Promise<void> {
    const cacheKey = `${this.USER_PROFILE_KEY}:${userId}`;
    await this.cacheService.set(cacheKey, profile, this.USER_PROFILE_TTL);
    this.logger.debug(`User profile cached: ${userId}`);
  }

  /**
   * 使用户详细资料缓存失效
   * @param userId 用户 ID
   */
  async invalidateUserProfile(userId: string): Promise<void> {
    const cacheKey = `${this.USER_PROFILE_KEY}:${userId}`;
    await this.cacheService.delete(cacheKey);
    this.logger.debug(`User profile cache invalidated: ${userId}`);
  }

  // ==================== 用户阅读设置缓存 ====================

  /**
   * 获取缓存的用户阅读设置
   * @param userId 用户 ID
   */
  async getReadingSettings(
    userId: string,
  ): Promise<CachedReadingSettings | null> {
    const cacheKey = `${this.USER_SETTINGS_KEY}:reading:${userId}`;
    return this.cacheService.get<CachedReadingSettings>(cacheKey);
  }

  /**
   * 设置用户阅读设置缓存
   * @param userId 用户 ID
   * @param settings 阅读设置
   */
  async setReadingSettings(
    userId: string,
    settings: CachedReadingSettings,
  ): Promise<void> {
    const cacheKey = `${this.USER_SETTINGS_KEY}:reading:${userId}`;
    await this.cacheService.set(cacheKey, settings, this.USER_SETTINGS_TTL);
    this.logger.debug(`Reading settings cached: ${userId}`);
  }

  /**
   * 使用户阅读设置缓存失效
   * @param userId 用户 ID
   */
  async invalidateReadingSettings(userId: string): Promise<void> {
    const cacheKey = `${this.USER_SETTINGS_KEY}:reading:${userId}`;
    await this.cacheService.delete(cacheKey);
    this.logger.debug(`Reading settings cache invalidated: ${userId}`);
  }

  // ==================== 用户关注关系缓存 ====================

  /**
   * 获取用户关注列表（ID）
   * @param userId 用户 ID
   */
  async getFollowingIds(userId: string): Promise<string[] | null> {
    const cacheKey = `${this.USER_FOLLOWING_KEY}:${userId}`;
    return this.cacheService.get<string[]>(cacheKey);
  }

  /**
   * 设置用户关注列表缓存
   * @param userId 用户 ID
   * @param followingIds 关注的用户 ID 列表
   */
  async setFollowingIds(userId: string, followingIds: string[]): Promise<void> {
    const cacheKey = `${this.USER_FOLLOWING_KEY}:${userId}`;
    await this.cacheService.set(cacheKey, followingIds, this.FOLLOWING_TTL);
    this.logger.debug(
      `Following list cached: ${userId}, count: ${followingIds.length}`,
    );
  }

  /**
   * 使用户关注列表缓存失效
   * @param userId 用户 ID
   */
  async invalidateFollowingIds(userId: string): Promise<void> {
    const cacheKey = `${this.USER_FOLLOWING_KEY}:${userId}`;
    await this.cacheService.delete(cacheKey);
    this.logger.debug(`Following list cache invalidated: ${userId}`);
  }

  /**
   * 检查是否关注某用户（使用缓存）
   * @param userId 当前用户 ID
   * @param targetUserId 目标用户 ID
   */
  async isFollowing(
    userId: string,
    targetUserId: string,
  ): Promise<boolean | null> {
    const followingIds = await this.getFollowingIds(userId);
    if (followingIds === null) {
      return null; // 缓存未命中
    }
    return followingIds.includes(targetUserId);
  }

  // ==================== 用户所有缓存失效 ====================

  /**
   * 使用户所有相关缓存失效
   * @param userId 用户 ID
   */
  async invalidateAllUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.invalidateUserInfo(userId),
      this.invalidateUserProfile(userId),
      this.invalidateReadingSettings(userId),
      this.invalidateFollowingIds(userId),
    ]);
    this.logger.debug(`All user cache invalidated: ${userId}`);
  }
}
