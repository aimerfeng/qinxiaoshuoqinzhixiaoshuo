/**
 * Bangumi Cover Fetcher - 从Bangumi获取小说封面
 * Usage: node fetch-covers.js [start] [count]
 */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const proxyAgent = new HttpsProxyAgent('http://127.0.0.1:7890');
const novels = require('./novel-list.json');
const coverDir = './covers';
const progressFile = './cover-progress.json';

if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir, { recursive: true });

let progress = { fetched: [], notFound: [], failed: [] };
if (fs.existsSync(progressFile)) {
  progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
}

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 80);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function searchBangumi(title) {
  const url = 'https://api.bgm.tv/search/subject/' + encodeURIComponent(title) + '?type=1&responseGroup=small&max_results=3';
  const res = await fetch(url, {
    agent: proxyAgent,
    headers: { 'User-Agent': 'ProjectAnima/1.0' }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.list && data.list.length > 0) {
    return data.list[0];
  }
  return null;
}

async function downloadCover(url, filePath) {
  const res = await fetch(url, { agent: proxyAgent });
  if (!res.ok) return false;
  const buffer = await res.buffer();
  fs.writeFileSync(filePath, buffer);
  return true;
}

async function main() {
  const start = parseInt(process.argv[2]) || 0;
  const count = parseInt(process.argv[3]) || 100;
  const toFetch = novels.slice(start, start + count);

  console.log('Fetching covers for ' + toFetch.length + ' novels (from ' + start + ')');
  console.log('Already fetched: ' + progress.fetched.length + '\n');

  let success = 0, skip = 0, notFound = 0, fail = 0;

  for (let i = 0; i < toFetch.length; i++) {
    const novel = toFetch[i];
    const title = novel.main;
    const coverPath = path.join(coverDir, sanitize(title) + '.jpg');

    // Skip if already done
    if (progress.fetched.includes(title) || fs.existsSync(coverPath)) {
      skip++;
      continue;
    }

    const displayTitle = title.length > 35 ? title.substring(0, 35) + '...' : title;
    process.stdout.write('[' + (start + i + 1) + '/' + novels.length + '] ' + displayTitle + ' ');

    try {
      let result = await searchBangumi(title);
      if (!result && novel.alt) {
        result = await searchBangumi(novel.alt);
      }

      if (result && result.images && result.images.large) {
        await downloadCover(result.images.large, coverPath);
        progress.fetched.push(title);
        success++;
        console.log('OK');
      } else {
        progress.notFound.push(title);
        notFound++;
        console.log('NOT FOUND');
      }
    } catch (e) {
      progress.failed.push(title);
      fail++;
      console.log('FAIL');
    }

    if ((success + notFound + fail) % 20 === 0) {
      fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
    }
    await sleep(400);
  }

  fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
  console.log('\nDone: ' + success + ' ok, ' + skip + ' skip, ' + notFound + ' not found, ' + fail + ' fail');
  console.log('Total with covers: ' + progress.fetched.length + '/' + novels.length);
  console.log('Not found: ' + progress.notFound.length);
}

main().catch(console.error);
