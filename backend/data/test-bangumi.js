const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const proxyAgent = new HttpsProxyAgent('http://127.0.0.1:7890');
const novels = require('./novel-list.json').slice(0, 10);
const coverDir = './covers';

if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir, { recursive: true });

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
  console.log('Testing Bangumi cover matching for 10 novels:\n');
  
  let matched = 0;
  
  for (let i = 0; i < novels.length; i++) {
    const novel = novels[i];
    const title = novel.main;
    
    console.log((i+1) + '. ' + title);
    
    try {
      // Try original title
      let result = await searchBangumi(title);
      
      // If not found, try alt title
      if (!result && novel.alt) {
        result = await searchBangumi(novel.alt);
      }
      
      if (result && result.images && result.images.large) {
        console.log('   -> Found: ' + result.name_cn + ' (ID: ' + result.id + ')');
        console.log('   -> Cover: ' + result.images.large);
        
        // Download cover
        const ext = path.extname(result.images.large) || '.jpg';
        const coverPath = path.join(coverDir, sanitize(title) + ext);
        await downloadCover(result.images.large, coverPath);
        console.log('   -> Saved: ' + coverPath);
        matched++;
      } else {
        console.log('   -> Not found on Bangumi');
      }
    } catch (e) {
      console.log('   -> Error: ' + e.message);
    }
    
    await sleep(500); // Rate limit
    console.log('');
  }
  
  console.log('--- Result ---');
  console.log('Matched: ' + matched + '/10');
}

main().catch(console.error);
