import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Request,
  Param,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  UsersService,
  UserProfileResponse,
  UpdateProfileResponse,
} from './users.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { AvatarUploadResponseDto } from './dto/avatar-upload.dto.js';
import { UserPublicProfileResponseDto } from './dto/user-profile.dto.js';
import {
  UserActivitiesQueryDto,
  UserActivitiesResponseDto,
} from './dto/user-activities.dto.js';
import {
  FollowListQueryDto,
  FollowListResponseDto,
  FollowActionResponseDto,
  FollowStatusResponseDto,
} from './dto/follow.dto.js';
import {
  UserFavoritesQueryDto,
  UserFavoritesResponseDto,
} from './dto/favorites.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';

/**
 * 用户控制器
 * 处理用户资料管理相关的 HTTP 请求
 *
 * API 路径: /api/v1/users
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 获取当前用户资料
   * GET /api/v1/users/profile
   *
   * 需求1验收标准6: 用户可以查看个人资料
   *
   * @param req 请求对象（包含用户信息）
   * @returns 用户资料
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req: any): Promise<UserProfileResponse> {
    const userId = req.user.userId as string;
    return this.usersService.getProfile(userId);
  }

  /**
   * 更新当前用户资料
   * PATCH /api/v1/users/profile
   *
   * 需求1验收标准6: WHEN 用户更新个人资料信息 THEN System SHALL 验证并保存更改
   *
   * 支持更新的字段：
   * - nickname: 昵称
   * - bio: 个人简介
   * - gender: 性别 (MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY)
   * - birthday: 生日 (YYYY-MM-DD 格式)
   *
   * @param req 请求对象（包含用户信息）
   * @param updateProfileDto 更新数据
   * @returns 更新结果
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateProfile(
    @Request() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UpdateProfileResponse> {
    const userId = req.user.userId as string;
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  /**
   * 上传用户头像
   * POST /api/v1/users/avatar
   *
   * 需求1验收标准6: 用户可以更新个人资料（包括头像）
   *
   * 请求格式: multipart/form-data
   * 字段名: file
   *
   * 支持的文件类型: jpg, jpeg, png, gif, webp
   * 最大文件大小: 5MB
   *
   * 处理流程:
   * 1. 验证文件类型和大小
   * 2. 压缩图片并生成缩略图（128x128, 256x256）
   * 3. 上传到S3/MinIO存储
   * 4. 更新用户头像URL
   * 5. 返回新头像URL
   *
   * @param req 请求对象（包含用户信息）
   * @param file 上传的图片文件
   * @returns 头像上传结果
   */
  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<AvatarUploadResponseDto> {
    const userId = req.user.userId as string;
    return this.usersService.uploadAvatar(userId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  /**
   * 获取用户公开主页数据
   * GET /api/v1/users/:userId/profile
   *
   * 需求17验收标准1: WHEN 用户进入个人中心 THEN System SHALL 显示个人资料卡片和功能模块入口
   * 需求17验收标准12: WHEN 他人访问用户主页 THEN System SHALL 显示公开资料和动态
   *
   * 返回数据包括：
   * - 基础用户信息（id, username, displayName, avatar, bio, createdAt）
   * - 统计数据（作品数、章节数、字数、粉丝数、关注数、获赞数、阅读量）
   * - 会员信息（等级、贡献度）
   * - 最近成就徽章（最多5个）
   * - 当前用户是否关注该用户（仅认证用户可见）
   * - 用户资料扩展信息
   *
   * 支持认证和非认证访问：
   * - 认证用户：可以看到是否关注了该用户
   * - 非认证用户：isFollowing 返回 null
   *
   * @param userId 目标用户ID
   * @param req 请求对象（可能包含当前用户信息）
   * @returns 用户公开主页数据
   */
  @Get(':userId/profile')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserPublicProfile(
    @Param('userId') userId: string,
    @Request() req: any,
  ): Promise<UserPublicProfileResponseDto> {
    const currentUserId = req.user?.userId as string | undefined;
    return this.usersService.getUserPublicProfile(userId, currentUserId);
  }

  /**
   * 获取用户动态列表
   * GET /api/v1/users/:userId/activities
   *
   * 需求17验收标准4: WHEN 用户查看动态列表 THEN System SHALL 显示发布的Card和引用历史
   *
   * 查询参数：
   * - page: 页码（默认1）
   * - pageSize: 每页数量（默认20，最大50）
   * - type: 活动类型过滤（可选）
   *
   * 活动类型：
   * - WORK_PUBLISHED: 发布新作品
   * - CHAPTER_PUBLISHED: 发布新章节
   * - CARD_POSTED: 发布广场卡片
   * - COMMENT_POSTED: 发布评论
   * - WORK_LIKED: 点赞作品
   * - CARD_LIKED: 点赞卡片
   * - ACTIVITY_JOINED: 参与活动
   * - ACHIEVEMENT_EARNED: 获得成就（预留）
   *
   * 返回数据包括：
   * - 活动列表（id, type, createdAt, 关联实体信息）
   * - 分页信息（page, pageSize, total, totalPages）
   *
   * @param userId 目标用户ID
   * @param query 查询参数
   * @returns 用户动态列表
   */
  @Get(':userId/activities')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getUserActivities(
    @Param('userId') userId: string,
    @Query() query: UserActivitiesQueryDto,
  ): Promise<UserActivitiesResponseDto> {
    return this.usersService.getUserActivities(userId, query);
  }

  /**
   * 获取用户收藏列表（公开）
   * GET /api/v1/users/:userId/favorites
   *
   * 需求17验收标准: 收藏列表 API
   *
   * 用于用户主页展示收藏的作品列表。
   * 目前所有阅读列表都是公开的，未来可以添加隐私设置。
   *
   * 查询参数：
   * - page: 页码（默认1）
   * - pageSize: 每页数量（默认20，最大50）
   * - status: 阅读状态过滤（可选：WANT_TO_READ, READING, COMPLETED, DROPPED, ON_HOLD）
   *
   * 返回数据包括：
   * - 收藏列表（作品信息、阅读状态、添加时间）
   * - 分页信息（page, pageSize, total, totalPages）
   *
   * @param userId 目标用户ID
   * @param query 查询参数
   * @returns 用户收藏列表
   */
  @Get(':userId/favorites')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getUserFavorites(
    @Param('userId') userId: string,
    @Query() query: UserFavoritesQueryDto,
  ): Promise<UserFavoritesResponseDto> {
    return this.usersService.getUserFavorites(userId, query);
  }

  // ==================== 关注系统 API ====================

  /**
   * 获取用户的粉丝列表
   * GET /api/v1/users/:userId/followers
   *
   * 需求17验收标准: 关注/粉丝列表 API
   *
   * 查询参数：
   * - page: 页码（默认1）
   * - pageSize: 每页数量（默认20，最大50）
   *
   * 返回数据包括：
   * - 粉丝列表（用户基本信息、关注时间、是否互相关注）
   * - 分页信息（page, pageSize, total, totalPages）
   *
   * 支持认证和非认证访问：
   * - 认证用户：可以看到是否关注了列表中的用户
   * - 非认证用户：isFollowing 返回 null
   *
   * @param userId 目标用户ID
   * @param query 分页参数
   * @param req 请求对象（可能包含当前用户信息）
   * @returns 粉丝列表
   */
  @Get(':userId/followers')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getFollowers(
    @Param('userId') userId: string,
    @Query() query: FollowListQueryDto,
    @Request() req: any,
  ): Promise<FollowListResponseDto> {
    const currentUserId = req.user?.userId as string | undefined;
    return this.usersService.getFollowers(userId, query, currentUserId);
  }

  /**
   * 获取用户的关注列表
   * GET /api/v1/users/:userId/following
   *
   * 需求17验收标准: 关注/粉丝列表 API
   *
   * 查询参数：
   * - page: 页码（默认1）
   * - pageSize: 每页数量（默认20，最大50）
   *
   * 返回数据包括：
   * - 关注列表（用户基本信息、关注时间、是否互相关注）
   * - 分页信息（page, pageSize, total, totalPages）
   *
   * 支持认证和非认证访问：
   * - 认证用户：可以看到是否关注了列表中的用户
   * - 非认证用户：isFollowing 返回 null
   *
   * @param userId 目标用户ID
   * @param query 分页参数
   * @param req 请求对象（可能包含当前用户信息）
   * @returns 关注列表
   */
  @Get(':userId/following')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getFollowing(
    @Param('userId') userId: string,
    @Query() query: FollowListQueryDto,
    @Request() req: any,
  ): Promise<FollowListResponseDto> {
    const currentUserId = req.user?.userId as string | undefined;
    return this.usersService.getFollowing(userId, query, currentUserId);
  }

  /**
   * 关注用户
   * POST /api/v1/users/:userId/follow
   *
   * 需求17验收标准: 关注/粉丝列表 API
   *
   * 需要认证。
   * 不能关注自己。
   * 重复关注会返回409冲突错误。
   *
   * @param userId 目标用户ID（被关注者）
   * @param req 请求对象（包含当前用户信息）
   * @returns 关注操作结果
   */
  @Post(':userId/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async followUser(
    @Param('userId') userId: string,
    @Request() req: any,
  ): Promise<FollowActionResponseDto> {
    const currentUserId = req.user.userId as string;
    return this.usersService.followUser(currentUserId, userId);
  }

  /**
   * 取消关注用户
   * DELETE /api/v1/users/:userId/follow
   *
   * 需求17验收标准: 关注/粉丝列表 API
   *
   * 需要认证。
   * 不能取消关注自己。
   * 如果尚未关注，会返回400错误。
   *
   * @param userId 目标用户ID（被取消关注者）
   * @param req 请求对象（包含当前用户信息）
   * @returns 取消关注操作结果
   */
  @Delete(':userId/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unfollowUser(
    @Param('userId') userId: string,
    @Request() req: any,
  ): Promise<FollowActionResponseDto> {
    const currentUserId = req.user.userId as string;
    return this.usersService.unfollowUser(currentUserId, userId);
  }

  /**
   * 获取关注状态
   * GET /api/v1/users/:userId/follow-status
   *
   * 需要认证。
   * 返回当前用户与目标用户之间的关注关系。
   *
   * @param userId 目标用户ID
   * @param req 请求对象（包含当前用户信息）
   * @returns 关注状态
   */
  @Get(':userId/follow-status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getFollowStatus(
    @Param('userId') userId: string,
    @Request() req: any,
  ): Promise<FollowStatusResponseDto> {
    const currentUserId = req.user.userId as string;
    return this.usersService.getFollowStatus(currentUserId, userId);
  }
}
