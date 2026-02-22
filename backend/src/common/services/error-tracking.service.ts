import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../redis/cache.service.js';

/**
 * 错误记录
 */
export interface ErrorRecord {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
  context?: string;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 错误统计
 */
export interface ErrorStats {
  total: number;
  byType: Record<string, number>;
  byPath: Record<string, number>;
  recentErrors: ErrorRecord[];
}

/**
 * 错误追踪服务
 *
 * 根据需求10验收标准6：记录详细日志并支持问题追溯
 *
 * 功能：
 * 1. 记录错误到 Redis（用于快速查询）
 * 2. 错误聚合和统计
 * 3. 错误去重（相同错误不重复记录）
 * 4. 错误告警（可扩展）
 */
@Injectable()
export class ErrorTrackingService {
  private readonly logger = new Logger(ErrorTrackingService.name);

  // 缓存键前缀
  private readonly ERROR_LIST_KEY = 'errors:list';
  private readonly ERROR_STATS_KEY = 'errors:stats';
  private readonly ERROR_FINGERPRINT_KEY = 'errors:fingerprint';

  // 配置
  private readonly maxErrors = 1000; // 最多保留的错误数量
  private readonly errorTtl = 86400 * 7; // 错误记录保留 7 天
  private readonly fingerprintTtl = 3600; // 指纹去重窗口 1 小时

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 记录错误
   */
  async trackError(
    error: Omit<ErrorRecord, 'id' | 'timestamp'>,
  ): Promise<void> {
    try {
      // 生成错误指纹（用于去重）
      const fingerprint = this.generateFingerprint(error);

      // 检查是否在去重窗口内已记录
      const isDuplicate = await this.checkDuplicate(fingerprint);
      if (isDuplicate) {
        this.logger.debug(`Duplicate error skipped: ${fingerprint}`);
        return;
      }

      // 创建错误记录
      const record: ErrorRecord = {
        id: this.generateErrorId(),
        timestamp: new Date().toISOString(),
        ...error,
      };

      // 存储错误记录
      await this.storeError(record);

      // 更新统计
      await this.updateStats(record);

      // 标记指纹（防止重复）
      await this.markFingerprint(fingerprint);

      this.logger.debug(`Error tracked: ${record.id}`);
    } catch (err) {
      // 错误追踪本身的错误不应该影响主流程
      this.logger.error('Failed to track error', err);
    }
  }

  /**
   * 获取最近的错误列表
   */
  async getRecentErrors(limit: number = 50): Promise<ErrorRecord[]> {
    const errors = await this.cacheService.get<ErrorRecord[]>(
      this.ERROR_LIST_KEY,
    );
    if (!errors) {
      return [];
    }
    return errors.slice(0, limit);
  }

  /**
   * 获取错误统计
   */
  async getErrorStats(): Promise<ErrorStats> {
    const stats = await this.cacheService.get<ErrorStats>(this.ERROR_STATS_KEY);
    if (!stats) {
      return {
        total: 0,
        byType: {},
        byPath: {},
        recentErrors: [],
      };
    }
    return stats;
  }

  /**
   * 获取特定类型的错误
   */
  async getErrorsByType(
    type: string,
    limit: number = 50,
  ): Promise<ErrorRecord[]> {
    const errors = await this.getRecentErrors(this.maxErrors);
    return errors.filter((e) => e.type === type).slice(0, limit);
  }

  /**
   * 获取特定路径的错误
   */
  async getErrorsByPath(
    path: string,
    limit: number = 50,
  ): Promise<ErrorRecord[]> {
    const errors = await this.getRecentErrors(this.maxErrors);
    return errors.filter((e) => e.path === path).slice(0, limit);
  }

  /**
   * 清除所有错误记录
   */
  async clearErrors(): Promise<void> {
    await this.cacheService.delete(this.ERROR_LIST_KEY);
    await this.cacheService.delete(this.ERROR_STATS_KEY);
    this.logger.log('All error records cleared');
  }

  // ==================== 内部方法 ====================

  /**
   * 存储错误记录
   */
  private async storeError(record: ErrorRecord): Promise<void> {
    // 获取现有错误列表
    let errors =
      (await this.cacheService.get<ErrorRecord[]>(this.ERROR_LIST_KEY)) || [];

    // 添加新错误到列表头部
    errors.unshift(record);

    // 限制列表大小
    if (errors.length > this.maxErrors) {
      errors = errors.slice(0, this.maxErrors);
    }

    // 保存
    await this.cacheService.set(this.ERROR_LIST_KEY, errors, this.errorTtl);
  }

  /**
   * 更新错误统计
   */
  private async updateStats(record: ErrorRecord): Promise<void> {
    const stats = (await this.cacheService.get<ErrorStats>(
      this.ERROR_STATS_KEY,
    )) || {
      total: 0,
      byType: {},
      byPath: {},
      recentErrors: [],
    };

    // 更新总数
    stats.total++;

    // 更新类型统计
    stats.byType[record.type] = (stats.byType[record.type] || 0) + 1;

    // 更新路径统计
    if (record.path) {
      stats.byPath[record.path] = (stats.byPath[record.path] || 0) + 1;
    }

    // 更新最近错误（保留最近 10 条）
    stats.recentErrors.unshift(record);
    if (stats.recentErrors.length > 10) {
      stats.recentErrors = stats.recentErrors.slice(0, 10);
    }

    // 保存
    await this.cacheService.set(this.ERROR_STATS_KEY, stats, this.errorTtl);
  }

  /**
   * 生成错误指纹（用于去重）
   */
  private generateFingerprint(
    error: Omit<ErrorRecord, 'id' | 'timestamp'>,
  ): string {
    const parts = [
      error.type,
      error.message,
      error.path || '',
      error.method || '',
    ];
    return parts.join(':').substring(0, 200);
  }

  /**
   * 检查是否为重复错误
   */
  private async checkDuplicate(fingerprint: string): Promise<boolean> {
    const key = `${this.ERROR_FINGERPRINT_KEY}:${fingerprint}`;
    return await this.cacheService.exists(key);
  }

  /**
   * 标记错误指纹
   */
  private async markFingerprint(fingerprint: string): Promise<void> {
    const key = `${this.ERROR_FINGERPRINT_KEY}:${fingerprint}`;
    await this.cacheService.set(key, '1', this.fingerprintTtl);
  }

  /**
   * 生成错误 ID
   */
  private generateErrorId(): string {
    return `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
