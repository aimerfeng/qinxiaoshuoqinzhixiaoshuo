import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DanmakuService } from './danmaku.service';
import {
  CreateDanmakuDto,
  DanmakuResponseDto,
  DanmakuListResponseDto,
} from './dto';

/**
 * 弹幕控制器
 *
 * API 设计:
 * POST   /api/v1/danmaku              — 发送弹幕
 * GET    /api/v1/danmaku/:anchorId    — 获取段落弹幕列表
 * DELETE /api/v1/danmaku/:id          — 删除弹幕
 */
@Controller('api/v1/danmaku')
export class DanmakuController {
  constructor(private readonly danmakuService: DanmakuService) {}

  /**
   * 发送弹幕
   *
   * 需求24.1: 显示弹幕输入框并限制内容在100字以内
   * 需求24.2: 将弹幕绑定到对应 Anchor_ID 并存储到数据库
   * 需求24.7: IF 弹幕内容包含违规词汇 THEN System SHALL 拦截发送并提示修改
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req: any,
    @Body() dto: CreateDanmakuDto,
  ): Promise<DanmakuResponseDto> {
    return this.danmakuService.create(req.user.id, dto);
  }

  /**
   * 获取段落弹幕列表
   *
   * 需求24.3: 使用 Danmaku 引擎在段落上方渲染滚动弹幕
   */
  @Get(':anchorId')
  async findByAnchorId(
    @Param('anchorId') anchorId: string,
    @Query('limit') limit?: string,
  ): Promise<DanmakuListResponseDto> {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.danmakuService.findByAnchorId(anchorId, limitNum);
  }

  /**
   * 批量获取多个段落的弹幕
   */
  @Post('batch')
  async findByAnchorIds(
    @Body() body: { anchorIds: string[]; limit?: number },
  ): Promise<Record<string, DanmakuResponseDto[]>> {
    return this.danmakuService.findByAnchorIds(
      body.anchorIds,
      body.limit || 50,
    );
  }

  /**
   * 删除弹幕
   *
   * 需求24.8: WHEN 用户删除自己的弹幕 THEN System SHALL 标记弹幕为已删除并从渲染列表中移除
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.danmakuService.delete(req.user.id, id);
    return { success: true };
  }
}
