import { describe, expect, it } from 'vitest';
import {
  adaptiveBinary, cannyBinary, enhanceContrast, removeSpecks,
} from '../src/features/preprocess/advanced';
import {
  DEFAULT_PREPROCESS_OPTIONS, binaryToRgba, preprocessImage,
} from '../src/features/preprocess/imageProcessing';
import { traceContours } from '../src/features/import/contours';

function raster(width: number, height: number, dark?: {x:number; y:number; w:number; h:number}): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4).fill(255);
  if (dark) for (let y = dark.y; y < dark.y + dark.h; y++)
    for (let x = dark.x; x < dark.x + dark.w; x++) {
      const i = 4 * (y * width + x);
      out[i] = out[i + 1] = out[i + 2] = 0;
    }
  return out;
}

describe('Phase 4: advanced image preprocessing', () => {
  it('stretches image contrast but keeps uniform and disabled inputs unchanged', () => {
    const source = new Uint8ClampedArray([60, 70, 80, 90, 100, 110]);
    const result = enhanceContrast(source, 100);
    expect(result[0]).toBe(0);
    expect(result[5]).toBe(255);
    expect(enhanceContrast(source, 0)).toEqual(source);
    expect(enhanceContrast(new Uint8ClampedArray(20).fill(145), 100))
      .toEqual(new Uint8ClampedArray(20).fill(145));
    expect(() => enhanceContrast(source, 101)).toThrow();
  });

  it('adaptive local threshold finds an edge under uneven illumination', () => {
    const w = 28, h = 18;
    const gray = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      gray[y * w + x] = 75 + 5 * x - (x >= 9 && x <= 17 && y >= 5 && y <= 12 ? 45 : 0);
    }
    const mask = adaptiveBinary(gray, w, h, 4, 8, false);
    expect(mask[6 * w + 9]).toBe(0);
    expect(mask[0]).toBe(255);
    expect(mask.some(v => v === 0)).toBe(true);
    expect(() => adaptiveBinary(gray, w, h, 99, 8)).toThrow();
  });

  it('Canny uses hysteresis, preserves edges and rejects blank image artifacts', () => {
    const w = 36, h = 36;
    const blank = new Uint8ClampedArray(w * h).fill(255);
    expect(cannyBinary(blank, w, h).binary.every(v => v === 255)).toBe(true);
    const gray = blank.slice();
    for (let y = 9; y < 28; y++) for (let x = 10; x < 26; x++)
      gray[y * w + x] = 0;
    const result = cannyBinary(gray, w, h);
    expect(result.binary.some(v => v === 0)).toBe(true);
    expect(result.binary[18 * w + 18]).toBe(255);
    expect(result.binary[0]).toBe(255);
    expect(result.thresholdUsed).toBeGreaterThanOrEqual(1);
    expect(() => cannyBinary(gray, w, h, 300)).toThrow();
  });

  it('cleanup removes isolated spots but retains substantial components', () => {
    const w = 12, h = 12;
    const mask = new Uint8ClampedArray(w * h).fill(255);
    mask[1 * w + 1] = 0;
    for (let y = 5; y < 9; y++) for (let x = 5; x < 9; x++)
      mask[y * w + x] = 0;
    const clean = removeSpecks(mask, w, h, 5);
    expect(clean[w + 1]).toBe(255);
    expect(clean[6 * w + 6]).toBe(0);
    expect(mask[w + 1]).toBe(0); // source remains unchanged
  });

  it('new pipeline updates mask and returns contours for a dark logo', () => {
    const w = 36, h = 30;
    const image = raster(w, h, { x: 8, y: 7, w: 18, h: 14 });
    const options = { ...DEFAULT_PREPROCESS_OPTIONS, method: 'adaptive' as const, blur: 0, cleanup: 1 };
    const processed = preprocessImage(image, w, h, options);
    const paths = traceContours(binaryToRgba(processed.binary), w, h, {
      threshold: 128, invert: false, maxPaths: 10, minPerimeter: 4, simplify: 0,
    });
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every(path => path.closed)).toBe(true);
    const canny = preprocessImage(image, w, h, {
      ...DEFAULT_PREPROCESS_OPTIONS, method: 'canny', mode: 'outline', blur: 0,
    });
    expect(canny.binary.some(v => v === 0)).toBe(true);
  });

  it('validates all new options', () => {
    const img = raster(10, 10);
    expect(() => preprocessImage(img, 10, 10, { ...DEFAULT_PREPROCESS_OPTIONS, contrast: 101 })).toThrow();
    expect(() => preprocessImage(img, 10, 10, { ...DEFAULT_PREPROCESS_OPTIONS, cleanup: -1 })).toThrow();
    expect(() => preprocessImage(img, 10, 10, { ...DEFAULT_PREPROCESS_OPTIONS, method: 'wrong' as 'basic' })).toThrow();
  });
});
