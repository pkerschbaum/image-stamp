import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import url from 'url';
import { default as invariant } from 'tiny-invariant';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const INPUT_DIR = path.join(__dirname, '..', 'input');
const PATHS = {
  INPUT_DIR,
  OUTPUT_DIR: path.join(__dirname, '..', 'output'),
  STAMP_FILE: path.join(__dirname, '..', 'stamp.png'),
} as const;
await fs.promises.mkdir(PATHS.OUTPUT_DIR, { recursive: true });
const allInputFiles = await fs.promises.readdir(PATHS.INPUT_DIR);
const stamp = sharp(PATHS.STAMP_FILE);

await Promise.all(
  allInputFiles.map(async (relativePathOfFile) => {
    const absolutePathOfFile = path.join(PATHS.INPUT_DIR, relativePathOfFile);
    const input = sharp(absolutePathOfFile);
    const metadataInput = await input.metadata();
    invariant(metadataInput.height);
    invariant(metadataInput.width);
    const stampWidthAdjustedHeight = await stamp
      .resize(undefined, Math.floor(metadataInput.height / 7))
      .toBuffer();

    const metadataLogo = await sharp(stampWidthAdjustedHeight).metadata();
    invariant(metadataLogo.height);
    invariant(metadataLogo.width);
    const outputPath = path.join(PATHS.OUTPUT_DIR, path.basename(absolutePathOfFile));

    console.log(`Writing file... outputPath=${outputPath}`);

    return input
      .composite([
        {
          input: stampWidthAdjustedHeight,
          top: metadataInput.height - metadataLogo.height - 10,
          left: metadataInput.width - metadataLogo.width - 10,
        },
      ])
      .toFile(outputPath);
  }),
);
