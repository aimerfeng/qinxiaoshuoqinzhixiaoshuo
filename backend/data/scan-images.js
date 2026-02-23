const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const epubDir = './epubs';
const files = fs.readdirSync(epubDir).filter(f => f.endsWith('.epub'));

console.log('Scanning ' + files.length + ' EPUBs for images...\n');

let withImages = 0;
let totalImages = 0;

for (const file of files) {
  try {
    const zip = new AdmZip(path.join(epubDir, file));
    const images = zip.getEntries().filter(e => {
      const n = e.entryName.toLowerCase();
      return n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png') || n.endsWith('.gif');
    });
    
    if (images.length > 0) {
      withImages++;
      totalImages += images.length;
      console.log(file.substring(0, 50) + ' -> ' + images.length + ' images');
    }
  } catch (e) {}
}

console.log('\n--- Summary ---');
console.log('Total EPUBs: ' + files.length);
console.log('With images: ' + withImages);
console.log('Total images found: ' + totalImages);
