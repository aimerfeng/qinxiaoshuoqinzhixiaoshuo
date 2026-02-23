import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { StorageModule } from './storage/storage.module.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WorksModule } from './modules/works/works.module.js';
import { ChaptersModule } from './modules/chapters/chapters.module.js';
import { ReaderModule } from './modules/reader/reader.module.js';
import { DanmakuModule } from './modules/danmaku/danmaku.module.js';
import { PlazaModule } from './modules/plaza/plaza.module.js';
import { AnchorModule } from './modules/anchor/anchor.module.js';
import { CreatorModule } from './modules/creator/creator.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { ReadingListModule } from './modules/reading-list/reading-list.module.js';
import { MembershipModule } from './modules/membership/membership.module.js';
import { WalletModule } from './modules/wallet/wallet.module.js';
import { ActivityModule } from './modules/activity/activity.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { RiskControlModule } from './modules/risk-control/risk-control.module.js';
import { MessageModule } from './modules/message/message.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { ThemeModule } from './modules/theme/theme.module.js';
import { AchievementModule } from './modules/achievement/achievement.module.js';
import { SeasonModule } from './modules/season/season.module.js';
import { LimitedEventModule } from './modules/limited-event/limited-event.module.js';
import { Wenku8ProxyModule } from './modules/wenku8-proxy/wenku8-proxy.module.js';
import { NovelCrawlerModule } from './modules/novel-crawler/novel-crawler.module.js';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  storageConfig,
  sensitiveWordConfig,
  validate,
} from './config/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, storageConfig, sensitiveWordConfig],
      envFilePath: ['.env.local', '.env'],
      validate,
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    StorageModule,
    CommonModule,
    AuthModule,
    UsersModule,
    WorksModule,
    ChaptersModule,
    ReaderModule,
    DanmakuModule,
    PlazaModule,
    AnchorModule,
    CreatorModule,
    SearchModule,
    NotificationModule,
    ReadingListModule,
    MembershipModule,
    WalletModule,
    ActivityModule,
    AdminModule,
    RiskControlModule,
    MessageModule,
    SettingsModule,
    OnboardingModule,
    ThemeModule,
    AchievementModule,
    SeasonModule,
    LimitedEventModule,
    Wenku8ProxyModule,
    NovelCrawlerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
