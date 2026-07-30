const sharp = require('sharp');
const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const PUBLIC_DIR = join(__dirname, '..', 'public');

const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="32" fill="#10b981"/>
  <text x="32" y="44" font-family="Arial,sans-serif" font-size="32" font-weight="700" text-anchor="middle" fill="#ffffff">N</text>
</svg>`;

const sizes = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512];

async function main() {
  for (const size of sizes) {
    const buffer = Buffer.from(svg(size));
    await sharp(buffer).png().toFile(join(PUBLIC_DIR, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }

  // apple-touch-icon (180x180)
  const buffer180 = Buffer.from(svg(180));
  await sharp(buffer180).png().toFile(join(PUBLIC_DIR, `apple-touch-icon.png`));
  console.log('Generated apple-touch-icon.png');

  // Also generate favicon (32x32)
  const buffer32 = Buffer.from(svg(32));
  await sharp(buffer32).png().toFile(join(PUBLIC_DIR, `favicon-32.png`));
  await sharp(buffer32).png().toFile(join(PUBLIC_DIR, `favicon.ico`));
  console.log('Generated favicons');
}

main().catch(console.error);
