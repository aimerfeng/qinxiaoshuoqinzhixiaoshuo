/**
 * 为现有的作品批量创建小说库
 * 运行: npx tsx prisma/create-libraries.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.log('ERROR: DATABASE_URL not set');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('开始为现有作品创建小说库...');

  // 获取所有已发布的作品（排除已有小说库的）
  const worksWithoutLibrary = await prisma.work.findMany({
    where: {
      status: 'PUBLISHED',
      isDeleted: false,
      library: null, // 没有关联小说库的
    },
    select: {
      id: true,
      title: true,
      description: true,
      coverImage: true,
      authorId: true,
    },
  });

  console.log(`找到 ${worksWithoutLibrary.length} 本没有小说库的作品`);

  let created = 0;
  let failed = 0;

  for (const work of worksWithoutLibrary) {
    try {
      await prisma.library.create({
        data: {
          ownerId: work.authorId,
          workId: work.id,
          title: work.title,
          description: work.description,
          coverImage: work.coverImage,
          libraryType: 'ORIGINAL', // 原创库
          ownerCutPercent: 0, // 默认不抽成
          uploadFeeType: 'PER_THOUSAND_WORDS',
          uploadFeeRate: 0, // 默认免费
          hotScore: 0,
          branchCount: 0,
          totalTipAmount: 0,
        },
      });
      created++;
      
      if (created % 100 === 0) {
        console.log(`已创建 ${created} 个小说库...`);
      }
    } catch (error) {
      failed++;
      console.error(`创建小说库失败 (${work.title}):`, error);
    }
  }

  console.log(`\n完成！成功创建 ${created} 个小说库，失败 ${failed} 个`);
}

main()
  .catch((e) => {
    console.error('执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
