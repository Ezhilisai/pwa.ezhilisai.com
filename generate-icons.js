/**
 * Generates simple placeholder PWA icons using Node.js Canvas (canvas package).
 * Run once after npm install canvas:
 *   npm install canvas
 *   node generate-icons.js
 *
 * Or just drop your own PNGs into public/assets/icons/
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outDir = path.join(__dirname, 'public', 'assets', 'icons');

fs.mkdirSync(outDir, { recursive: true });

try {
  const { createCanvas } = require('canvas');

  sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#6c63ff');
    grad.addColorStop(1, '#9c88ff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.2);
    ctx.fill();

    // Emoji
    const fontSize = Math.floor(size * 0.5);
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉', size / 2, size / 2);

    fs.writeFileSync(path.join(outDir, `icon-${size}x${size}.png`), canvas.toBuffer('image/png'));
    console.log(`✅ Generated icon-${size}x${size}.png`);
  });
} catch (e) {
  // Fallback: create minimal 1x1 placeholder PNGs
  console.log('canvas package not available, creating placeholder PNG files...');
  console.log('(Install canvas for real icons: npm install canvas)');

  // Minimal 1x1 purple PNG (base64)
  const minimalPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  sizes.forEach(size => {
    fs.writeFileSync(path.join(outDir, `icon-${size}x${size}.png`), minimalPng);
    console.log(`  Created placeholder icon-${size}x${size}.png`);
  });
}

console.log(`\nIcons saved to: ${outDir}`);
console.log('Replace with real icons for production use.\n');
