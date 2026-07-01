import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const iconSvg = path.join(root, "resources", "logo-icon.svg");
const horizontalSvg = path.join(root, "resources", "logo-horizontal.svg");
const publicDir = path.join(root, "public");
const assetsDir = path.join(root, "assets");

async function ensureSources() {
  for (const file of [iconSvg, horizontalSvg]) {
    if (!fs.existsSync(file)) {
      throw new Error(`${path.basename(file)} bulunamadi.`);
    }
  }
}

async function writePng(svgPath, outPath, width, height) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(svgPath).resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(outPath);
}

async function writeSquareIcon(outPath, size) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(iconSvg).resize(size, size).png().toFile(outPath);
}

async function main() {
  await ensureSources();
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  fs.copyFileSync(horizontalSvg, path.join(publicDir, "logo-horizontal.svg"));
  fs.copyFileSync(iconSvg, path.join(publicDir, "logo-mark.svg"));

  await writePng(horizontalSvg, path.join(publicDir, "logo-horizontal.png"), 640, 144);
  await writePng(horizontalSvg, path.join(publicDir, "logo.png"), 640, 144);
  await writeSquareIcon(path.join(publicDir, "logo-mark.png"), 176);
  await writeSquareIcon(path.join(publicDir, "logo-512x512.png"), 512);
  await writeSquareIcon(path.join(assetsDir, "icon-only.png"), 1024);
  await writeSquareIcon(path.join(publicDir, "icon-512x512.png"), 512);
  await writeSquareIcon(path.join(publicDir, "icon-192x192.png"), 192);
  await writeSquareIcon(path.join(publicDir, "apple-touch-icon.png"), 180);
  await writeSquareIcon(path.join(publicDir, "favicon-32x32.png"), 32);
  await writeSquareIcon(path.join(publicDir, "favicon.ico"), 32);

  await sharp(iconSvg)
    .resize(1200, 1200)
    .flatten({ background: "#F8FAFC" })
    .png()
    .toFile(path.join(assetsDir, "splash.png"));

  console.log("RideYo brand assets generated from SVG logo");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
