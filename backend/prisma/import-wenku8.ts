/**
 * Wenku8 ��������ű�
 * ʹ��: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/import-wenku8.ts [command]
 */
import { PrismaClient, WorkStatus, ChapterStatus, ContentType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import 'dotenv/config';

const CONFIG = {
  CSV_URL: 'https://raw.githubusercontent.com/mojimoon/wenku8/main/out/merged.csv',
  DATA_DIR: path.join(__dirname, '../data'),
  EPUB_DIR: path.join(__dirname, '../data/epubs'),
  COVER_DIR: path.join(__dirname, '../data/covers'),
  OWNER_EMAIL: '1070614448@qq.com',
  DOWNLOAD_DELAY: 300,
  MAX_RETRIES: 3,
  PROGRESS_FILE: path.join(__dirname, '../data/import-progress.json'),
  LIST_FILE: path.join(__dirname, '../data/novel-list.json'),
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL not set');
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface NovelEntry { author: string; download_url: string; volume: string; main: string; alt: string; dl_remark: string; }
interface ImportProgress { lastUpdated: string; totalNovels: number; downloaded: string[]; imported: string[]; failed: string[]; }

function ensureDir(dir: string) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function generateContentHash(content: string): string { return createHash('sha256').update(content).digest('hex').substring(0, 16); }
function generateAnchorId(workId: string, chapterId: string, idx: number): string { return `${workId}:${chapterId}:${idx}`; }
function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
function sanitizeFileName(name: string): string { return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100); }
function loadProgress(): ImportProgress {
  if (fs.existsSync(CONFIG.PROGRESS_FILE)) return JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf-8'));
  return { lastUpdated: new Date().toISOString(), totalNovels: 0, downloaded: [], imported: [], failed: [] };
}
function saveProgress(p: ImportProgress) { p.lastUpdated = new Date().toISOString(); fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(p, null, 2)); }

async function fetchNovelList(): Promise<NovelEntry[]> {
  console.log('Fetching novel list...');
  const response = await fetch(CONFIG.CSV_URL);
  if (!response.ok) throw new Error(`Failed: ${response.status}`);
  const csvText = await response.text();
  const lines = csvText.split('\n');
  const novels: NovelEntry[] = [];
  const seenTitles = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(',');
    const author = values[0]?.trim() || '';
    const download_url = values[1]?.trim() || '';
    const volume = values[2]?.trim() || '';
    const dl_remark = values[6]?.trim() || '';
    const main = values[9]?.trim() || '';
    const alt = values[10]?.trim() || '';
    if (author && download_url && main && !seenTitles.has(main)) {
      seenTitles.add(main);
      novels.push({ author, download_url, volume, main, alt, dl_remark });
    }
  }
  ensureDir(CONFIG.DATA_DIR);
  fs.writeFileSync(CONFIG.LIST_FILE, JSON.stringify(novels, null, 2));
  console.log(`Found ${novels.length} novels`);
  return novels;
}

