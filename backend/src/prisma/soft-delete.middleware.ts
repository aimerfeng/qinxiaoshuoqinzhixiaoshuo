import { Prisma } from '@prisma/client';

/**
 * 支持软删除的模型列表
 * 这些模型都有 isDeleted 字段
 */
const SOFT_DELETE_MODELS = [
  'Work',
  'Chapter',
  'Paragraph',
  'Card',
  'Comment',
  'Danmaku',
  'MangaPage',
] as const;

type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

/**
 * 检查模型是否支持软删除
 */
function isSoftDeleteModel(model: string): model is SoftDeleteModel {
  return SOFT_DELETE_MODELS.includes(model as SoftDeleteModel);
}

/**
 * 软删除中间件参数
 */
export interface SoftDeleteMiddlewareOptions {
  /** 是否在查询时自动过滤已删除记录，默认 true */
  autoFilter?: boolean;
  /** 是否将 delete 操作转换为软删除，默认 true */
  convertDelete?: boolean;
}

/**
 * 创建软删除中间件
 *
 * 功能：
 * 1. 自动将 delete/deleteMany 操作转换为 update（设置 isDeleted = true）
 * 2. 自动在 findMany/findFirst/findUnique/count 查询中过滤已删除记录
 *
 * 使用方式：
 * ```typescript
 * const prisma = new PrismaClient();
 * prisma.$use(createSoftDeleteMiddleware());
 * ```
 *
 * 如需查询已删除记录，可以显式添加 where: { isDeleted: true }
 */
export function createSoftDeleteMiddleware(
  options: SoftDeleteMiddlewareOptions = {},
): Prisma.Middleware {
  const { autoFilter = true, convertDelete = true } = options;

  return async (params, next) => {
    const { model, action } = params;

    // 只处理支持软删除的模型
    if (!model || !isSoftDeleteModel(model)) {
      return next(params);
    }

    // 处理删除操作 - 转换为软删除
    if (convertDelete) {
      if (action === 'delete') {
        // 将 delete 转换为 update
        params.action = 'update';
        params.args['data'] = { isDeleted: true };
        return next(params);
      }

      if (action === 'deleteMany') {
        // 将 deleteMany 转换为 updateMany
        params.action = 'updateMany';
        if (params.args.data) {
          params.args.data['isDeleted'] = true;
        } else {
          params.args['data'] = { isDeleted: true };
        }
        return next(params);
      }
    }

    // 处理查询操作 - 自动过滤已删除记录
    if (autoFilter) {
      const queryActions = [
        'findFirst',
        'findFirstOrThrow',
        'findMany',
        'findUnique',
        'findUniqueOrThrow',
        'count',
        'aggregate',
        'groupBy',
      ];

      if (queryActions.includes(action)) {
        // 检查是否已经显式指定了 isDeleted 条件
        const where = params.args?.where;
        const hasExplicitIsDeleted = where && 'isDeleted' in where;

        // 如果没有显式指定，则自动添加 isDeleted: false 条件
        if (!hasExplicitIsDeleted) {
          if (!params.args) {
            params.args = {};
          }
          if (!params.args.where) {
            params.args.where = {};
          }
          params.args.where['isDeleted'] = false;
        }
      }

      // 处理 update/updateMany - 确保不会更新已删除的记录
      if (action === 'update' || action === 'updateMany') {
        const where = params.args?.where;
        const hasExplicitIsDeleted = where && 'isDeleted' in where;

        if (!hasExplicitIsDeleted) {
          if (!params.args.where) {
            params.args.where = {};
          }
          params.args.where['isDeleted'] = false;
        }
      }
    }

    return next(params);
  };
}

/**
 * 软删除扩展方法
 * 提供额外的软删除相关操作
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  model: {
    $allModels: {
      /**
       * 软删除单条记录
       */
      async softDelete<T>(
        this: T,
        where: Prisma.Args<T, 'update'>['where'],
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'update'>, 'update'>> {
        const context = Prisma.getExtensionContext(this);
        return (context as any).update({
          where,
          data: { isDeleted: true },
        });
      },

      /**
       * 软删除多条记录
       */
      async softDeleteMany<T>(
        this: T,
        where: Prisma.Args<T, 'updateMany'>['where'],
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'updateMany'>, 'updateMany'>> {
        const context = Prisma.getExtensionContext(this);
        return (context as any).updateMany({
          where,
          data: { isDeleted: true },
        });
      },

      /**
       * 恢复软删除的记录
       */
      async restore<T>(
        this: T,
        where: Prisma.Args<T, 'update'>['where'],
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'update'>, 'update'>> {
        const context = Prisma.getExtensionContext(this);
        return (context as any).update({
          where: { ...where, isDeleted: true },
          data: { isDeleted: false },
        });
      },

      /**
       * 恢复多条软删除的记录
       */
      async restoreMany<T>(
        this: T,
        where: Prisma.Args<T, 'updateMany'>['where'],
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'updateMany'>, 'updateMany'>> {
        const context = Prisma.getExtensionContext(this);
        return (context as any).updateMany({
          where: { ...where, isDeleted: true },
          data: { isDeleted: false },
        });
      },

      /**
       * 查找包括已删除的记录
       */
      async findManyWithDeleted<T>(
        this: T,
        args?: Prisma.Args<T, 'findMany'>,
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'findMany'>, 'findMany'>> {
        const context = Prisma.getExtensionContext(this);
        const newArgs = { ...args };
        if (newArgs.where) {
          // 移除 isDeleted 过滤条件
          delete (newArgs.where as any).isDeleted;
        }
        return (context as any).findMany(newArgs);
      },

      /**
       * 仅查找已删除的记录
       */
      async findManyDeleted<T>(
        this: T,
        args?: Prisma.Args<T, 'findMany'>,
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'findMany'>, 'findMany'>> {
        const context = Prisma.getExtensionContext(this);
        const newArgs = {
          ...args,
          where: { ...args?.where, isDeleted: true },
        };
        return (context as any).findMany(newArgs);
      },

      /**
       * 永久删除（硬删除）
       */
      async hardDelete<T>(
        this: T,
        where: Prisma.Args<T, 'delete'>['where'],
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'delete'>, 'delete'>> {
        const context = Prisma.getExtensionContext(this);
        // 使用 $executeRaw 或直接调用原始 delete
        // 注意：这会绕过软删除中间件
        return (context as any).$parent[context.$name as string].delete({
          where,
        });
      },
    },
  },
});
