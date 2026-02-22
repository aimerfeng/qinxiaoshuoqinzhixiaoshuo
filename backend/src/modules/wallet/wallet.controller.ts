import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WalletService } from './wallet.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type {
  ClaimDailyResponseDto,
  GetClaimStatusResponseDto,
  GetWalletInfoResponseDto,
  TipRequestDto,
  TipResponseDto,
  TransactionQueryDto,
  GetTransactionsResponseDto,
  GetSimpleBalanceResponseDto,
  GetDetailedBalanceResponseDto,
} from './dto/wallet.dto.js';

/**
 * 认证请求类型
 */
interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

/**
 * 钱包控制器
 *
 * 需求15: 零芥子代币系统
 * 任务15.1.2: 每日领取 API
 *
 * API 端点：
 * - POST /api/v1/wallet/claim - 每日领取零芥子
 * - GET /api/v1/wallet/claim/status - 获取领取状态
 * - GET /api/v1/wallet - 获取钱包信息
 */
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * 每日领取零芥子
   * POST /api/v1/wallet/claim
   *
   * 需求15验收标准2: WHEN 用户点击领取 THEN System SHALL 增加账户余额并记录领取日志
   *
   * 每日领取规则：
   * - Lv.0 普通会员 (REGULAR): 不能领取，必须先升级为正式会员
   * - Lv.1 正式会员 (OFFICIAL): 10 零芥子/天
   * - Lv.2 资深会员 (SENIOR): 20 零芥子/天
   * - Lv.3 荣誉会员 (HONORARY): 50 零芥子/天
   *
   * 限制条件：
   * - 每天只能领取一次
   * - 余额达到上限时无法领取
   *
   * @returns 领取结果，包含是否成功、领取金额、新余额
   */
  @Post('claim')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async claimDaily(
    @Request() req: AuthenticatedRequest,
  ): Promise<ClaimDailyResponseDto> {
    const userId = req.user.userId;
    const result = await this.walletService.claimDaily(userId);

    return {
      message: result.message,
      data: result,
    };
  }

  /**
   * 获取每日领取状态
   * GET /api/v1/wallet/claim/status
   *
   * 需求15验收标准1: WHEN 正式会员每日首次登录 THEN System SHALL 显示领取零芥子入口
   *
   * 返回信息：
   * - 今日是否可以领取
   * - 今日是否已领取
   * - 可领取金额
   * - 不能领取的原因（如果不能领取）
   * - 当前余额和余额上限
   *
   * @returns 领取状态信息
   */
  @Get('claim/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getClaimStatus(
    @Request() req: AuthenticatedRequest,
  ): Promise<GetClaimStatusResponseDto> {
    const userId = req.user.userId;
    const status = await this.walletService.getDailyClaimStatus(userId);

    return {
      message: '获取领取状态成功',
      data: status,
    };
  }

  /**
   * 获取钱包信息
   * GET /api/v1/wallet
   *
   * 需求15验收标准5: WHEN 用户查看零芥子钱包 THEN System SHALL 显示余额、收支明细、来源统计
   *
   * 返回信息：
   * - 当前余额
   * - 累计收到
   * - 累计发出
   * - 余额上限
   * - 会员等级信息
   *
   * @returns 钱包信息
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getWalletInfo(
    @Request() req: AuthenticatedRequest,
  ): Promise<GetWalletInfoResponseDto> {
    const userId = req.user.userId;
    const walletInfo = await this.walletService.getWalletInfo(userId);

    return {
      message: '获取钱包信息成功',
      data: walletInfo,
    };
  }

  /**
   * 获取简单余额信息
   * GET /api/v1/wallet/balance
   *
   * 任务15.1.5: 余额查询 API - 简单余额查询
   * 用于快速获取余额信息，不包含来源统计
   *
   * 返回信息：
   * - 当前余额
   * - 累计收到
   * - 累计发出
   * - 余额上限
   *
   * @returns 简单余额信息
   */
  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getSimpleBalance(
    @Request() req: AuthenticatedRequest,
  ): Promise<GetSimpleBalanceResponseDto> {
    const userId = req.user.userId;
    const balance = await this.walletService.getSimpleBalance(userId);

    return {
      message: '获取余额成功',
      data: balance,
    };
  }

  /**
   * 获取详细余额信息（含来源统计）
   * GET /api/v1/wallet/balance/detailed
   *
   * 任务15.1.5: 余额查询 API - 详细余额查询
   * 包含余额信息和按交易类型的来源统计
   *
   * 返回信息：
   * - 当前余额
   * - 累计收到
   * - 累计发出
   * - 余额上限
   * - 来源统计（按交易类型分组）
   *
   * @returns 详细余额信息
   */
  @Get('balance/detailed')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getDetailedBalance(
    @Request() req: AuthenticatedRequest,
  ): Promise<GetDetailedBalanceResponseDto> {
    const userId = req.user.userId;
    const balance = await this.walletService.getDetailedBalance(userId);

    return {
      message: '获取详细余额成功',
      data: balance,
    };
  }

  /**
   * 打赏
   * POST /api/v1/wallet/tip
   *
   * 需求15验收标准3: WHEN 用户打赏作品/章节 THEN System SHALL 扣除零芥子并通知创作者
   * 需求15验收标准8: WHEN 发生零芥子交易 THEN System SHALL 生成包含双方信息的交易记录
   *
   * 打赏规则：
   * - 单次打赏最小: 1 零芥子
   * - 单次打赏上限: 100 零芥子
   * - 每日打赏总额上限: 500 零芥子
   * - 不能给自己打赏
   * - 余额必须充足
   *
   * 请求体：
   * - toUserId: 被打赏用户ID（必填）
   * - amount: 打赏金额（必填）
   * - workId: 关联作品ID（可选）
   * - chapterId: 关联章节ID（可选）
   * - message: 打赏留言（可选）
   *
   * @returns 打赏结果，包含是否成功、打赏金额、新余额
   */
  @Post('tip')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async tip(
    @Request() req: AuthenticatedRequest,
    @Body() tipRequest: TipRequestDto,
  ): Promise<TipResponseDto> {
    const userId = req.user.userId;
    const result = await this.walletService.tip(userId, tipRequest);

    return {
      message: result.message,
      data: result,
    };
  }

  /**
   * 获取交易记录
   * GET /api/v1/wallet/transactions
   *
   * 需求15验收标准5: WHEN 用户查看零芥子钱包 THEN System SHALL 显示余额、收支明细、来源统计
   * 任务15.1.4: 交易记录 API
   *
   * 查询参数：
   * - page: 页码（默认: 1）
   * - pageSize: 每页数量（默认: 20，最大: 100）
   * - type: 交易类型过滤（可选，DAILY_CLAIM/TIP_SENT/TIP_RECEIVED/REWARD/REFUND）
   * - startDate: 开始日期过滤（可选，格式: YYYY-MM-DD）
   * - endDate: 结束日期过滤（可选，格式: YYYY-MM-DD）
   *
   * @returns 交易记录列表和分页信息
   */
  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getTransactions(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<GetTransactionsResponseDto> {
    const userId = req.user.userId;

    // 构建查询参数
    const query: TransactionQueryDto = {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      type: type as TransactionQueryDto['type'],
      startDate,
      endDate,
    };

    const result = await this.walletService.getTransactionHistory(
      userId,
      query,
    );

    return {
      message: '获取交易记录成功',
      data: result,
    };
  }
}
