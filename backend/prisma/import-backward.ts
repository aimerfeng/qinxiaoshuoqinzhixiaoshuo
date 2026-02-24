/**
 * 反向导入 - 从尾开始
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG = {
  EPUB_DIR: path.join(__dirname, '../data/epubs'),
  PROGRESS_FILE: path.join(__dirname, '../data/import-progress.json'),
  LIST_FILE: path.join(__dirname, '../data/novel-list.json'),
  OWNER_EMAIL: '1070614448@qq.com',
};

interface NovelEntry { author: string; download_url: string; volume: string; main: string; alt: string; dl_remark: string; }
interface ImportProgress { lastUpdated: string; totalNovels: number; downloaded: string[]; imported: string[]; failed: string[]; }

function sanitizeFileName(name: string): string { return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100); }
function loadProgress(): ImportProgress {
  if (fs.existsSync(CONFIG.PROGRESS_FILE)) return JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf-8'));
  return { lastUpdated: new Date().toISOString(), totalNovels: 0, downloaded: [], imported: [], failed: [] };
}
function saveProgress(p: ImportProgress) { p.lastUpdated = new Date().toISOString(); fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(p, null, 2)); }

function importSingle(filePath: string, title: string, author: string, dlRemark: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn('node', [
      '--max-old-space-size=1024', 'node_modules/tsx/dist/cli.mjs', 'prisma/import-single.ts',
      filePath, title, author, dlRemark, CONFIG.OWNER_EMAIL
    ], { cwd: path.join(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe'] });

    let output = '';
    child.stdout.on('data', (data) => { output += data.toString(); });
    child.stderr.on('data', (data) => { output += data.toString(); });
    child.on('close', (code) => {
      const lastLine = output.trim().split('\n').pop() || '';
      resolve(lastLine.startsWith('OK:') || lastLine.startsWith('SKIP:') || lastLine.startsWith('ERROR:') ? lastLine : `ERROR:Exit ${code}`);
    });
    child.on('error', (err) => resolve(`ERROR:${err.message}`));
    setTimeout(() => { child.kill(); resolve('ERROR:Timeout'); }, 300000);
  });
}

async function main() {
  console.log('[BACKWARD] Starting from end...\n');
  const novels: NovelEntry[] = JSON.parse(fs.readFileSync(CONFIG.LIST_FILE, 'utf-8'));
  let imported = 0, failed = 0;

  for (let i = novels.length - 1; i >= 0; i--) {
    const progress = loadProgress(); // 每次重新加载，避免冲突
    const novel = novels[i];
    if (progress.imported.includes(novel.main)) continue;

    const filePath = path.join(CONFIG.EPUB_DIR, `${sanitizeFileName(novel.main)}.epub`);
    if (!fs.existsSync(filePath)) continue;

    process.stdout.write(`[BWD ${i + 1}/${novels.length}] ${novel.main.substring(0, 35)}...`);
    const result = await importSingle(filePath, novel.main, novel.author, novel.dl_remark);

    const freshProgress = loadProgress();
    if (result.startsWith('OK:') || result.startsWith('SKIP:')) {
      if (!freshProgress.imported.includes(novel.main)) freshProgress.imported.push(novel.main);
      imported++;
    } else {
      if (!freshProgress.failed.includes(novel.main)) freshProgress.failed.push(novel.main);
      failed++;
    }
    saveProgress(freshProgress);
    console.log(` ${result}`);
  }
  console.log(`\n[BACKWARD] Done: ${imported} imported, ${failed} failed`);
}

main().catch(console.error);