async function downloadEpubs(novels: NovelEntry[], progress: ImportProgress): Promise<void> {
  console.log(`Downloading EPUBs... Total: ${novels.length}, Done: ${progress.downloaded.length}`);
  ensureDir(CONFIG.EPUB_DIR);
  let downloaded = 0, skipped = 0, failed = 0;
  for (let i = 0; i < novels.length; i++) {
    const novel = novels[i];
    const fileName = `${sanitizeFileName(novel.main)}.epub`;
    const filePath = path.join(CONFIG.EPUB_DIR, fileName);
    if (progress.downloaded.includes(novel.main) || fs.existsSync(filePath)) { skipped++; continue; }
    let retries = 0;
    while (retries < CONFIG.MAX_RETRIES) {
      try {
        process.stdout.write(`\r[${i + 1}/${novels.length}] ${novel.main.substring(0, 40)}...`);
        const response = await fetch(novel.download_url, { signal: AbortSignal.timeout(120000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filePath, buffer);
        progress.downloaded.push(novel.main);
        if (downloaded % 10 === 0) saveProgress(progress);
        downloaded++;
        await sleep(CONFIG.DOWNLOAD_DELAY);
        break;
      } catch (error: any) {
        retries++;
        if (retries >= CONFIG.MAX_RETRIES) { console.log(`\nFailed: ${novel.main}`); progress.failed.push(novel.main); failed++; }
        else await sleep(2000);
      }
    }
  }
  saveProgress(progress);
  console.log(`\nDownload done: ${downloaded} ok, ${skipped} skip, ${failed} fail`);
}

async function parseEpub(filePath: string): Promise<{ title: string; author: string; cover?: Buffer; chapters: { title: string; content: string }[] } | null> {
  try {
    const EPub = require('epub2').default;
    return new Promise((resolve) => {
      const epub = new EPub(filePath);
      let hasError = false;
      // 不要因为解析错误就 reject，很多 epub 即使有错误也能读取内容
      epub.on('error', () => { hasError = true; });
      epub.on('end', async () => {
        try {
          const result: any = { title: epub.metadata?.title || path.basename(filePath, '.epub'), author: epub.metadata?.creator || 'Unknown', chapters: [] };
          if (epub.metadata?.cover) {
            try {
              result.cover = await new Promise<Buffer>((res, rej) => epub.getImage(epub.metadata.cover, (err: Error, data: Buffer) => err ? rej(err) : res(data)));
            } catch {}
          }
          for (const item of (epub.flow || [])) {
            if (!item.id) continue;
            try {
              const html = await new Promise<string>((res, rej) => epub.getChapter(item.id, (err: Error, text: string) => err ? rej(err) : res(text)));
              const clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c))).replace(/\n{3,}/g, '\n\n').trim();
              if (clean.length > 100) result.chapters.push({ title: item.title || `Chapter ${result.chapters.length + 1}`, content: clean });
            } catch {}
          }
          // 即使有解析错误，只要能提取到章节就算成功
          if (result.chapters.length > 0) {
            resolve(result);
          } else {
            resolve(null);
          }
        } catch { resolve(null); }
      });
      epub.parse();
    });
  } catch { return null; }
}

