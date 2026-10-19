import sharp from "sharp";
import { MMCQ } from "@vibrant/quantizer-mmcq";
import { DefaultGenerator } from "@vibrant/generator-default";

/**
 * Retain Vibrant's quantizer and palette generator, but decode with Sharp.
 * The old node-vibrant decoder depends on an unpatched file-type/Jimp chain.
 */
export async function extractLogoPalette(input: Buffer) {
  const { data } = await sharp(input)
    .resize({ width: 100, height: 100, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Match Vibrant's default filter: ignore transparent and near-white pixels.
  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3]! < 125 ||
        (pixels[i]! > 250 && pixels[i + 1]! > 250 && pixels[i + 2]! > 250)) {
      pixels[i + 3] = 0;
    }
  }
  return DefaultGenerator(MMCQ(pixels, { colorCount: 64 }));
}
