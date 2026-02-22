import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { PlazaController } from './plaza.controller';
import { PlazaService } from './plaza.service';
import { LikeService } from './like.service';
import { CommentService } from './comment.service';
import { HotScoreService } from './hot-score.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [PlazaController],
  providers: [PlazaService, LikeService, CommentService, HotScoreService],
  exports: [PlazaService, LikeService, CommentService, HotScoreService],
})
export class PlazaModule {}
