import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  storageConfig,
  validate,
} from './config/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, storageConfig],
      envFilePath: ['.env.local', '.env'],
      validate,
    }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
