import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReadingListService } from './reading-list.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AddToReadingListDto,
  UpdateReadingListItemDto,
  ReadingListQueryDto,
  BatchUpdateDto,
  ReadingListResponseDto,
  ReadingListItemResponseDto,
} from './dto';

interface AuthenticatedRequest {
  user: { userId: string };
}

/**
 * 阅读列表控制器
 *
 * 需求12: 阅读列表管理
 * - 12.1.1 阅读列表 CRUD API
 */
@Controller('reading-list')
@UseGuards(JwtAuthGuard)
export class ReadingListController {
  constructor(private readonly readingListService: ReadingListService) {}

  /**
   * 获取阅读列表
   * GET /api/v1/reading-list
   */
  @Get()
  async getList(
    @Request() req: AuthenticatedRequest,
    @Query() query: ReadingListQueryDto,
  ): Promise<ReadingListResponseDto> {
    return this.readingListService.getList(req.user.userId, query);
  }

  /**
   * 检查作品是否在阅读列表中
   * GET /api/v1/reading-list/check/:workId
   */
  @Get('check/:workId')
  async checkInList(
    @Request() req: AuthenticatedRequest,
    @Param('workId') workId: string,
  ): Promise<{ inList: boolean; item?: ReadingListItemResponseDto }> {
    const item = await this.readingListService.getItem(req.user.userId, workId);
    return {
      inList: !!item,
      item: item || undefined,
    };
  }

  /**
   * 添加到阅读列表
   * POST /api/v1/reading-list
   */
  @Post()
  async addToList(
    @Request() req: AuthenticatedRequest,
    @Body() dto: AddToReadingListDto,
  ): Promise<ReadingListItemResponseDto> {
    return this.readingListService.addToList(req.user.userId, dto);
  }

  /**
   * 更新阅读列表项
   * PATCH /api/v1/reading-list/:id
   */
  @Patch(':id')
  async updateItem(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateReadingListItemDto,
  ): Promise<ReadingListItemResponseDto> {
    return this.readingListService.updateItem(req.user.userId, id, dto);
  }

  /**
   * 从阅读列表移除
   * DELETE /api/v1/reading-list/:id
   */
  @Delete(':id')
  async removeFromList(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const success = await this.readingListService.removeFromList(
      req.user.userId,
      id,
    );
    return { success };
  }

  /**
   * 批量更新状态
   * POST /api/v1/reading-list/batch-update
   */
  @Post('batch-update')
  @HttpCode(HttpStatus.OK)
  async batchUpdate(
    @Request() req: AuthenticatedRequest,
    @Body() dto: BatchUpdateDto,
  ): Promise<{ success: boolean; count: number }> {
    let count = 0;

    if (dto.status) {
      count = await this.readingListService.batchUpdateStatus(
        req.user.userId,
        dto.itemIds,
        dto.status,
      );
    } else if (dto.markAsRead) {
      count = await this.readingListService.batchClearUpdates(
        req.user.userId,
        dto.itemIds,
      );
    }

    return { success: true, count };
  }
}
