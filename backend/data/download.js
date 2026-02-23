/**
 * Wenku8 EPUB Downloader - Uses node-fetch with https-proxy-agent
 * Usage: node download.js [start] [count]
 */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const novels = require('./novel-list.json');
const epubDir = './epubs';
const progressFile = './download-progress.json';
const PROXY_URL = 'http://127.0.0.1:7890';
const proxyAgent = new HttpsProxyAgent(PROXY_URL);

if (!fs.existsSync(epubDir)) fs.mkdirSync(epubDir, { recursive: true });

let progress = { downloaded: [], failed: [] };
if (fs.existsSync(progressFile)) {
  progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
}

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 80);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadFile(url, filePath, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        agent: proxyAgent,
        timeout: 120000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const buffer = await response.buffer();
      fs.writeFileSync(filePath, buffer);
      return buffer.length;
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(2000 * attempt);
    }
  }
}

async function main() {
  const start = parseInt(process.argv[2]) || 0;
  const count = parseInt(process.argv[3]) || 100;
  const toDownload = novels.slice(start, start + count);
  console.log('Downloading ' + toDownload.length + ' novels (from ' + start + ')');
  console.log('Using proxy: ' + PROXY_URL + '\n');

  let success = 0, skip = 0, fail = 0;

  for (let i = 0; i < toDownload.length; i++) {
    const novel = toDownload[i];
    const fileName = sanitize(novel.main) + '.epub';
    const filePath = path.join(epubDir, fileName);
    
    if (progress.downloaded.includes(novel.main) || fs.existsSync(filePath)) {
      skip++;
      continue;
    }
    
    const title = novel.main.length > 35 ? novel.main.substring(0, 35) + '...' : novel.main;
    process.stdout.write('[' + (start + i + 1) + '/' + novels.length + '] ' + title + ' ');
    
    try {
      const size = await downloadFile(novel.download_url, filePath);
      if (size > 1000) {
        progress.downloaded.push(novel.main);
        success++;
        console.log('OK (' + Math.round(size/1024) + 'KB)');
      } else {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        progress.failed.push(novel.main);
        fail++;
        console.log('FAIL (empty)');
      }
    } catch (e) {
      progress.failed.push(novel.main);
      fail++;
      console.log('FAIL (' + e.message.substring(0, 40) + ')');
    }
    
    if ((success + fail) % 10 === 0) {
      fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
    }
    await sleep(200);
  }

  fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
  console.log('\nDone: ' + success + ' ok, ' + skip + ' skip, ' + fail + ' fail');
  console.log('Total downloaded: ' + progress.downloaded.length + '/' + novels.length);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
