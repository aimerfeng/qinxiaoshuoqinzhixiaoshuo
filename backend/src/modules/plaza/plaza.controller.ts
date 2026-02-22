import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { PlazaService } from './plaza.service';
import { LikeService } from './like.service';
import { CommentService } from './comment.service';
import { HotScoreService } from './hot-score.service';
import {
  CreateCardDto,
  UpdateCardDto,
  FeedQueryDto,
  CreateCommentDto,
  UpdateCommentDto,
  CardQueryDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    sessionId: string;
  };
}

@Controller('plaza')
export class PlazaController {
  constructor(
    private readonly plazaService: PlazaService,
    private readonly likeService: LikeService,
    private readonly commentService: CommentService,
    private readonly hotScoreService: HotScoreService,
  ) {}

  // ==================== Feed ====================

  /**
   * 获取信息流
   * GET /api/v1/plaza/feed?type=recommend|following|trending&cursor=xxx&limit=20
   */
  @Get('feed')
  @UseGuards(OptionalJwtAuthGuard)
  async getFeed(
    @Req() req: AuthenticatedRequest,
    @Query() query: FeedQueryDto,
  ) {
    const userId = req.user?.id;
    const result = await this.plazaService.getFeed(userId, query);
    return {
      success: true,
      data: result,
    };
  }

  // ==================== Card CRUD ====================

  /**
   * 创建 Card
   * POST /api/v1/plaza/cards
   */
  @Post('cards')
  @UseGuards(JwtAuthGuard)
  async createCard(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCardDto,
  ) {
    const card = await this.plazaService.createCard(req.user!.id, dto);
    return {
      success: true,
      data: card,
    };
  }

  /**
   * 获取单个 Card
   * GET /api/v1/plaza/cards/:cardId
   */
  @Get('cards/:cardId')
  @UseGuards(OptionalJwtAuthGuard)
  async getCard(
    @Req() req: AuthenticatedRequest,
    @Param('cardId') cardId: string,
  ) {
    const userId = req.user?.id;
    const card = await this.plazaService.getCard(cardId, userId);
    return {
      success: true,
      data: card,
    };
  }

  /**
   * 更新 Card
   * PUT /api/v1/plaza/cards/:cardId
   */
  @Put('cards/:cardId')
  @UseGuards(JwtAuthGuard)
  async updateCard(
    @Req() req: AuthenticatedRequest,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
  ) {
    const card = await this.plazaService.updateCard(cardId, req.user!.id, dto);
    return {
      success: true,
      data: card,
    };
  }

  /**
   * 删除 Card
   * DELETE /api/v1/plaza/cards/:cardId
   */
  @Delete('cards/:cardId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteCard(
    @Req() req: AuthenticatedRequest,
    @Param('cardId') cardId: string,
  ) {
    const result = await this.plazaService.deleteCard(cardId, req.user!.id);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 获取用户的 Card 列表
   * GET /api/v1/plaza/users/:userId/cards
   */
  @Get('users/:userId/cards')
  @UseGuards(OptionalJwtAuthGuard)
  async getUserCards(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Query() query: CardQueryDto,
  ) {
    const currentUserId = req.user?.id;
    const result = await this.plazaService.getUserCards(
      userId,
      query,
      currentUserId,
    );
    return {
      success: true,
      data: result,
    };
  }

  // ==================== Like ====================

  /**
   * 点赞 Card
   * POST /api/v1/plaza/cards/:cardId/like
   */
  @Post('cards/:cardId/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async likeCard(
    @Req() req: AuthenticatedRequest,
    @Param('cardId') cardId: string,
  ) {
    const result = await this.likeService.likeCard(req.user!.id, cardId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 取消点赞 Card
   * DELETE /api/v1/plaza/cards/:cardId/like
   */
  @Delete('cards/:cardId/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlikeCard(
    @Req() req: AuthenticatedRequest,
    @Param('cardId') cardId: string,
  ) {
    const result = await this.likeService.unlikeCard(req.user!.id, cardId);
    return {
      success: true,
      data: result,
    };
  }

  // ==================== Comments ====================

  /**
   * 创建评论
   * POST /api/v1/plaza/cards/:cardId/comments
   */
  @Post('cards/:cardId/comments')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Req() req: AuthenticatedRequest,
    @Param('cardId') cardId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const comment = await this.commentService.createComment(
      req.user!.id,
      cardId,
      dto,
    );
    return {
      success: true,
      data: comment,
    };
  }

  /**
   * 获取 Card 的评论列表
   * GET /api/v1/plaza/cards/:cardId/comments?cursor=xxx&limit=20
   */
  @Get('cards/:cardId/comments')
  @UseGuards(OptionalJwtAuthGuard)
  async getComments(
    @Req() req: AuthenticatedRequest,
    @Param('cardId') cardId: string,
    @Query() query: CardQueryDto,
  ) {
    const userId = req.user?.id;
    const result = await this.commentService.getComments(cardId, query, userId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 获取评论的回复列表
   * GET /api/v1/plaza/comments/:commentId/replies?cursor=xxx&limit=20
   */
  @Get('comments/:commentId/replies')
  @UseGuards(OptionalJwtAuthGuard)
  async getReplies(
    @Req() req: AuthenticatedRequest,
    @Param('commentId') commentId: string,
    @Query() query: CardQueryDto,
  ) {
    const userId = req.user?.id;
    const result = await this.commentService.getReplies(
      commentId,
      query,
      userId,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 更新评论
   * PUT /api/v1/plaza/comments/:commentId
   */
  @Put('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @Req() req: AuthenticatedRequest,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    const comment = await this.commentService.updateComment(
      commentId,
      req.user!.id,
      dto,
    );
    return {
      success: true,
      data: comment,
    };
  }

  /**
   * 删除评论
   * DELETE /api/v1/plaza/comments/:commentId
   */
  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @Req() req: AuthenticatedRequest,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.commentService.deleteComment(
      commentId,
      req.user!.id,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 点赞评论
   * POST /api/v1/plaza/comments/:commentId/like
   */
  @Post('comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async likeComment(
    @Req() req: AuthenticatedRequest,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.likeService.likeComment(req.user!.id, commentId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 取消点赞评论
   * DELETE /api/v1/plaza/comments/:commentId/like
   */
  @Delete('comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlikeComment(
    @Req() req: AuthenticatedRequest,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.likeService.unlikeComment(
      req.user!.id,
      commentId,
    );
    return {
      success: true,
      data: result,
    };
  }

  // ==================== Trending ====================

  /**
   * 获取热门话题和内容
   * GET /api/v1/plaza/trending
   */
  @Get('trending')
  @UseGuards(OptionalJwtAuthGuard)
  async getTrending() {
    // 获取热门 Card IDs
    const trendingIds = await this.hotScoreService.getTrendingCardIds(10);

    // TODO: 实现话题系统后添加热门话题
    return {
      success: true,
      data: {
        topics: [],
        cardIds: trendingIds,
        works: [],
      },
    };
  }
}
