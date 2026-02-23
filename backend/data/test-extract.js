const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const epubDir = './epubs';
const coverDir = './covers';

if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir, { recursive: true });

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 80);
}

// Get first 10 epub files
const files = fs.readdirSync(epubDir).filter(f => f.endsWith('.epub')).slice(0, 10);

console.log('Testing image extraction from ' + files.length + ' EPUBs:\n');

for (const file of files) {
  const epubPath = path.join(epubDir, file);
  const title = file.replace('.epub', '');
  
  try {
    const zip = new AdmZip(epubPath);
    const entries = zip.getEntries();
    
    // Find all image files
    const images = entries.filter(e => {
      const name = e.entryName.toLowerCase();
      return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif');
    });
    
    console.log(title.substring(0, 40) + ':');
    console.log('  Total images: ' + images.length);
    
    if (images.length > 0) {
      // List first 5 images
      images.slice(0, 5).forEach((img, i) => {
        console.log('    ' + (i+1) + '. ' + img.entryName + ' (' + Math.round(img.header.size/1024) + 'KB)');
      });
      
      // Extract first image as cover
      const firstImg = images[0];
      const ext = path.extname(firstImg.entryName);
      const coverPath = path.join(coverDir, sanitize(title) + ext);
      fs.writeFileSync(coverPath, firstImg.getData());
      console.log('  -> Saved cover: ' + coverPath);
    }
    console.log('');
  } catch (e) {
    console.log(title + ': ERROR - ' + e.message + '\n');
  }
}

console.log('Done! Check ' + coverDir + ' folder for extracted covers.');
