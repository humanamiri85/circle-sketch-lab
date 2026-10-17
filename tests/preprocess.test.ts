import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREPROCESS_OPTIONS, autoEdgeThreshold, binaryToRgba, boxBlur,
  otsuThreshold, preprocessImage, rgbaToGray, sobelMagnitude,
} from '../src/features/preprocess/imageProcessing';
import { traceContours } from '../src/features/import/contours';

const sample = (width: number, height: number, dark?: {x:number;y:number;w:number;h:number}) => {
  const rgba = new Uint8ClampedArray(width * height * 4).fill(255);
  if (dark) for (let y = dark.y; y < dark.y + dark.h; y++) for (let x = dark.x; x < dark.x + dark.w; x++) {
    const i = 4 * (y * width + x); rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
  }
  return rgba;
};

describe('Smart Image Preprocessing', () => {
  it('composites alpha over white and uses luminance channels', () => {
    const image = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 0, 0, 0,
      0, 0, 0, 255, 255, 255, 255, 255,
    ]);
    const gray = rgbaToGray(image, 2, 2);
    expect(gray[0]).toBeGreaterThan(50);
    expect(gray[0]).toBeLessThan(60);
    expect([...gray.slice(1)]).toEqual([255, 0, 255]);
  });

  it('Otsu distinguishes black from white, including a threshold of zero', () => {
    const image = sample(20, 20, { x: 4, y: 4, w: 10, h: 10 });
    const result = preprocessImage(image, 20, 20, {
      ...DEFAULT_PREPROCESS_OPTIONS, blur: 0,
    });
    expect(result.thresholdUsed).toBe(0);
    expect(result.binary[4 * 20 + 4]).toBe(0);
    expect(result.binary[0]).toBe(255);
  });

  it('manual threshold changes classification and invert selects light regions', () => {
    const image = sample(8, 8);
    for (let i = 0; i < 4; i++) {
      const p = 4 * (3 * 8 + 3 + i);
      image[p] = image[p + 1] = image[p + 2] = 125;
    }
    const low = preprocessImage(image, 8, 8, { ...DEFAULT_PREPROCESS_OPTIONS, blur: 0, autoThreshold: false, threshold: 100 });
    const high = preprocessImage(image, 8, 8, { ...DEFAULT_PREPROCESS_OPTIONS, blur: 0, autoThreshold: false, threshold: 140 });
    const inverted = preprocessImage(image, 8, 8, { ...DEFAULT_PREPROCESS_OPTIONS, blur: 0, autoThreshold: false, threshold: 140, invert: true });
    expect(low.binary[3 * 8 + 3]).toBe(255);
    expect(high.binary[3 * 8 + 3]).toBe(0);
    expect(inverted.binary[3 * 8 + 3]).toBe(255);
    expect(inverted.binary[0]).toBe(0);
  });

  it('box blur decreases isolated pixel contrast', () => {
    const data = new Uint8ClampedArray(9 * 9).fill(255);
    data[4 * 9 + 4] = 0;
    expect(boxBlur(data, 9, 9, 0)[4 * 9 + 4]).toBe(0);
    expect(boxBlur(data, 9, 9, 1)[4 * 9 + 4]).toBeGreaterThan(0);
  });

  it('outline detects edges but not filled image interiors', () => {
    const rgba = sample(32, 32, { x: 9, y: 9, w: 13, h: 13 });
    const result = preprocessImage(rgba, 32, 32, { ...DEFAULT_PREPROCESS_OPTIONS, mode: 'outline', blur: 0 });
    expect(result.binary[0]).toBe(255);
    expect(result.binary[15 * 32 + 15]).toBe(255);
    expect(result.binary.some(v => v === 0)).toBe(true);
    expect(autoEdgeThreshold(sobelMagnitude(rgbaToGray(rgba, 32, 32), 32, 32))).toBeGreaterThan(0);
  });

  it('processed black-and-white image yields separate Fourier paths', () => {
    const rgba = sample(32, 24, { x: 3, y: 4, w: 7, h: 8 });
    for (let y = 3; y < 15; y++) for (let x = 20; x < 29; x++) {
      const i = 4 * (y * 32 + x); rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
    }
    const result = preprocessImage(rgba, 32, 24, { ...DEFAULT_PREPROCESS_OPTIONS, blur: 0 });
    const contours = traceContours(binaryToRgba(result.binary), 32, 24,
      { threshold: 128, invert: false, minPerimeter: 4, maxPaths: 12, simplify: 0 });
    expect(contours).toHaveLength(2);
    expect(contours.every(c => c.closed && c.points.length >= 4)).toBe(true);
  });

  it('handles blank images and rejects invalid options/buffers', () => {
    const rgba = sample(16, 16);
    const result = preprocessImage(rgba, 16, 16);
    expect(result.binary.every(v => v === 255)).toBe(true);
    expect(otsuThreshold(new Uint8ClampedArray(0))).toBe(128);
    expect(() => preprocessImage(rgba, 16, 16, { ...DEFAULT_PREPROCESS_OPTIONS, blur: -1 })).toThrow();
    expect(() => rgbaToGray(new Uint8ClampedArray(3), 16, 16)).toThrow();
  });
});
