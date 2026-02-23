import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UploadService, type FileInput } from '../../storage/upload.service.js';
import { AchievementProgressService } from '../achievement/achievement-progress.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { AvatarUploadResponseDto } from './dto/avatar-upload.dto.js';
import { UserPublicProfileResponseDto } from './dto/user-profile.dto.js';
import {
  UserActivitiesQueryDto,
  UserActivitiesResponseDto,
  UserActivityItem,
  UserActivityType,
  USER_ACTIVITY_TYPE_NAMES,
} from './dto/user-activities.dto.js';
import {
  FollowListQueryDto,
  FollowListResponseDto,
  FollowActionResponseDto,
  FollowStatusResponseDto,
  FollowListItem,
} from './dto/follow.dto.js';
import {
  UserFavoritesQueryDto,
  UserFavoritesResponseDto,
  FavoriteItemResponse,
} from './dto/favorites.dto.js';
import { Gender, ReadingListStatus } from '@prisma/client';

/**
 * 用户资料响应接口
 */
export interface UserProfileResponse {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  isEmailVerified: boolean;
  createdAt: Date;
  profile: {
    backgroundImage: string | null;
    website: string | null;
    location: string | null;
    birthday: Date | null;
    gender: Gender | null;
  } | null;
}

/**
 * 更新资料响应接口
 */
export interface UpdateProfileResponse {
  message: string;
  user: UserProfileResponse;
}

/**
 * 用户服务
 * 处理用户资料管理相关业务逻辑
 */
/**
 * 允许的头像文件类型
 */
