/** Deterministic browser/worker-safe grayscale, denoising and mask generation. */
export type ImageMode = 'silhouette' | 'outline';

export type PreprocessOptions = Readonly<{
  mode: ImageMode;
  autoThreshold: boolean;
  threshold: number;
  blur: number;
  invert: boolean;
  minPerimeter: number;
  maxPaths: number;
}>;

export const DEFAULT_PREPROCESS_OPTIONS: PreprocessOptions = {
  mode: 'silhouette',
  autoThreshold: true,
  threshold: 128,
  blur: 1,
  invert: false,
  minPerimeter: 16,
  maxPaths: 8,
};

export type ProcessedImage = {
  grayscale: Uint8ClampedArray;
  binary: Uint8ClampedArray;
  thresholdUsed: number;
};

function valid(options: PreprocessOptions): void {
  if (!['silhouette', 'outline'].includes(options.mode) ||
      typeof options.autoThreshold !== 'boolean' ||
      typeof options.invert !== 'boolean' ||
      !Number.isFinite(options.threshold) || options.threshold < 1 || options.threshold > 254 ||
      !Number.isInteger(options.blur) || options.blur < 0 || options.blur > 4 ||
      !Number.isFinite(options.minPerimeter) || options.minPerimeter < 0 || options.minPerimeter > 2000 ||
      !Number.isInteger(options.maxPaths) || options.maxPaths < 1 || options.maxPaths > 24) {
    throw new Error('Invalid preprocessing options.');
  }
}

/** Standard luminance with transparency composited over white. */
export function rgbaToGray(rgba: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 ||
      width * height > 512 * 512 || rgba.length !== width * height * 4) {
    throw new Error('Invalid image buffer.');
  }
  const result = new Uint8ClampedArray(width * height);
  for (let i = 0; i < result.length; i++) {
    const k = 4 * i;
    const alpha = rgba[k + 3] / 255;
    result[i] = (0.2126 * rgba[k] + 0.7152 * rgba[k + 1] + 0.0722 * rgba[k + 2]) * alpha +
      255 * (1 - alpha);
  }
  return result;
}

/** Separable box blur; radius 0 is an exact copy. */
export function boxBlur(source: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  if (!Number.isInteger(radius) || radius < 0 || radius > 4 || source.length !== width * height)
    throw new Error('Invalid blur arguments.');
  if (radius === 0) return source.slice();
  const horizontal = new Float64Array(source.length);
  const out = new Uint8ClampedArray(source.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let sum = 0, count = 0;
    for (let dx = -radius; dx <= radius; dx++) {
      const xx = x + dx;
      if (xx >= 0 && xx < width) { sum += source[y * width + xx]; count++; }
    }
    horizontal[y * width + x] = sum / count;
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let sum = 0, count = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      const yy = y + dy;
      if (yy >= 0 && yy < height) { sum += horizontal[yy * width + x]; count++; }
    }
    out[y * width + x] = sum / count;
  }
  return out;
}

/** Otsu threshold: max between-class variance; uniform images use a neutral fallback. */
export function otsuThreshold(gray: Uint8ClampedArray): number {
  if (gray.length === 0) return 128;
  const hist = new Uint32Array(256);
  let sum = 0;
  for (const value of gray) { hist[value]++; sum += value; }
  let weightBack = 0, sumBack = 0, best = -1, threshold = 128;
  for (let t = 0; t < 255; t++) {
    weightBack += hist[t];
    sumBack += t * hist[t];
    const weightFront = gray.length - weightBack;
    if (!weightBack || !weightFront) continue;
    const difference = sumBack / weightBack - (sum - sumBack) / weightFront;
    const variance = weightBack * weightFront * difference * difference;
    if (variance > best) { best = variance; threshold = t; }
  }
  return threshold;
}

/** Sobel edge magnitude in 0..255. Border pixels remain zero. */
export function sobelMagnitude(gray: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  if (gray.length !== width * height) throw new Error('Invalid edge raster.');
  const out = new Uint8ClampedArray(gray.length);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    const a = gray[i - width - 1], b = gray[i - width], c = gray[i - width + 1];
    const d = gray[i - 1], f = gray[i + 1];
    const g = gray[i + width - 1], h = gray[i + width], j = gray[i + width + 1];
    const gx = -a - 2 * d - g + c + 2 * f + j;
    const gy = -a - 2 * b - c + g + 2 * h + j;
    out[i] = Math.min(255, Math.hypot(gx, gy) / 4);
  }
  return out;
}

/** Select a nonzero edge-magnitude percentile, avoiding all-background Otsu edge masks. */
export function autoEdgeThreshold(edges: Uint8ClampedArray): number {
  const hist = new Uint32Array(256);
  let count = 0;
  for (const e of edges) if (e > 0) { hist[e]++; count++; }
  if (count === 0) return 40;
  const target = Math.max(1, Math.ceil(count * 0.6));
  let cumulative = 0;
  for (let i = 1; i <= 255; i++) {
    cumulative += hist[i];
    if (cumulative >= target) return Math.max(24, i);
  }
  return 40;
}

/** binary: 0 = black/foreground; 255 = white/background. */
export function preprocessImage(
  rgba: Uint8ClampedArray, width: number, height: number,
  options: PreprocessOptions = DEFAULT_PREPROCESS_OPTIONS
): ProcessedImage {
  valid(options);
  const grayscale = rgbaToGray(rgba, width, height);
  const smooth = boxBlur(grayscale, width, height, options.blur);
  const measure = options.mode === 'outline' ? sobelMagnitude(smooth, width, height) : smooth;
  const thresholdUsed = options.autoThreshold ?
    (options.mode === 'outline' ? autoEdgeThreshold(measure) : otsuThreshold(measure)) :
    options.threshold;
  const binary = new Uint8ClampedArray(measure.length);
  for (let i = 0; i < binary.length; i++) {
    const foreground = options.mode === 'outline'
      ? measure[i] >= thresholdUsed && measure[i] > 0
      : (options.invert ? measure[i] > thresholdUsed : measure[i] <= thresholdUsed);
    binary[i] = foreground ? 0 : 255;
  }
  return { grayscale: smooth, binary, thresholdUsed };
}

/** Repackage exact processed mask for the current contour tracer. */
export function binaryToRgba(binary: Uint8ClampedArray): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(binary.length * 4);
  for (let i = 0; i < binary.length; i++) {
    const k = i * 4;
    rgba[k] = rgba[k + 1] = rgba[k + 2] = binary[i];
    rgba[k + 3] = 255;
  }
  return rgba;
}
