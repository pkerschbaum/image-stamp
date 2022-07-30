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
} as const;
const PADDING = {
  BOTTOM: 32,
  RIGHT: 32,
};

await fs.promises.mkdir(PATHS.OUTPUT_DIR, { recursive: true });
const allInputFiles = await fs.promises.readdir(PATHS.INPUT_DIR);
const stamp = sharp(PATHS.STAMP_FILE);

await Promise.all(
  allInputFiles.map(async (relativePathOfFile) => {
    const absolutePathOfFile = path.join(PATHS.INPUT_DIR, relativePathOfFile);
    const sharp_inputFile = sharp(absolutePathOfFile);

    const metadata_inputFile = await sharp_inputFile.metadata();
    invariant(metadata_inputFile.height);
    invariant(metadata_inputFile.width);

    let output;
    if (options.position === 'bottom-right') {
      const stampWidthAdjustedHeight = await stamp
        .resize(undefined, Math.floor(metadata_inputFile.height / 7))
        .toBuffer();
      const metadata_logo = await sharp(stampWidthAdjustedHeight).metadata();
      invariant(metadata_logo.height);
      invariant(metadata_logo.width);

      output = sharp_inputFile.composite([
        {
          input: stampWidthAdjustedHeight,
          top: metadata_inputFile.height - metadata_logo.height - PADDING.BOTTOM,
          left: metadata_inputFile.width - metadata_logo.width - PADDING.RIGHT,
        },
      ]);
    } else {
      throw new Error('not implemented');
    }

    const outputPath = path.join(PATHS.OUTPUT_DIR, path.basename(absolutePathOfFile));
    console.log(`Writing file... outputPath=${outputPath}`);
    await output.toFile(outputPath);
  }),
);
