import sharp from "sharp";

const TEAL = "#0EA5C6";
const CARD_FILL = "#FFFFFF";
const SPLASH_BG = { r: 248, g: 250, b: 252, alpha: 1 };

export async function getTrimmedLogoBuffer(sourcePath) {
  return sharp(sourcePath).trim({ threshold: 15 }).png().toBuffer();
}

async function getColumnDensity(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const colDensity = [];

  for (let x = 0; x < width; x += 1) {
    let count = 0;
    for (let y = 0; y < height; y += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 10 && (r < 240 || g < 240 || b < 240)) {
        count += 1;
      }
    }
    colDensity.push(count);
  }

  return { colDensity, width, height };
}

export async function detectIconWidth(trimmedBuffer) {
  const { colDensity, width, height } = await getColumnDensity(trimmedBuffer);
  const gapThreshold = height * 0.14;
  const gapColumns = 5;
  const startX = Math.round(width * 0.22);

  for (let x = startX; x < width; x += 1) {
    if (colDensity[x] >= gapThreshold) continue;

    let lowRun = 0;
    for (let j = x; j < Math.min(width, x + gapColumns); j += 1) {
      if (colDensity[j] < gapThreshold) lowRun += 1;
    }

    if (lowRun >= gapColumns) {
      return Math.min(width - 1, x + 8);
    }
  }

  return Math.round(width * 0.462);
}

export async function createMarkBuffer(sourcePath, targetHeight) {
  const trimmed = await getTrimmedLogoBuffer(sourcePath);
  const trimmedMeta = await sharp(trimmed).metadata();
  const iconWidth = await detectIconWidth(trimmed);

  const cropped = await sharp(trimmed)
    .extract({
      left: 0,
      top: 0,
      width: Math.min(iconWidth, trimmedMeta.width ?? iconWidth),
      height: trimmedMeta.height ?? targetHeight,
    })
    .trim({ threshold: 15 })
    .png()
    .toBuffer();

  return sharp(cropped)
    .resize(null, targetHeight, {
      fit: "inside",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}

export async function createFramedLogoBuffer(sourcePath, maxLogoWidth) {
  const logoBuffer = await sharp(await getTrimmedLogoBuffer(sourcePath))
    .resize(maxLogoWidth, null, { fit: "inside", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  const meta = await sharp(logoBuffer).metadata();
  const w = meta.width ?? maxLogoWidth;
  const h = meta.height ?? Math.round(maxLogoWidth * 0.25);
  const padX = Math.round(w * 0.14);
  const padY = Math.round(h * 0.22);
  const radius = Math.round(h * 0.22);
  const border = Math.max(3, Math.round(h * 0.05));
  const shadow = Math.max(6, Math.round(h * 0.12));
  const cardW = w + padX * 2;
  const cardH = h + padY * 2;
  const canvasW = cardW + shadow * 2;
  const canvasH = cardH + shadow * 2;

  const frameSvg = Buffer.from(`
    <svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#0f172a" flood-opacity="0.14"/>
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="${TEAL}" flood-opacity="0.18"/>
        </filter>
      </defs>
      <rect x="${shadow}" y="${shadow}" width="${cardW}" height="${cardH}" rx="${radius}" ry="${radius}"
        fill="${CARD_FILL}" stroke="${TEAL}" stroke-width="${border}" filter="url(#shadow)"/>
    </svg>
  `);

  return sharp(frameSvg)
    .composite([{ input: logoBuffer, left: shadow + padX, top: shadow + padY }])
    .png()
    .toBuffer();
}

export async function createSplashBuffer(sourcePath, width, height) {
  const maxDim = Math.min(width, height);
  let logoWidth = Math.round(maxDim * 0.62);
  let framedLogo = await createFramedLogoBuffer(sourcePath, logoWidth);
  let framedMeta = await sharp(framedLogo).metadata();

  while (
    logoWidth > 100 &&
    ((framedMeta.width ?? 0) > width * 0.9 || (framedMeta.height ?? 0) > height * 0.9)
  ) {
    logoWidth = Math.round(logoWidth * 0.9);
    framedLogo = await createFramedLogoBuffer(sourcePath, logoWidth);
    framedMeta = await sharp(framedLogo).metadata();
  }

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: SPLASH_BG,
    },
  })
    .composite([{ input: framedLogo, gravity: "center" }])
    .png()
    .toBuffer();
}

export async function createMarkIconBuffer(sourcePath, size) {
  const mark = await createMarkBuffer(sourcePath, Math.round(size * 0.78));
  const meta = await sharp(mark).metadata();
  const w = meta.width ?? size;
  const h = meta.height ?? size;
  const pad = Math.max(4, Math.round(size * 0.06));
  const radius = Math.round(size * 0.18);
  const border = Math.max(2, Math.round(size * 0.025));
  const canvas = size + pad * 2;

  const frameSvg = Buffer.from(`
    <svg width="${canvas}" height="${canvas}" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="${canvas - 2}" height="${canvas - 2}" rx="${radius}" ry="${radius}"
        fill="${CARD_FILL}" stroke="${TEAL}" stroke-width="${border}"/>
    </svg>
  `);

  const left = Math.round((canvas - w) / 2);
  const top = Math.round((canvas - h) / 2);

  return sharp(frameSvg)
    .composite([{ input: mark, left, top }])
    .png()
    .toBuffer();
}
