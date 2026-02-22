import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service.js';

/**
 * 日志模块
 * 全局模块，提供结构化日志服务
 */
@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
