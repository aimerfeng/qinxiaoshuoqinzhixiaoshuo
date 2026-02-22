import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DanmakuType } from '@prisma/client';
import {
  CreateDanmakuDto,
  DanmakuResponseDto,
  DanmakuListResponseDto,
} from './dto';
import { SensitiveWordService } from './sensitive-word.service';

/**
 * 弹幕服务
 *
 * 需求24: 段落弹幕系统
 */
@Injectable()
export class DanmakuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sensitiveWordService: SensitiveWordService,
  ) {}

  /**
   * 发送弹幕
   *
   * 需求24.1: 显示弹幕输入框并限制内容在100字以内
   * 需求24.2: 将弹幕绑定到对应 Anchor_ID 并存储到数据库
   * 需求24.7: IF 弹幕内容包含违规词汇 THEN System SHALL 拦截发送并提示修改
   */
  async create(
    userId: string,
    dto: CreateDanmakuDto,
  ): Promise<DanmakuResponseDto> {
    // 检查敏感词
    if (this.sensitiveWordService.containsSensitiveWord(dto.content)) {
      const sensitiveWords = this.sensitiveWordService.findSensitiveWords(
        dto.content,
      );
      throw new BadRequestException(
        `弹幕内容包含违规词汇: ${sensitiveWords.join(', ')}，请修改后重试`,
      );
    }

    // 验证 anchorId 对应的段落是否存在
    const paragraph = await this.prisma.paragraph.findUnique({
      where: { anchorId: dto.anchorId },
    });

    if (!paragraph) {
      throw new NotFoundException('段落不存在');
    }

    // 创建弹幕
    const danmaku = await this.prisma.danmaku.create({
      data: {
        anchorId: dto.anchorId,
        authorId: userId,
        content: dto.content,
        color: dto.color || '#FFFFFF',
        type: dto.type || DanmakuType.SCROLL,
        fontSize: dto.fontSize || 24,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
      },
    });

    return this.toDanmakuResponse(danmaku);
  }

  /**
   * 获取段落弹幕列表
   *
   * 需求24.3: 使用 Danmaku 引擎在段落上方渲染滚动弹幕
   */
  async findByAnchorId(
    anchorId: string,
    limit = 100,
  ): Promise<DanmakuListResponseDto> {
    const [items, total] = await Promise.all([
      this.prisma.danmaku.findMany({
        where: {
          anchorId,
          isDeleted: false,
        },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.danmaku.count({
        where: {
          anchorId,
          isDeleted: false,
        },
      }),
    ]);

    return {
      items: items.map((item) => this.toDanmakuResponse(item)),
      total,
      anchorId,
    };
  }

  /**
   * 批量获取多个段落的弹幕
   */
  async findByAnchorIds(
    anchorIds: string[],
    limitPerAnchor = 50,
  ): Promise<Record<string, DanmakuResponseDto[]>> {
    const danmakus = await this.prisma.danmaku.findMany({
      where: {
        anchorId: { in: anchorIds },
        isDeleted: false,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 按 anchorId 分组
    const result: Record<string, DanmakuResponseDto[]> = {};
    for (const anchorId of anchorIds) {
      result[anchorId] = [];
    }

    for (const danmaku of danmakus) {
      if (
        result[danmaku.anchorId] &&
        result[danmaku.anchorId].length < limitPerAnchor
      ) {
        result[danmaku.anchorId].push(this.toDanmakuResponse(danmaku));
      }
    }

    return result;
  }

  /**
   * 删除弹幕
   *
   * 需求24.8: WHEN 用户删除自己的弹幕 THEN System SHALL 标记弹幕为已删除并从渲染列表中移除
   */
  async delete(userId: string, danmakuId: string): Promise<void> {
    const danmaku = await this.prisma.danmaku.findUnique({
      where: { id: danmakuId },
    });

    if (!danmaku) {
      throw new NotFoundException('弹幕不存在');
    }

    if (danmaku.authorId !== userId) {
      throw new ForbiddenException('只能删除自己的弹幕');
    }

    // 软删除
    await this.prisma.danmaku.update({
      where: { id: danmakuId },
      data: { isDeleted: true },
    });
  }

  /**
   * 获取单个弹幕
   */
  async findById(danmakuId: string): Promise<DanmakuResponseDto | null> {
    const danmaku = await this.prisma.danmaku.findUnique({
      where: { id: danmakuId, isDeleted: false },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
      },
    });

    if (!danmaku) {
      return null;
    }

    return this.toDanmakuResponse(danmaku);
  }

  /**
   * 转换为响应 DTO
   */
  private toDanmakuResponse(danmaku: any): DanmakuResponseDto {
    return {
      id: danmaku.id,
      anchorId: danmaku.anchorId,
      authorId: danmaku.authorId,
      authorName: danmaku.author?.displayName || danmaku.author?.username,
      content: danmaku.content,
      color: danmaku.color,
      type: danmaku.type,
      fontSize: danmaku.fontSize,
      likeCount: danmaku.likeCount,
      createdAt: danmaku.createdAt,
    };
  }
}
