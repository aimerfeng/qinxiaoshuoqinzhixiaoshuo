/**
 * 单个 epub 导入脚本 - 被主脚本调用
 */
import { PrismaClient, WorkStatus, ChapterStatus, ContentType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.log('ERROR:DATABASE_URL not set'); process.exit(1); }
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function generateContentHash(content: string): string { return createHash('sha256').update(content).digest('hex').substring(0, 16); }
function generateAnchorId(workId: string, chapterId: string, idx: number): string { return `${workId}:${chapterId}:${idx}`; }
function sanitizeFileName(name: string): string { return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100); }

async function parseEpub(filePath: string): Promise<{ title: string; author: string; chapters: { title: string; content: string }[] } | null> {
  try {
    const EPub = require('epub2').default;
    return new Promise((resolve) => {
      const epub = new EPub(filePath);
      epub.on('error', () => {});
      epub.on('end', async () => {
        try {
          const result: any = { title: epub.metadata?.title || path.basename(filePath, '.epub'), author: epub.metadata?.creator || 'Unknown', chapters: [] };
          for (const item of (epub.flow || [])) {
            if (!item.id) continue;
            try {
              const html = await new Promise<string>((res, rej) => epub.getChapter(item.id, (err: Error, text: string) => err ? rej(err) : res(text)));
              const clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c))).replace(/\n{3,}/g, '\n\n').trim();
              if (clean.length > 100) result.chapters.push({ title: item.title || `Chapter ${result.chapters.length + 1}`, content: clean });
            } catch {}
          }
          resolve(result.chapters.length > 0 ? result : null);
        } catch { resolve(null); }
      });
      epub.parse();
    });
  } catch { return null; }
}

async function main() {
  const [,, filePath, novelTitle, novelAuthor, dlRemark, ownerEmail] = process.argv;
  if (!filePath || !novelTitle || !ownerEmail) {
    console.log('ERROR:Missing arguments');
    process.exit(1);
  }

  try {
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (!owner) { console.log('ERROR:User not found'); process.exit(1); }

    const existing = await prisma.work.findFirst({ where: { title: novelTitle, authorId: owner.id } });
    if (existing) { console.log('SKIP:Already exists'); process.exit(0); }

    const parsed = await parseEpub(filePath);
    if (!parsed || parsed.chapters.length === 0) { console.log('ERROR:No chapters'); process.exit(1); }

    const lightNovelTag = await prisma.tag.upsert({ where: { slug: 'light-novel' }, update: {}, create: { name: 'Light Novel', slug: 'light-novel', description: 'Japanese light novels' } });
    const sharedTag = await prisma.tag.upsert({ where: { slug: 'shared-library' }, update: {}, create: { name: 'Shared Library', slug: 'shared-library', description: 'Community shared works' } });
    const wenku8Tag = await prisma.tag.upsert({ where: { slug: 'wenku8' }, update: {}, create: { name: 'Wenku8', slug: 'wenku8', description: 'From Wenku8' } });

    // 检查是否有预下载的封面
    const coverDir = path.join(__dirname, '../data/covers');
    const coverPath = path.join(coverDir, `${sanitizeFileName(novelTitle)}.jpg`);
    let coverUrl: string | undefined;
    if (fs.existsSync(coverPath)) {
      coverUrl = `/data/covers/${sanitizeFileName(novelTitle)}.jpg`;
    }

    const totalWords = parsed.chapters.reduce((s, c) => s + c.content.replace(/\s/g, '').length, 0);
    const work = await prisma.work.create({
      data: {
        authorId: owner.id,
        title: novelTitle,
        description: `Author: ${novelAuthor || 'Unknown'}\nSource: Wenku8 (${dlRemark || ''})\nChapters: ${parsed.chapters.length}`,
        coverImage: coverUrl,
        status: WorkStatus.PUBLISHED,
        contentType: ContentType.NOVEL,
        wordCount: totalWords,
        publishedAt: new Date()
      }
    });

    await prisma.workTag.createMany({
      data: [
        { workId: work.id, tagId: lightNovelTag.id },
        { workId: work.id, tagId: sharedTag.id },
        { workId: work.id, tagId: wenku8Tag.id }
      ],
      skipDuplicates: true
    });

    for (let j = 0; j < parsed.chapters.length; j++) {
      const ch = parsed.chapters[j];
      const paragraphs = ch.content.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
      const chWords = ch.content.replace(/\s/g, '').length;
      const createdCh = await prisma.chapter.create({
        data: {
          workId: work.id,
          authorId: owner.id,
          title: ch.title,
          content: ch.content,
          orderIndex: j + 1,
          wordCount: chWords,
          status: ChapterStatus.PUBLISHED,
          publishedAt: new Date()
        }
      });
      if (paragraphs.length > 0) {
        await prisma.paragraph.createMany({
          data: paragraphs.map((c, idx) => ({
            chapterId: createdCh.id,
            anchorId: generateAnchorId(work.id, createdCh.id, idx),
            content: c,
            contentHash: generateContentHash(c),
            orderIndex: idx
          }))
        });
      }
    }

    console.log(`OK:${parsed.chapters.length} chapters`);
  } catch (error: any) {
    console.log(`ERROR:${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