const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * 头像最大文件大小 (5MB)
 */
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    @Inject(forwardRef(() => AchievementProgressService))
    private readonly achievementProgressService: AchievementProgressService,
  ) {}

  /**
   * 获取当前用户资料
   * 需求1验收标准6: 用户可以查看和更新个人资料
   *
   * @param userId 用户ID
   * @returns 用户资料
   */
  async getProfile(userId: string): Promise<UserProfileResponse> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const user = await (this.prisma as any).user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          bio: true,
          isEmailVerified: true,
          createdAt: true,
          profile: {
            select: {
              backgroundImage: true,
              website: true,
              location: true,
              birthday: true,
              gender: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      return user as UserProfileResponse;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user profile: ${errorMessage}`);
      throw new InternalServerErrorException('获取用户资料失败');
    }
  }

  /**
   * 更新当前用户资料
   * 需求1验收标准6: WHEN 用户更新个人资料信息 THEN System SHALL 验证并保存更改
   *
   * @param userId 用户ID
   * @param updateProfileDto 更新数据
   * @returns 更新后的用户资料
   */
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UpdateProfileResponse> {
    const { nickname, bio, gender, birthday } = updateProfileDto;

    try {
      // 检查用户是否存在
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const existingUser = await (this.prisma as any).user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new NotFoundException('用户不存在');
      }

      // 准备用户表更新数据
      const userUpdateData: Record<string, unknown> = {};
      if (nickname !== undefined) {
        userUpdateData.displayName = nickname;
      }
      if (bio !== undefined) {
        userUpdateData.bio = bio;
      }

      // 准备用户资料表更新数据
      const profileUpdateData: Record<string, unknown> = {};
      if (gender !== undefined) {
        profileUpdateData.gender = gender;
      }
      if (birthday !== undefined) {
        profileUpdateData.birthday = new Date(birthday);
      }

      // 使用事务更新用户和用户资料
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const updatedUser = await (this.prisma as any).$transaction(
        async (tx: any) => {
          // 更新用户表（如果有数据需要更新）
          if (Object.keys(userUpdateData).length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            await tx.user.update({
              where: { id: userId },
              data: userUpdateData,
            });
          }

          // 更新用户资料表（如果有数据需要更新）
          if (Object.keys(profileUpdateData).length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            await tx.userProfile.upsert({
              where: { userId },
              update: profileUpdateData,
              create: {
                userId,
                ...profileUpdateData,
              },
            });
          }

          // 返回更新后的完整用户资料
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
          return tx.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
              avatar: true,
              bio: true,
              isEmailVerified: true,
              createdAt: true,
              profile: {
                select: {
                  backgroundImage: true,
                  website: true,
                  location: true,
                  birthday: true,
                  gender: true,
                },
              },
            },
          });
        },
      );

      this.logger.log(`User profile updated successfully: ${userId}`);

      return {
        message: '资料更新成功',
        user: updatedUser as UserProfileResponse,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update user profile: ${errorMessage}`);
      throw new InternalServerErrorException('更新用户资料失败');
    }
  }

  /**
   * 上传用户头像
   * 需求1验收标准6: 用户可以更新个人资料（包括头像）
   *
   * 功能说明：
   * 1. 验证文件类型（jpg, png, gif, webp）
   * 2. 验证文件大小（最大5MB）
   * 3. 处理图片：压缩并生成标准尺寸缩略图（128x128, 256x256）
   * 4. 上传到S3/MinIO存储
   * 5. 更新用户头像URL到数据库
   * 6. 删除旧头像文件（如果存在）
   *
   * @param userId 用户ID
   * @param file 上传的文件
   * @returns 头像上传结果
   */
  async uploadAvatar(
    userId: string,
    file: FileInput,
  ): Promise<AvatarUploadResponseDto> {
    // 验证文件类型
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `不支持的文件类型。允许的类型: ${ALLOWED_AVATAR_MIME_TYPES.join(', ')}`,
      );
    }

    // 验证文件大小
    if (file.size > MAX_AVATAR_SIZE) {
      const maxSizeMB = MAX_AVATAR_SIZE / (1024 * 1024);
      throw new BadRequestException(`文件大小超过限制（最大 ${maxSizeMB}MB）`);
    }

    try {
      // 检查用户是否存在并获取旧头像URL
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const existingUser = await (this.prisma as any).user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      if (!existingUser) {
        throw new NotFoundException('用户不存在');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const oldAvatarUrl: string | null = existingUser.avatar;

      // 上传头像（包含图片处理和缩略图生成）
      const uploadResult = await this.uploadService.uploadAvatar(userId, file);

      // 更新用户头像URL到数据库
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).user.update({
        where: { id: userId },
        data: { avatar: uploadResult.publicUrl },
      });

      // 删除旧头像（如果存在）
      if (oldAvatarUrl) {
        try {
          await this.uploadService.deleteImageWithThumbnails(
            oldAvatarUrl,
            'avatar',
          );
          this.logger.log(`Old avatar deleted for user: ${userId}`);
        } catch (deleteError) {
          // 删除旧头像失败不影响主流程，只记录日志
          this.logger.warn(
            `Failed to delete old avatar for user ${userId}: ${deleteError}`,
          );
        }
      }

      // 构建缩略图URL映射
      const thumbnailMap: { small: string; medium: string } = {
        small: '',
        medium: '',
      };

      for (const thumbnail of uploadResult.thumbnails) {
        if (thumbnail.suffix === '_128') {
          thumbnailMap.small = thumbnail.publicUrl;
        } else if (thumbnail.suffix === '_256') {
          thumbnailMap.medium = thumbnail.publicUrl;
        }
      }

      this.logger.log(`Avatar uploaded successfully for user: ${userId}`);

      return {
        message: '头像上传成功',
        avatar: {
          url: uploadResult.publicUrl,
          thumbnails: thumbnailMap,
        },
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to upload avatar: ${errorMessage}`);
      throw new InternalServerErrorException('头像上传失败');
    }
  }

  /**
   * 获取用户公开主页数据
   * 需求17验收标准1: WHEN 用户进入个人中心 THEN System SHALL 显示个人资料卡片和功能模块入口
   * 需求17验收标准12: WHEN 他人访问用户主页 THEN System SHALL 显示公开资料和动态
   *
   * 返回数据包括：
   * 1. 基础用户信息（id, username, displayName, avatar, bio, createdAt）
   * 2. 统计数据（作品数、章节数、字数、粉丝数、关注数、获赞数、阅读量）
   * 3. 会员信息（等级、贡献度）
   * 4. 最近成就徽章
   * 5. 当前用户是否关注该用户（认证用户可见）
   *
   * @param targetUserId 目标用户ID
   * @param currentUserId 当前登录用户ID（可选，用于判断是否关注）
   * @returns 用户公开主页数据
   */
  async getUserPublicProfile(
    targetUserId: string,
    currentUserId?: string,
  ): Promise<UserPublicProfileResponseDto> {
    try {
      // 获取用户基础信息
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const user = await (this.prisma as any).user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          bio: true,
          createdAt: true,
          memberLevel: true,
          contributionScore: true,
          profile: {
            select: {
              backgroundImage: true,
              website: true,
              location: true,
              gender: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      // 获取用户作品统计（已发布的作品）
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const worksStats = await (this.prisma as any).work.aggregate({
        where: {
          authorId: targetUserId,
          status: { in: ['PUBLISHED', 'COMPLETED'] },
          isDeleted: false,
        },
        _count: { id: true },
        _sum: {
          wordCount: true,
          viewCount: true,
          likeCount: true,
        },
      });

      // 获取用户章节统计（已发布的章节）
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const chaptersCount = await (this.prisma as any).chapter.count({
        where: {
          authorId: targetUserId,
          status: 'PUBLISHED',
          isDeleted: false,
        },
      });

      // 获取用户发布的Card获得的点赞数
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const cardsLikes = await (this.prisma as any).card.aggregate({
        where: {
          authorId: targetUserId,
          isDeleted: false,
        },
        _sum: {
          likeCount: true,
        },
      });

      // 获取粉丝数和关注数
      const followCounts = await this.getFollowCounts(targetUserId);

      // 构建统计数据
      const statistics = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        totalWorks: worksStats._count?.id || 0,
        totalChapters: chaptersCount || 0,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        totalWordCount: worksStats._sum?.wordCount || 0,
        // 粉丝数和关注数
        totalFollowers: followCounts.followersCount,
        totalFollowing: followCounts.followingCount,
        // 获得的总点赞数 = 作品点赞 + Card点赞

        totalLikesReceived:
          (worksStats._sum?.likeCount || 0) + (cardsLikes._sum?.likeCount || 0),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        totalViewsReceived: worksStats._sum?.viewCount || 0,
      };

      // 判断是否是创作者（有发布过作品）
      const isCreator = statistics.totalWorks > 0;

      // 判断当前用户是否关注了目标用户
      let isFollowing: boolean | null = null;
      if (currentUserId) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const followRecord = await (this.prisma as any).follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUserId,
              followingId: targetUserId,
            },
          },
        });
        isFollowing = !!followRecord;
      }

      // 最近成就徽章 - 目前没有成就系统，返回空数组
      const recentBadges: UserPublicProfileResponseDto['recentBadges'] = [];

      return {
        user: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          id: user.id as string,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          username: user.username as string,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          displayName: user.displayName as string | null,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          avatar: user.avatar as string | null,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          bio: user.bio as string | null,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          createdAt: user.createdAt as Date,
        },
        statistics,
        membership: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          level: user.memberLevel,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          contributionScore: user.contributionScore as number,
        },
        recentBadges,
        isFollowing,
        isCreator,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        profile: user.profile as UserPublicProfileResponseDto['profile'],
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user public profile: ${errorMessage}`);
      throw new InternalServerErrorException('获取用户主页数据失败');
    }
  }

  /**
   * 获取用户动态列表
   * 需求17验收标准4: WHEN 用户查看动态列表 THEN System SHALL 显示发布的Card和引用历史
   *
   * 聚合以下活动类型：
   * - WORK_PUBLISHED: 发布新作品
   * - CHAPTER_PUBLISHED: 发布新章节
   * - CARD_POSTED: 发布广场卡片
   * - COMMENT_POSTED: 发布评论
   * - WORK_LIKED: 点赞作品（通过Like表）
   * - CARD_LIKED: 点赞卡片
   * - ACTIVITY_JOINED: 参与活动
   *
   * @param targetUserId 目标用户ID
   * @param query 查询参数（分页、类型过滤）
   * @returns 用户动态列表
   */
  async getUserActivities(
    targetUserId: string,
    query: UserActivitiesQueryDto,
  ): Promise<UserActivitiesResponseDto> {
    const { page = 1, pageSize = 20, type } = query;

    try {
      // 验证用户是否存在
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const userExists = await (this.prisma as any).user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });

      if (!userExists) {
        throw new NotFoundException('用户不存在');
      }

      // 收集所有活动
      const allActivities: UserActivityItem[] = [];

      // 根据类型过滤决定查询哪些表
      const shouldQuery = (activityType: UserActivityType) =>
        !type || type === activityType;

      // 1. 查询发布的作品 (WORK_PUBLISHED)
      if (shouldQuery(UserActivityType.WORK_PUBLISHED)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const works = await (this.prisma as any).work.findMany({
          where: {
            authorId: targetUserId,
            status: { in: ['PUBLISHED', 'COMPLETED'] },
            isDeleted: false,
            publishedAt: { not: null },
          },
          select: {
            id: true,
            title: true,
            coverImage: true,
            publishedAt: true,
          },
          orderBy: { publishedAt: 'desc' },
          take: 100, // 限制查询数量
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        works.forEach((work: any) => {
          allActivities.push({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            id: `work_${work.id}`,
            type: UserActivityType.WORK_PUBLISHED,
            typeName: USER_ACTIVITY_TYPE_NAMES[UserActivityType.WORK_PUBLISHED],
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            createdAt: work.publishedAt,
            work: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              id: work.id,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              title: work.title,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              coverImage: work.coverImage,
            },
          });
        });
      }

      // 2. 查询发布的章节 (CHAPTER_PUBLISHED)
      if (shouldQuery(UserActivityType.CHAPTER_PUBLISHED)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const chapters = await (this.prisma as any).chapter.findMany({
          where: {
            authorId: targetUserId,
            status: 'PUBLISHED',
            isDeleted: false,
            publishedAt: { not: null },
          },
          select: {
            id: true,
            title: true,
            publishedAt: true,
            work: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { publishedAt: 'desc' },
          take: 100,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        chapters.forEach((chapter: any) => {
          allActivities.push({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            id: `chapter_${chapter.id}`,
            type: UserActivityType.CHAPTER_PUBLISHED,
            typeName:
              USER_ACTIVITY_TYPE_NAMES[UserActivityType.CHAPTER_PUBLISHED],
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            createdAt: chapter.publishedAt,
            chapter: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              id: chapter.id,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              title: chapter.title,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              workId: chapter.work.id,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              workTitle: chapter.work.title,
            },
          });
        });
      }

      // 3. 查询发布的卡片 (CARD_POSTED)
      if (shouldQuery(UserActivityType.CARD_POSTED)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const cards = await (this.prisma as any).card.findMany({
          where: {
            authorId: targetUserId,
            isDeleted: false,
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        cards.forEach((card: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const content: string = card.content || '';
          allActivities.push({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            id: `card_${card.id}`,
            type: UserActivityType.CARD_POSTED,
            typeName: USER_ACTIVITY_TYPE_NAMES[UserActivityType.CARD_POSTED],
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            createdAt: card.createdAt,
            card: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              id: card.id,
              contentPreview:
                content.length > 100
                  ? content.substring(0, 100) + '...'
                  : content,
            },
          });
        });
      }

      // 4. 查询发布的评论 (COMMENT_POSTED)
      if (shouldQuery(UserActivityType.COMMENT_POSTED)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const comments = await (this.prisma as any).comment.findMany({
          where: {
            authorId: targetUserId,
            isDeleted: false,
          },
          select: {
            id: true,
            content: true,
            cardId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        comments.forEach((comment: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const content: string = comment.content || '';
          allActivities.push({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            id: `comment_${comment.id}`,
            type: UserActivityType.COMMENT_POSTED,
            typeName: USER_ACTIVITY_TYPE_NAMES[UserActivityType.COMMENT_POSTED],
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            createdAt: comment.createdAt,
            comment: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              id: comment.id,
              contentPreview:
                content.length > 100
                  ? content.substring(0, 100) + '...'
                  : content,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              cardId: comment.cardId,
            },
          });
        });
      }

      // 5. 查询点赞的卡片 (CARD_LIKED)
      if (shouldQuery(UserActivityType.CARD_LIKED)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const cardLikes = await (this.prisma as any).like.findMany({
          where: {
            userId: targetUserId,
            targetType: 'CARD',
          },
          select: {
            id: true,
            targetId: true,
            createdAt: true,
            card: {
              select: {
                id: true,
                content: true,
                author: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatar: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        cardLikes.forEach((like: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (like.card) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const content: string = like.card.content || '';
            allActivities.push({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              id: `like_card_${like.id}`,
              type: UserActivityType.CARD_LIKED,
              typeName: USER_ACTIVITY_TYPE_NAMES[UserActivityType.CARD_LIKED],
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              createdAt: like.createdAt,
              card: {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                id: like.card.id,
                contentPreview:
                  content.length > 100
                    ? content.substring(0, 100) + '...'
                    : content,
              },
              targetUser: {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                id: like.card.author.id,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                username: like.card.author.username,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                displayName: like.card.author.displayName,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                avatar: like.card.author.avatar,
              },
            });
          }
        });
      }

      // 6. 查询参与的活动 (ACTIVITY_JOINED)
      if (shouldQuery(UserActivityType.ACTIVITY_JOINED)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const participations = await (
          this.prisma as any
        ).activityParticipation.findMany({
          where: {
            userId: targetUserId,
          },
          select: {
            id: true,
            createdAt: true,
            activity: {
              select: {
                id: true,
                title: true,
                coverImage: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        participations.forEach((participation: any) => {
          allActivities.push({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            id: `activity_${participation.id}`,
            type: UserActivityType.ACTIVITY_JOINED,
            typeName:
              USER_ACTIVITY_TYPE_NAMES[UserActivityType.ACTIVITY_JOINED],
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            createdAt: participation.createdAt,
            activity: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              id: participation.activity.id,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              title: participation.activity.title,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              coverImage: participation.activity.coverImage,
            },
          });
        });
      }

      // 按时间倒序排序所有活动
      allActivities.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // 计算分页
      const total = allActivities.length;
      const totalPages = Math.ceil(total / pageSize);
      const skip = (page - 1) * pageSize;
      const paginatedActivities = allActivities.slice(skip, skip + pageSize);

      return {
        activities: paginatedActivities,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user activities: ${errorMessage}`);
      throw new InternalServerErrorException('获取用户动态列表失败');
    }
  }

  // ==================== 关注系统方法 ====================

  /**
   * 关注用户
   * 需求17验收标准: 关注/粉丝列表 API
   *
   * @param followerId 关注者ID（当前用户）
   * @param followingId 被关注者ID（目标用户）
   * @returns 关注操作结果
   */
  async followUser(
    followerId: string,
    followingId: string,
  ): Promise<FollowActionResponseDto> {
    // 不能关注自己
    if (followerId === followingId) {
      throw new BadRequestException('不能关注自己');
    }

    try {
      // 检查目标用户是否存在
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const targetUser = await (this.prisma as any).user.findUnique({
        where: { id: followingId },
        select: { id: true },
      });

      if (!targetUser) {
        throw new NotFoundException('目标用户不存在');
      }

      // 检查是否已经关注
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const existingFollow = await (this.prisma as any).follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      if (existingFollow) {
        throw new ConflictException('已经关注了该用户');
      }

      // 创建关注关系
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).follow.create({
        data: {
          followerId,
          followingId,
        },
      });

      // 获取更新后的关注数
      const counts = await this.getFollowCounts(followingId);

      // 追踪被关注用户的粉丝成就进度
      // 需求24.5.1: 粉丝成就（初有粉丝→顶流达人）
      try {
        await this.achievementProgressService.trackFollowerCount(followingId, 1);
      } catch (achievementError) {
        // 成就追踪失败不影响关注操作
        this.logger.warn(
          `Failed to track follower achievement for user ${followingId}: ${achievementError}`,
        );
      }

      this.logger.log(`User ${followerId} followed user ${followingId}`);

      return {
        message: '关注成功',
        isFollowing: true,
        followersCount: counts.followersCount,
        followingCount: counts.followingCount,
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to follow user: ${errorMessage}`);
      throw new InternalServerErrorException('关注失败');
    }
  }

  /**
   * 取消关注用户
   * 需求17验收标准: 关注/粉丝列表 API
   *
   * @param followerId 关注者ID（当前用户）
   * @param followingId 被关注者ID（目标用户）
   * @returns 取消关注操作结果
   */
  async unfollowUser(
    followerId: string,
    followingId: string,
  ): Promise<FollowActionResponseDto> {
    // 不能取消关注自己
    if (followerId === followingId) {
      throw new BadRequestException('不能取消关注自己');
    }

    try {
      // 检查目标用户是否存在
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const targetUser = await (this.prisma as any).user.findUnique({
        where: { id: followingId },
        select: { id: true },
      });

      if (!targetUser) {
        throw new NotFoundException('目标用户不存在');
      }

      // 检查是否已经关注
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const existingFollow = await (this.prisma as any).follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      if (!existingFollow) {
        throw new BadRequestException('尚未关注该用户');
      }

      // 删除关注关系
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      // 获取更新后的关注数
      const counts = await this.getFollowCounts(followingId);

      this.logger.log(`User ${followerId} unfollowed user ${followingId}`);

      return {
        message: '取消关注成功',
        isFollowing: false,
        followersCount: counts.followersCount,
        followingCount: counts.followingCount,
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to unfollow user: ${errorMessage}`);
      throw new InternalServerErrorException('取消关注失败');
    }
  }

  /**
   * 获取用户的粉丝列表
   * 需求17验收标准: 关注/粉丝列表 API
   *
   * @param targetUserId 目标用户ID
   * @param query 分页参数
   * @param currentUserId 当前登录用户ID（可选）
   * @returns 粉丝列表
   */
  async getFollowers(
    targetUserId: string,
    query: FollowListQueryDto,
    currentUserId?: string,
  ): Promise<FollowListResponseDto> {
    const { page = 1, pageSize = 20 } = query;

    try {
      // 检查目标用户是否存在
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const targetUser = await (this.prisma as any).user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });

      if (!targetUser) {
        throw new NotFoundException('用户不存在');
      }

      // 获取粉丝总数
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const total = await (this.prisma as any).follow.count({
        where: { followingId: targetUserId },
      });

      // 获取粉丝列表（关注我的人）
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const followers = await (this.prisma as any).follow.findMany({
        where: { followingId: targetUserId },
        select: {
          createdAt: true,
          follower: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              bio: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // 如果当前用户已登录，获取关注状态
      let currentUserFollowing: Set<string> = new Set();
      let currentUserFollowers: Set<string> = new Set();

      if (currentUserId) {
        // 获取当前用户关注的人
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const followingList = await (this.prisma as any).follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true },
        });

        currentUserFollowing = new Set(
          followingList.map((f: any) => f.followingId as string),
        );

        // 获取关注当前用户的人
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const followersList = await (this.prisma as any).follow.findMany({
          where: { followingId: currentUserId },
          select: { followerId: true },
        });

        currentUserFollowers = new Set(
          followersList.map((f: any) => f.followerId as string),
        );
      }

      // 构建响应数据
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const items: FollowListItem[] = followers.map((follow: any) => ({
        user: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          id: follow.follower.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          username: follow.follower.username,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          displayName: follow.follower.displayName,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          avatar: follow.follower.avatar,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          bio: follow.follower.bio,
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        followedAt: follow.createdAt,

        isFollowing: currentUserId
          ? currentUserFollowing.has(follow.follower.id as string)
          : null,

        isFollowedBy: currentUserId
          ? currentUserFollowers.has(follow.follower.id as string)
          : null,
      }));

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get followers: ${errorMessage}`);
      throw new InternalServerErrorException('获取粉丝列表失败');
    }
  }

  /**
   * 获取用户的关注列表
   * 需求17验收标准: 关注/粉丝列表 API
   *
   * @param targetUserId 目标用户ID
   * @param query 分页参数
   * @param currentUserId 当前登录用户ID（可选）
   * @returns 关注列表
   */
  async getFollowing(
    targetUserId: string,
    query: FollowListQueryDto,
    currentUserId?: string,
  ): Promise<FollowListResponseDto> {
    const { page = 1, pageSize = 20 } = query;

    try {
      // 检查目标用户是否存在
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const targetUser = await (this.prisma as any).user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });

      if (!targetUser) {
        throw new NotFoundException('用户不存在');
      }

      // 获取关注总数
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const total = await (this.prisma as any).follow.count({
        where: { followerId: targetUserId },
      });

      // 获取关注列表（我关注的人）
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const following = await (this.prisma as any).follow.findMany({
        where: { followerId: targetUserId },
        select: {
          createdAt: true,
          following: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              bio: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // 如果当前用户已登录，获取关注状态
      let currentUserFollowing: Set<string> = new Set();
      let currentUserFollowers: Set<string> = new Set();

      if (currentUserId) {
        // 获取当前用户关注的人
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const followingList = await (this.prisma as any).follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true },
        });

        currentUserFollowing = new Set(
          followingList.map((f: any) => f.followingId as string),
        );

        // 获取关注当前用户的人
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const followersList = await (this.prisma as any).follow.findMany({
          where: { followingId: currentUserId },
          select: { followerId: true },
        });

        currentUserFollowers = new Set(
          followersList.map((f: any) => f.followerId as string),
        );
      }

      // 构建响应数据
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const items: FollowListItem[] = following.map((follow: any) => ({
        user: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          id: follow.following.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          username: follow.following.username,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          displayName: follow.following.displayName,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          avatar: follow.following.avatar,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          bio: follow.following.bio,
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        followedAt: follow.createdAt,

        isFollowing: currentUserId
          ? currentUserFollowing.has(follow.following.id as string)
          : null,

        isFollowedBy: currentUserId
          ? currentUserFollowers.has(follow.following.id as string)
          : null,
      }));

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get following: ${errorMessage}`);
      throw new InternalServerErrorException('获取关注列表失败');
    }
  }

  /**
   * 获取关注状态
   * 检查当前用户与目标用户之间的关注关系
   *
   * @param currentUserId 当前用户ID
   * @param targetUserId 目标用户ID
   * @returns 关注状态
   */
  async getFollowStatus(
    currentUserId: string,
    targetUserId: string,
  ): Promise<FollowStatusResponseDto> {
    try {
      // 检查当前用户是否关注了目标用户
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const isFollowing = await (this.prisma as any).follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUserId,
          },
        },
      });

      // 检查目标用户是否关注了当前用户
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const isFollowedBy = await (this.prisma as any).follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetUserId,
            followingId: currentUserId,
          },
        },
      });

      return {
        isFollowing: !!isFollowing,
        isFollowedBy: !!isFollowedBy,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get follow status: ${errorMessage}`);
      throw new InternalServerErrorException('获取关注状态失败');
    }
  }

  /**
   * 获取用户的收藏列表（公开）
   * 需求17验收标准: 收藏列表 API
   *
   * 用于用户主页展示收藏的作品列表
   * 目前所有阅读列表都是公开的，未来可以添加隐私设置
   *
   * @param targetUserId 目标用户ID
   * @param query 查询参数（分页、状态过滤）
   * @returns 用户收藏列表
   */
  async getUserFavorites(
    targetUserId: string,
    query: UserFavoritesQueryDto,
  ): Promise<UserFavoritesResponseDto> {
    const { page = 1, pageSize = 20, status } = query;

    try {
      // 验证用户是否存在
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const userExists = await (this.prisma as any).user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });

      if (!userExists) {
        throw new NotFoundException('用户不存在');
      }

      // 构建查询条件
      const whereCondition: Record<string, unknown> = {
        userId: targetUserId,
      };

      // 如果指定了状态过滤
      if (status) {
        whereCondition.status = status;
      }

      // 获取总数
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const total = await (this.prisma as any).readingListItem.count({
        where: whereCondition,
      });

      // 获取收藏列表
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const readingListItems = await (
        this.prisma as any
      ).readingListItem.findMany({
        where: whereCondition,
        select: {
          id: true,
          status: true,
          createdAt: true,
          work: {
            select: {
              id: true,
              title: true,
              coverImage: true,
              contentType: true,
              status: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // 构建响应数据
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const items: FavoriteItemResponse[] = readingListItems.map(
        (item: any) => ({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          id: item.id,
          work: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            id: item.work.id,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            title: item.work.title,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            coverImage: item.work.coverImage,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            contentType: item.work.contentType,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            status: item.work.status,
            author: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              id: item.work.author.id,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              username: item.work.author.username,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              displayName: item.work.author.displayName,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              avatar: item.work.author.avatar,
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          readingStatus: item.status as ReadingListStatus,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          addedAt: item.createdAt,
        }),
      );

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user favorites: ${errorMessage}`);
      throw new InternalServerErrorException('获取用户收藏列表失败');
    }
  }

  /**
   * 获取用户的关注数和粉丝数
   *
   * @param userId 用户ID
   * @returns 关注数和粉丝数
   */
  private async getFollowCounts(
    userId: string,
  ): Promise<{ followersCount: number; followingCount: number }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const followersCount = await (this.prisma as any).follow.count({
      where: { followingId: userId },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const followingCount = await (this.prisma as any).follow.count({
      where: { followerId: userId },
    });

    return { followersCount, followingCount };
  }
}