async function importToDatabase(novels: NovelEntry[], progress: ImportProgress): Promise<void> {
  console.log(`Importing to DB... Total: ${novels.length}, Done: ${progress.imported.length}`);
  try {
    const owner = await prisma.user.findUnique({ where: { email: CONFIG.OWNER_EMAIL } });
    if (!owner) throw new Error(`User not found: ${CONFIG.OWNER_EMAIL}`);
    console.log(`Owner: ${owner.displayName}`);
    const lightNovelTag = await prisma.tag.upsert({ where: { slug: 'light-novel' }, update: {}, create: { name: 'Light Novel', slug: 'light-novel', description: 'Japanese light novels' } });
    const sharedTag = await prisma.tag.upsert({ where: { slug: 'shared-library' }, update: {}, create: { name: 'Shared Library', slug: 'shared-library', description: 'Community shared works' } });
    const wenku8Tag = await prisma.tag.upsert({ where: { slug: 'wenku8' }, update: {}, create: { name: 'Wenku8', slug: 'wenku8', description: 'From Wenku8' } });
    let imported = 0, skipped = 0, failed = 0;
    for (let i = 0; i < novels.length; i++) {
      const novel = novels[i];
      if (progress.imported.includes(novel.main)) { skipped++; continue; }
      const fileName = `${sanitizeFileName(novel.main)}.epub`;
      const filePath = path.join(CONFIG.EPUB_DIR, fileName);
      if (!fs.existsSync(filePath)) { skipped++; continue; }
      try {
        process.stdout.write(`\r[${i + 1}/${novels.length}] ${novel.main.substring(0, 40)}...`);
        const existing = await prisma.work.findFirst({ where: { title: novel.main, authorId: owner.id } });
        if (existing) { progress.imported.push(novel.main); skipped++; continue; }
        const parsed = await parseEpub(filePath);
        if (!parsed || parsed.chapters.length === 0) { progress.failed.push(novel.main); failed++; continue; }
        let coverUrl: string | undefined;
        if (parsed.cover) { ensureDir(CONFIG.COVER_DIR); const coverPath = path.join(CONFIG.COVER_DIR, `${sanitizeFileName(novel.main)}.jpg`); fs.writeFileSync(coverPath, parsed.cover); coverUrl = `/data/covers/${sanitizeFileName(novel.main)}.jpg`; }
        const totalWords = parsed.chapters.reduce((s, c) => s + c.content.replace(/\s/g, '').length, 0);
        const work = await prisma.work.create({ data: { authorId: owner.id, title: novel.main, description: `Author: ${novel.author}\nSource: Wenku8 (${novel.dl_remark})\nChapters: ${parsed.chapters.length}`, coverImage: coverUrl, status: WorkStatus.PUBLISHED, contentType: ContentType.NOVEL, wordCount: totalWords, publishedAt: new Date() } });
        await prisma.workTag.createMany({ data: [{ workId: work.id, tagId: lightNovelTag.id }, { workId: work.id, tagId: sharedTag.id }, { workId: work.id, tagId: wenku8Tag.id }], skipDuplicates: true });
        for (let j = 0; j < parsed.chapters.length; j++) {
          const ch = parsed.chapters[j];
          const paragraphs = ch.content.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
          const chWords = ch.content.replace(/\s/g, '').length;
          const createdCh = await prisma.chapter.create({ data: { workId: work.id, authorId: owner.id, title: ch.title, content: ch.content, orderIndex: j + 1, wordCount: chWords, status: ChapterStatus.PUBLISHED, publishedAt: new Date() } });
          if (paragraphs.length > 0) await prisma.paragraph.createMany({ data: paragraphs.map((c, idx) => ({ chapterId: createdCh.id, anchorId: generateAnchorId(work.id, createdCh.id, idx), content: c, contentHash: generateContentHash(c), orderIndex: idx })) });
        }
        progress.imported.push(novel.main);
        if (imported % 5 === 0) saveProgress(progress);
        imported++;
      } catch (error: any) { console.log(`\nFailed: ${novel.main} - ${error.message}`); progress.failed.push(novel.main); failed++; }
    }
    saveProgress(progress);
    console.log(`\nImport done: ${imported} ok, ${skipped} skip, ${failed} fail`);
  } finally { await prisma.$disconnect(); }
}

async function main() {
  const cmd = process.argv[2] || 'all';
  console.log(`Wenku8 Import Tool - Command: ${cmd}\n`);
  ensureDir(CONFIG.DATA_DIR);
  const progress = loadProgress();
  let novels: NovelEntry[] = [];
  if (fs.existsSync(CONFIG.LIST_FILE)) { novels = JSON.parse(fs.readFileSync(CONFIG.LIST_FILE, 'utf-8')); console.log(`Loaded ${novels.length} novels`); }
  else if (cmd !== 'fetch') { novels = await fetchNovelList(); }
  progress.totalNovels = novels.length;
  saveProgress(progress);
  switch (cmd) {
    case 'fetch': await fetchNovelList(); break;
    case 'download': await downloadEpubs(novels, progress); break;
    case 'import': await importToDatabase(novels, progress); break;
    case 'all': if (novels.length === 0) novels = await fetchNovelList(); await downloadEpubs(novels, progress); await importToDatabase(novels, progress); break;
    case 'status': console.log(`Status: Total=${progress.totalNovels}, Downloaded=${progress.downloaded.length}, Imported=${progress.imported.length}, Failed=${progress.failed.length}`); break;
    default: console.log('Commands: fetch, download, import, all, status');
  }
}
main().catch(console.error);
