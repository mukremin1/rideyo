import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  createFramedLogoBuffer,
  createSplashBuffer,
  createMarkBuffer,
  createMarkIconBuffer,
} from "./logo-helpers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sourceLogo = path.join(root, "resources", "logo-source.png");
const publicDir = path.join(root, "public");
const assetsDir = path.join(root, "assets");

async function ensureSource() {
  if (!fs.existsSync(sourceLogo)) {
    throw new Error("resources/logo-source.png bulunamadi.");
  }
}

async function writeMark(outPath, size) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const mark = await createMarkBuffer(sourceLogo, size);
  await sharp(mark).toFile(outPath);
}

async function writeAppIcon(outPath, size) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const mark = await createMarkIconBuffer(sourceLogo, size);
  await sharp(mark).toFile(outPath);
}

async function main() {
  await ensureSource();
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  const framedNavbar = await createFramedLogoBuffer(sourceLogo, 720);
  const framedLarge = await createFramedLogoBuffer(sourceLogo, 920);

  await sharp(framedNavbar).toFile(path.join(publicDir, "logo.png"));
  await sharp(framedLarge).toFile(path.join(publicDir, "logo-512x512.png"));
  await sharp(framedNavbar).toFile(path.join(publicDir, "logo-horizontal.png"));

  await writeMark(path.join(publicDir, "logo-mark.png"), 176);
  await writeAppIcon(path.join(assetsDir, "icon-only.png"), 1024);
  await writeAppIcon(path.join(publicDir, "icon-512x512.png"), 512);
  await writeAppIcon(path.join(publicDir, "icon-192x192.png"), 192);
  await writeAppIcon(path.join(publicDir, "apple-touch-icon.png"), 180);
  await writeAppIcon(path.join(publicDir, "favicon-32x32.png"), 32);
  await writeAppIcon(path.join(publicDir, "favicon.ico"), 32);

  const splash = await createSplashBuffer(sourceLogo, 2732, 2732);
  await sharp(splash).toFile(path.join(assetsDir, "splash.png"));

  console.log("RideYo brand assets generated with framed logo");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
