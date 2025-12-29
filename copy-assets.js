const fs = require('fs');
const path = require('path');

function copyDirectory(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying static files to standalone build...');

// Copy .next/static to .next/standalone/.next/
const staticSrc = path.join(__dirname, '.next', 'static');
const staticDest = path.join(__dirname, '.next', 'standalone', '.next', 'static');
if (fs.existsSync(staticSrc)) {
  copyDirectory(staticSrc, staticDest);
  console.log('✓ Copied .next/static');
}

// Copy public to .next/standalone/
const publicSrc = path.join(__dirname, 'public');
const publicDest = path.join(__dirname, '.next', 'standalone', 'public');
if (fs.existsSync(publicSrc)) {
  copyDirectory(publicSrc, publicDest);
  console.log('✓ Copied public');
}

console.log('✓ Build assets copied successfully!');
