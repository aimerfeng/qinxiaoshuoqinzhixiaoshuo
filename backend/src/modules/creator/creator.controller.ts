import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreatorService } from './creator.service.js';
import {
  DashboardResponseDto,
  WorkStatsResponseDto,
  CreateDraftDto,
  DraftResponseDto,
  DraftListResponseDto,
  UploadImageResponseDto,
} from './dto/index.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UploadService } from '../../storage/upload.service.js';

/**
 * 创作者控制台控制器
 *
 * API 路径: /api/v1/creator
 *
 * 需求6: 创作者控制台
 */
@Controller('creator')
@UseGuards(JwtAuthGuard)
export class CreatorController {
  constructor(
    private readonly creatorService: CreatorService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * 获取创作者仪表板数据
   * GET /api/v1/creator/dashboard
   *
   * 需求6验收标准1: WHEN Creator 进入控制台 THEN System SHALL 展示作品列表和数据概览仪表板
   * 需求6验收标准6: WHEN Creator 查看作品数据 THEN System SHALL 显示阅读量、点赞数、引用数等统计
   *
   * 返回数据包括:
   * - 作品列表
   * - 总阅读量、点赞数、引用数、章节数
   * - 近7天统计数据
   * - 热门作品（按阅读量排序）
   * - 近期活动
   */
  @Get('dashboard')
  async getDashboard(
    @Request() req: { user: { userId: string } },
  ): Promise<DashboardResponseDto> {
    return this.creatorService.getDashboard(req.user.userId);
  }

  /**
   * 获取作品详细统计数据
   * GET /api/v1/creator/works/:workId/stats
   *
   * 需求6验收标准6: WHEN Creator 查看作品数据 THEN System SHALL 显示阅读量、点赞数、引用数等统计
   * 需求13: 创作者数据分析
   *
   * 返回数据包括:
   * - 总阅读量、点赞数、引用数、评论数
   * - 章节统计（阅读量、完成率）
   * - 阅读趋势（日/周/月）
   * - 热门引用段落
   * - 读者活跃时段分布
   */
  @Get('works/:workId/stats')
  async getWorkStats(
    @Param('workId') workId: string,
    @Request() req: { user: { userId: string } },
  ): Promise<WorkStatsResponseDto> {
    const stats = await this.creatorService.getWorkStats(
      workId,
      req.user.userId,
    );

    if (!stats) {
      throw new NotFoundException('作品不存在或您没有权限查看');
    }

    return stats;
  }

  // ==================== 草稿管理 API ====================

  /**
   * 创建或更新草稿
   * POST /api/v1/creator/drafts
   *
   * 需求6验收标准3: WHEN Creator 在 Editor 中输入内容 THEN System SHALL 实时自动保存草稿
   * 需求6验收标准9: WHILE Editor 处于编辑状态 THEN System SHALL 每30秒自动保存一次草稿
   *
   * 支持自动保存场景：
   * - 前端编辑器每30秒调用此接口保存草稿
   * - 如果提供 workId 和 chapterId，则更新对应的草稿
   * - 如果不提供，则创建新草稿
   */
  @Post('drafts')
  async createOrUpdateDraft(
    @Body() dto: CreateDraftDto,
    @Request() req: { user: { userId: string } },
  ): Promise<DraftResponseDto> {
    return this.creatorService.createOrUpdateDraft(req.user.userId, dto);
  }

  /**
   * 获取用户的草稿列表
   * GET /api/v1/creator/drafts
   *
   * 返回用户所有未删除的草稿，按最后保存时间倒序排列
   */
  @Get('drafts')
  async getDraftList(
    @Request() req: { user: { userId: string } },
  ): Promise<DraftListResponseDto> {
    return this.creatorService.getDraftList(req.user.userId);
  }

  /**
   * 获取单个草稿详情
   * GET /api/v1/creator/drafts/:draftId
   *
   * 返回草稿的完整内容，用于恢复编辑状态
   */
  @Get('drafts/:draftId')
  async getDraft(
    @Param('draftId') draftId: string,
    @Request() req: { user: { userId: string } },
  ): Promise<DraftResponseDto> {
    const draft = await this.creatorService.getDraft(draftId, req.user.userId);

    if (!draft) {
      throw new NotFoundException('草稿不存在或您没有权限查看');
    }

    return draft;
  }

  /**
   * 删除草稿
   * DELETE /api/v1/creator/drafts/:draftId
   *
   * 软删除草稿，不会真正从数据库中删除
   */
  @Delete('drafts/:draftId')
  async deleteDraft(
    @Param('draftId') draftId: string,
    @Request() req: { user: { userId: string } },
  ): Promise<{ success: boolean; message: string }> {
    const deleted = await this.creatorService.deleteDraft(
      draftId,
      req.user.userId,
    );

    if (!deleted) {
      throw new NotFoundException('草稿不存在或您没有权限删除');
    }

    return {
      success: true,
      message: '草稿已删除',
    };
  }

  // ==================== 图片上传 API ====================

  /**
   * 上传编辑器图片
   * POST /api/v1/creator/upload/image
   *
   * 任务 8.1.4: 图片上传 API
   *
   * 功能：
   * - 接受 multipart/form-data 格式的图片文件
   * - 验证文件类型（jpg, png, gif, webp）
   * - 验证文件大小（最大 5MB）
   * - 图片存储在 chapter-images 目录
   * - 返回上传后的图片 URL
   */
  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: { userId: string } },
  ): Promise<UploadImageResponseDto> {
    if (!file) {
      throw new BadRequestException('请选择要上传的图片文件');
    }

    const fileInput = {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };

    const result = await this.uploadService.uploadChapterImage(
      req.user.userId,
      fileInput,
    );

    return {
      success: true,
      url: result.publicUrl,
      size: result.size,
      contentType: result.contentType,
    };
  }
}
