import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RevenueService } from './revenue.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TipBranchDto, TipResultDto } from './dto/index.js';

/**
 * 认证请求类型
 */
interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

/**
 * 收益分配控制器
 *
 * 需求6: 收益分配系统
 * - 打赏分支内容
 * - 收益按比例分配给平台、库拥有者、分支创作者
 *
 * API 端点：
 * - POST /api/v1/branches/:id/tip - 打赏分支
 * - GET /api/v1/branches/:id/tips - 获取分支打赏记录
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
 */
@Controller('branches')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  /**
   * 打赏分支
   * POST /api/v1/branches/:id/tip
   *
   * 需求6验收标准1: WHEN 用户打赏分支内容时，THE Revenue_System SHALL 按以下比例分配：
   * - 平台 30%
   * - 库拥有者 0-30%（可配置）
   * - 分支创作者 40-70%
   *
   * 需求6验收标准3: WHEN 打赏交易完成时，THE Revenue_System SHALL 分别记录到各方钱包
   * 需求6验收标准4: THE Revenue_System SHALL 在打赏记录中保存完整的分配明细
   *
   * @param id 分支ID
   * @param tipDto 打赏数据
   * @param req 认证请求
   * @returns 打赏结果，包含交易ID和分配明细
   *
   * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
   */
  @Post(':id/tip')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async tipBranch(
    @Param('id') id: string,
    @Body() tipDto: TipBranchDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<TipResultDto> {
    const userId = req.user.userId;
    return this.revenueService.tipBranch(id, userId, tipDto);
  }

  /**
   * 获取分支打赏记录
   * GET /api/v1/branches/:id/tips
   *
   * 获取指定分支的打赏历史记录
   *
   * @param id 分支ID
   * @param page 页码（默认: 1）
   * @param limit 每页数量（默认: 20）
   * @returns 打赏记录列表
   */
  @Get(':id/tips')
  @HttpCode(HttpStatus.OK)
  async getBranchTipHistory(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const result = await this.revenueService.getBranchTipHistory(
      id,
      pageNum,
      limitNum,
    );

    return {
      message: '获取打赏记录成功',
      ...result,
    };
  }
}
