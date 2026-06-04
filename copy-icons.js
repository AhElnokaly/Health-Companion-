import fs from 'fs';
import path from 'path';

const srcPath = './src/assets/images/icon_512_1780574997410.png';
const dest192 = './public/icon-192.png';
const dest512 = './public/icon-512.png';

try {
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, dest192);
    fs.copyFileSync(srcPath, dest512);
    console.log('Successfully copied PWA icons to public directory!');
  } else {
    console.error('Source icon file not found at:', srcPath);
  }
} catch (err) {
  console.error('Error copying icons:', err);
}
