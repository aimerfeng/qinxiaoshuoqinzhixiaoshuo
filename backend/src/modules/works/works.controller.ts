import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WorksService } from './works.service.js';
import { CreateWorkDto, CreateWorkResponseDto } from './dto/index.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

/**
 * 作品控制器
 * 处理作品管理相关的 HTTP 请求
 *
 * API 路径: /api/v1/works
 *
 * 需求2: 作品管理与版本控制（类Git共创系统）
 */
@Controller('works')
export class WorksController {
  constructor(private readonly worksService: WorksService) {}

  /**
   * 创建新作品
   * POST /api/v1/works
   *
   * 需求2验收标准1: WHEN Creator 创建新作品 THEN System SHALL 初始化 Main_Branch 并生成唯一作品标识
   * 需求2验收标准6: WHILE 作品处于草稿状态 THEN System SHALL 仅对 Creator 可见
   * 需求2验收标准7: WHEN Creator 设置作品元信息 THEN System SHALL 保存标题、简介、封面、标签等信息
   *
   * 请求体:
   * - title: 作品标题（必填，1-100字符）
   * - description: 作品简介（可选，最多2000字符）
   * - type: 作品类型（必填，NOVEL 或 MANGA）
   * - category: 作品分类（可选）
   * - tags: 标签数组（可选，最多10个）
   * - coverImage: 封面图片URL（可选）
   *
   * @param req 请求对象（包含认证用户信息）
   * @param createWorkDto 创建作品数据
   * @returns 创建的作品信息
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createWork(
    @Request() req: any,
    @Body() createWorkDto: CreateWorkDto,
  ): Promise<CreateWorkResponseDto> {
    const authorId = req.user.userId as string;
    return this.worksService.createWork(authorId, createWorkDto);
  }
}
