import { Prisma } from '@prisma/client';

/**
 * 支持软删除的模型列表
 * 这些模型都有 isDeleted 字段
 */
export const SOFT_DELETE_MODELS = [
  'Work',
  'Chapter',
  'Paragraph',
  'Card',
  'Comment',
  'Danmaku',
  'MangaPage',
] as const;

export type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

/**
 * 检查模型是否支持软删除
 */
export function isSoftDeleteModel(model: string): model is SoftDeleteModel {
  return SOFT_DELETE_MODELS.includes(model as SoftDeleteModel);
}

/**
 * 软删除中间件参数
 *
 * 注意：Prisma 7.x 移除了 $use 中间件 API
 * 此配置仅用于文档目的，实际软删除需要在查询时显式处理
 */
export interface SoftDeleteMiddlewareOptions {
  /** 是否在查询时自动过滤已删除记录，默认 true */
  autoFilter?: boolean;
  /** 是否将 delete 操作转换为软删除，默认 true */
  convertDelete?: boolean;
}

// 定义通用的上下文类型
type PrismaModelContext = {
  update: (args: unknown) => Promise<unknown>;
  updateMany: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown>;
  $parent: Record<string, { delete: (args: unknown) => Promise<unknown> }>;
  $name: string;
};

/**
 * 软删除扩展方法
 * 提供额外的软删除相关操作
 *
 * 使用方式：
 * ```typescript
 * const prisma = new PrismaClient().$extends(softDeleteExtension);
 * ```
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  model: {
    $allModels: {
      /**
       * 软删除单条记录
       */
      softDelete<T>(
        this: T,
        where: Prisma.Args<T, 'update'>['where'],
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'update'>, 'update'>> {
        const context = Prisma.getExtensionContext(
          this,
        ) as unknown as PrismaModelContext;
        return context.update({
          where,
          data: { isDeleted: true },
        }) as Promise<Prisma.Result<T, Prisma.Args<T, 'update'>, 'update'>>;
      },

      /**
       * 软删除多条记录
       */
      softDeleteMany<T>(
        this: T,
        where: Prisma.Args<T, 'updateMany'>['where'],
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'updateMany'>, 'updateMany'>> {
        const context = Prisma.getExtensionContext(
          this,
        ) as unknown as PrismaModelContext;
        return context.updateMany({
          where,
          data: { isDeleted: true },
        }) as Promise<
          Prisma.Result<T, Prisma.Args<T, 'updateMany'>, 'updateMany'>
        >;
      },

      /**
       * 恢复软删除的记录
       */
      restore<T>(
        this: T,
        where: Prisma.Args<T, 'update'>['where'],
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'update'>, 'update'>> {
        const context = Prisma.getExtensionContext(
          this,
        ) as unknown as PrismaModelContext;
        return context.update({
          where: { ...where, isDeleted: true },
          data: { isDeleted: false },
        }) as Promise<Prisma.Result<T, Prisma.Args<T, 'update'>, 'update'>>;
      },

      /**
       * 恢复多条软删除的记录
       */
      restoreMany<T>(
        this: T,
        where: Prisma.Args<T, 'updateMany'>['where'],
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'updateMany'>, 'updateMany'>> {
        const context = Prisma.getExtensionContext(
          this,
        ) as unknown as PrismaModelContext;
        return context.updateMany({
          where: { ...where, isDeleted: true },
          data: { isDeleted: false },
        }) as Promise<
          Prisma.Result<T, Prisma.Args<T, 'updateMany'>, 'updateMany'>
        >;
      },

      /**
       * 查找包括已删除的记录
       */
      findManyWithDeleted<T>(
        this: T,
        args?: Prisma.Args<T, 'findMany'>,
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'findMany'>, 'findMany'>> {
        const context = Prisma.getExtensionContext(
          this,
        ) as unknown as PrismaModelContext;
        const newArgs = { ...args } as { where?: Record<string, unknown> };
        if (newArgs.where) {
          // 移除 isDeleted 过滤条件
          delete newArgs.where.isDeleted;
        }
        return context.findMany(newArgs) as Promise<
          Prisma.Result<T, Prisma.Args<T, 'findMany'>, 'findMany'>
        >;
      },

      /**
       * 仅查找已删除的记录
       */
      findManyDeleted<T>(
        this: T,
        args?: Prisma.Args<T, 'findMany'>,
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'findMany'>, 'findMany'>> {
        const context = Prisma.getExtensionContext(
          this,
        ) as unknown as PrismaModelContext;
        const newArgs = {
          ...args,
          where: { ...(args?.where as object), isDeleted: true },
        };
        return context.findMany(newArgs) as Promise<
          Prisma.Result<T, Prisma.Args<T, 'findMany'>, 'findMany'>
        >;
      },

      /**
       * 永久删除（硬删除）
       */
      hardDelete<T>(
        this: T,
        where: Prisma.Args<T, 'delete'>['where'],
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'delete'>, 'delete'>> {
        const context = Prisma.getExtensionContext(
          this,
        ) as unknown as PrismaModelContext;
        // 使用 $executeRaw 或直接调用原始 delete
        // 注意：这会绕过软删除中间件
        const modelName = context.$name;
        return context.$parent[modelName].delete({ where }) as Promise<
          Prisma.Result<T, Prisma.Args<T, 'delete'>, 'delete'>
        >;
      },
    },
  },
});
