import { Module } from '@nestjs/common';
import { NovelCrawlerService } from './novel-crawler.service.js';
import { NovelCrawlerController } from './novel-crawler.controller.js';
import { RedisModule } from '../../redis/redis.module.js';

@Module({
  imports: [RedisModule],
  controllers: [NovelCrawlerController],
  providers: [NovelCrawlerService],
  exports: [NovelCrawlerService],
})
export class NovelCrawlerModule {}
