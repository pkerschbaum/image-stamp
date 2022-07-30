import { Option, program } from 'commander';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { default as invariant } from 'tiny-invariant';
import url from 'url';

const availablePositions = ['top', 'bottom-right'] as const;
type AvailablePositions = typeof availablePositions[number];
program
  .addOption(
    new Option('--position <position>').choices(availablePositions).default(availablePositions[1]),
  )
  .parse();
const options = program.opts<{ position: AvailablePositions }>();

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const INPUT_DIR = path.join(__dirname, '..', 'input');
const PATHS = {
  INPUT_DIR,
  OUTPUT_DIR: path.join(__dirname, '..', 'output'),
  STAMP_FILE: path.join(__dirname, '..', 'stamp.png'),
  SPECIAL_STAMP_FILE: path.join(__dirname, '..', 'special-stamp.png'),
} as const;
const PADDING = {
  BOTTOM: 32,
  RIGHT: 32,
};

await fs.promises.mkdir(PATHS.OUTPUT_DIR, { recursive: true });
const allInputFiles = await fs.promises.readdir(PATHS.INPUT_DIR);
const stamp = sharp(PATHS.STAMP_FILE);
const specialStamp = sharp(PATHS.SPECIAL_STAMP_FILE);

await Promise.all(
  allInputFiles.map(async (relativePathOfFile) => {
    const absolutePathOfFile = path.join(PATHS.INPUT_DIR, relativePathOfFile);
    const sharp_inputFile = sharp(absolutePathOfFile);

    const metadata_inputFile = await sharp_inputFile.metadata();
    invariant(metadata_inputFile.height);
    invariant(metadata_inputFile.width);

    let output;
    if (options.position === 'bottom-right') {
      const adjustedStamp = await stamp
        .resize(undefined, Math.floor(metadata_inputFile.height / 7))
        .toBuffer();
      const metadata_logo = await sharp(adjustedStamp).metadata();
      invariant(metadata_logo.height);
      invariant(metadata_logo.width);

      output = sharp_inputFile.composite([
        {
          input: adjustedStamp,
          top: metadata_inputFile.height - metadata_logo.height - PADDING.BOTTOM,
          left: metadata_inputFile.width - metadata_logo.width - PADDING.RIGHT,
        },
      ]);
    } else {
      const adjustedStamp = await specialStamp
        .resize(metadata_inputFile.width, undefined)
        .toBuffer();
      const metadata_logo = await sharp(adjustedStamp).metadata();
      invariant(metadata_logo.height);
      invariant(metadata_logo.width);

      const adjustHeight = Math.floor(metadata_logo.height * 0.5);

      output = sharp_inputFile
        .resize({
          height: metadata_inputFile.height + adjustHeight,
          width: metadata_inputFile.width,
          fit: 'contain',
          position: 'bottom',
        })
        .composite([
          {
            input: adjustedStamp,
            top: 0,
            left: 0,
          },
        ]);
    }

    const outputPath = path.join(PATHS.OUTPUT_DIR, path.basename(absolutePathOfFile));
    console.log(`Writing file... outputPath=${outputPath}`);
    await output.toFile(outputPath);
  }),
);
