import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { createSplashBuffer, createMarkIconBuffer } from "./logo-helpers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sourceLogo = path.join(root, "resources", "logo-source.png");
const androidRes = path.join(root, "android", "app", "src", "main", "res");
const iosAssets = path.join(root, "ios", "App", "App", "Assets.xcassets");

const launcherDensities = [
  { folder: "mipmap-mdpi", launcher: 48, foreground: 108 },
  { folder: "mipmap-hdpi", launcher: 72, foreground: 162 },
  { folder: "mipmap-xhdpi", launcher: 96, foreground: 216 },
  { folder: "mipmap-xxhdpi", launcher: 144, foreground: 324 },
  { folder: "mipmap-xxxhdpi", launcher: 192, foreground: 432 },
];

async function writeAppIcon(outPath, size) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const mark = await createMarkIconBuffer(sourceLogo, size);
  await sharp(mark).toFile(outPath);
}

async function writeSplash(outPath, width, height) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const splash = await createSplashBuffer(sourceLogo, width, height);
  await sharp(splash).toFile(outPath);
}

async function main() {
  if (!fs.existsSync(sourceLogo)) {
    throw new Error("resources/logo-source.png bulunamadi.");
  }

  for (const density of launcherDensities) {
    const base = path.join(androidRes, density.folder);
    await writeAppIcon(path.join(base, "ic_launcher.png"), density.launcher);
    await writeAppIcon(path.join(base, "ic_launcher_round.png"), density.launcher);
    await writeAppIcon(path.join(base, "ic_launcher_foreground.png"), density.foreground);
  }

  await writeSplash(path.join(androidRes, "drawable", "splash.png"), 1280, 1280);
  await writeSplash(path.join(androidRes, "drawable-port-mdpi", "splash.png"), 320, 480);
  await writeSplash(path.join(androidRes, "drawable-port-hdpi", "splash.png"), 480, 800);
  await writeSplash(path.join(androidRes, "drawable-port-xhdpi", "splash.png"), 720, 1280);
  await writeSplash(path.join(androidRes, "drawable-port-xxhdpi", "splash.png"), 960, 1600);
  await writeSplash(path.join(androidRes, "drawable-port-xxxhdpi", "splash.png"), 1280, 1920);

  await writeAppIcon(path.join(iosAssets, "AppIcon.appiconset", "AppIcon-512@2x.png"), 1024);
  await writeSplash(path.join(iosAssets, "Splash.imageset", "splash-2732x2732.png"), 2732, 2732);

  console.log("Android and iOS native assets generated with framed splash");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
