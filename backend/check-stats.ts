import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.log('ERROR:DATABASE_URL not set'); process.exit(1); }
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const works = await prisma.work.count();
  const withCover = await prisma.work.count({ where: { coverImage: { not: null } } });
  const chapters = await prisma.chapter.count();
  const paragraphs = await prisma.paragraph.count();
  
  console.log('=== 数据库统计 ===');
  console.log('总作品数:', works);
  console.log('有封面的作品:', withCover);
  console.log('总章节数:', chapters);
  console.log('总段落数:', paragraphs);
  
  // 检查最近导入的作品
  const recentWorks = await prisma.work.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, coverImage: true, createdAt: true }
  });
  
  console.log('\n=== 最近导入的5本书 ===');
  recentWorks.forEach(w => {
    console.log(`- ${w.title} (封面: ${w.coverImage ? '有' : '无'})`);
  });
  
  await prisma.$disconnect();
  await pool.end();
}

main();
