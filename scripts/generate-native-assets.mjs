import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const iconSvg = path.join(root, "resources", "logo-icon.svg");
const horizontalSvg = path.join(root, "resources", "logo-horizontal.svg");
const androidRes = path.join(root, "android", "app", "src", "main", "res");
const iosAssets = path.join(root, "ios", "App", "App", "Assets.xcassets");
const splashBg = { r: 248, g: 250, b: 252, alpha: 1 };

const launcherDensities = [
  { folder: "mipmap-mdpi", launcher: 48, foreground: 108 },
  { folder: "mipmap-hdpi", launcher: 72, foreground: 162 },
  { folder: "mipmap-xhdpi", launcher: 96, foreground: 216 },
  { folder: "mipmap-xxhdpi", launcher: 144, foreground: 324 },
  { folder: "mipmap-xxxhdpi", launcher: 192, foreground: 432 },
];

async function writeSquareIcon(outPath, size) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(iconSvg).resize(size, size).png().toFile(outPath);
}

async function writeSplash(outPath, width, height) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const logoWidth = Math.min(Math.round(width * 0.62), 720);
  const logo = await sharp(horizontalSvg)
    .resize(logoWidth, null, { fit: "inside" })
    .png()
    .toBuffer();

  await sharp({
    create: { width, height, channels: 4, background: splashBg },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(outPath);
}

async function main() {
  for (const file of [iconSvg, horizontalSvg]) {
    if (!fs.existsSync(file)) {
      throw new Error(`${path.basename(file)} bulunamadi. Once npm run assets:brand calistirin.`);
    }
  }

  for (const density of launcherDensities) {
    const base = path.join(androidRes, density.folder);
    await writeSquareIcon(path.join(base, "ic_launcher.png"), density.launcher);
    await writeSquareIcon(path.join(base, "ic_launcher_round.png"), density.launcher);
    const fgSize = density.foreground;
    const inset = Math.round(fgSize * 0.12);
    const iconSize = fgSize - inset * 2;
    const icon = await sharp(iconSvg).resize(iconSize, iconSize).png().toBuffer();
    await sharp({
      create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: icon, left: inset, top: inset }])
      .png()
      .toFile(path.join(base, "ic_launcher_foreground.png"));
  }

  await writeSplash(path.join(androidRes, "drawable", "splash.png"), 1280, 1280);
  await writeSplash(path.join(androidRes, "drawable-port-mdpi", "splash.png"), 320, 480);
  await writeSplash(path.join(androidRes, "drawable-port-hdpi", "splash.png"), 480, 800);
  await writeSplash(path.join(androidRes, "drawable-port-xhdpi", "splash.png"), 720, 1280);
  await writeSplash(path.join(androidRes, "drawable-port-xxhdpi", "splash.png"), 960, 1600);
  await writeSplash(path.join(androidRes, "drawable-port-xxxhdpi", "splash.png"), 1280, 1920);

  await writeSquareIcon(path.join(iosAssets, "AppIcon.appiconset", "AppIcon-512@2x.png"), 1024);
  await writeSplash(path.join(iosAssets, "Splash.imageset", "splash-2732x2732.png"), 2732, 2732);
  await writeSplash(path.join(iosAssets, "Splash.imageset", "splash-2732x2732-1.png"), 2732, 2732);
  await writeSplash(path.join(iosAssets, "Splash.imageset", "splash-2732x2732-2.png"), 2732, 2732);

  console.log("Android and iOS native assets generated from SVG logo");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
