/**
 * 批量导入脚本 - 使用子进程避免内存泄漏
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
      '--max-old-space-size=1024',
      'node_modules/tsx/dist/cli.mjs',
      'prisma/import-single.ts',
      filePath,
      title,
      author,
      dlRemark,
      CONFIG.OWNER_EMAIL
    ], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    child.stdout.on('data', (data) => { output += data.toString(); });
    child.stderr.on('data', (data) => { output += data.toString(); });
    
    child.on('close', (code) => {
      const lines = output.trim().split('\n');
      const lastLine = lines[lines.length - 1] || '';
      if (lastLine.startsWith('OK:') || lastLine.startsWith('SKIP:')) {
        resolve(lastLine);
      } else if (lastLine.startsWith('ERROR:')) {
        resolve(lastLine);
      } else {
        resolve(`ERROR:Exit code ${code}`);
      }
    });

    child.on('error', (err) => {
      resolve(`ERROR:${err.message}`);
    });

    // 超时 5 分钟
    setTimeout(() => {
      child.kill();
      resolve('ERROR:Timeout');
    }, 300000);
  });
}

async function main() {
  console.log('Batch Import Tool\n');
  
  if (!fs.existsSync(CONFIG.LIST_FILE)) {
    console.log('Novel list not found. Run fetch first.');
    return;
  }

  const novels: NovelEntry[] = JSON.parse(fs.readFileSync(CONFIG.LIST_FILE, 'utf-8'));
  const progress = loadProgress();
  
  console.log(`Total: ${novels.length}, Already imported: ${progress.imported.length}`);
  
  let imported = 0, skipped = 0, failed = 0;
  
  for (let i = 0; i < novels.length; i++) {
    const novel = novels[i];
    
    // 跳过已导入的
    if (progress.imported.includes(novel.main)) {
      skipped++;
      continue;
    }
    
    const fileName = `${sanitizeFileName(novel.main)}.epub`;
    const filePath = path.join(CONFIG.EPUB_DIR, fileName);
    
    // 跳过不存在的文件
    if (!fs.existsSync(filePath)) {
      skipped++;
      continue;
    }
    
    process.stdout.write(`[${i + 1}/${novels.length}] ${novel.main.substring(0, 40)}...`);
    
    const result = await importSingle(filePath, novel.main, novel.author, novel.dl_remark);
    
    if (result.startsWith('OK:') || result.startsWith('SKIP:')) {
      progress.imported.push(novel.main);
      imported++;
      console.log(` ${result}`);
    } else {
      progress.failed.push(novel.main);
      failed++;
      console.log(` ${result}`);
    }
    
    // 每 10 个保存一次进度
    if ((imported + failed) % 10 === 0) {
      saveProgress(progress);
    }
  }
  
  saveProgress(progress);
  console.log(`\nDone: ${imported} imported, ${skipped} skipped, ${failed} failed`);
}

main().catch(console.error);
