/** Deterministic advanced raster filters. Pixels are 0–255; masks use 0 for foreground. */
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Percentile contrast stretch blended with input (0% is a copy). */
export function enhanceContrast(gray: Uint8ClampedArray, strength: number): Uint8ClampedArray {
  if (!Number.isFinite(strength) || strength < 0 || strength > 100)
    throw new Error('Contrast must be between 0 and 100.');
  if (!strength || gray.length === 0) return gray.slice();
  const hist = new Uint32Array(256);
  for (const v of gray) hist[v]++;
  const percentile = (fraction: number): number => {
    const target = Math.max(1, Math.ceil(fraction * gray.length));
    let sum = 0;
    for (let i = 0; i < 256; i++) { sum += hist[i]; if (sum >= target) return i; }
    return 255;
  };
  const low = percentile(0.02), high = percentile(0.98);
  if (high <= low) return gray.slice();
  const mix = strength / 100;
  return Uint8ClampedArray.from(gray, v => {
    const scaled = clamp((v - low) * 255 / (high - low), 0, 255);
    return v * (1 - mix) + scaled * mix;
  });
}

/** Local-mean adaptive threshold (integral image, O(width*height)). */
export function adaptiveBinary(
  gray: Uint8ClampedArray, width: number, height: number,
  radius: number, offset: number, invert = false,
): Uint8ClampedArray {
  if (gray.length !== width * height || !Number.isInteger(radius) || radius < 1 || radius > 40 ||
      !Number.isFinite(offset) || offset < -20 || offset > 40)
    throw new Error('Invalid adaptive threshold arguments.');
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  for (let y = 1; y <= height; y++) {
    let row = 0;
    for (let x = 1; x <= width; x++) {
      row += gray[(y - 1) * width + x - 1];
      integral[y * stride + x] = integral[(y - 1) * stride + x] + row;
    }
  }
  const binary = new Uint8ClampedArray(gray.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const x0 = Math.max(0, x - radius), x1 = Math.min(width, x + radius + 1);
    const y0 = Math.max(0, y - radius), y1 = Math.min(height, y + radius + 1);
    const sum = integral[y1 * stride + x1] - integral[y0 * stride + x1] -
      integral[y1 * stride + x0] + integral[y0 * stride + x0];
    const mean = sum / ((x1 - x0) * (y1 - y0));
    const dark = gray[y * width + x] < mean - offset;
    const light = gray[y * width + x] > mean + offset;
    binary[y * width + x] = (invert ? light : dark) ? 0 : 255;
  }
  return binary;
}

/** Canny-style Sobel gradient, nonmaximum suppression, and hysteresis.
 * Input should already be denoised. No external dependency or image upload.
 */
export function cannyBinary(
  gray: Uint8ClampedArray, width: number, height: number, highThreshold?: number,
): { binary: Uint8ClampedArray; thresholdUsed: number } {
  if (gray.length !== width * height || width < 3 || height < 3 ||
      (highThreshold !== undefined && (!Number.isFinite(highThreshold) || highThreshold < 1 || highThreshold > 254)))
    throw new Error('Invalid Canny arguments.');
  const count = width * height;
  const mag = new Float32Array(count);
  const dir = new Uint8Array(count);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    const a = gray[i - width - 1], b = gray[i - width], c = gray[i - width + 1];
    const d = gray[i - 1], f = gray[i + 1];
    const g = gray[i + width - 1], h = gray[i + width], j = gray[i + width + 1];
    const dx = -a - 2 * d - g + c + 2 * f + j;
    const dy = -a - 2 * b - c + g + 2 * h + j;
    mag[i] = Math.min(255, Math.hypot(dx, dy) / 4);
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 180) % 180;
    dir[i] = angle < 22.5 || angle >= 157.5 ? 0 : angle < 67.5 ? 1 : angle < 112.5 ? 2 : 3;
  }
  const thin = new Float32Array(count);
  let hist = new Uint32Array(256), nonzero = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x, value = mag[i];
    if (!value) continue;
    const offsets = dir[i] === 0 ? [1, -1] : dir[i] === 1 ?
      [width - 1, -width + 1] : dir[i] === 2 ?
      [width, -width] : [width + 1, -width - 1];
    if (value >= mag[i + offsets[0]] && value >= mag[i + offsets[1]]) {
      thin[i] = value;
      const h = clamp(Math.round(value), 1, 255);
      hist[h]++; nonzero++;
    }
  }
  let high = highThreshold ?? 48;
  if (highThreshold === undefined && nonzero) {
    // Select the upper 30% of nonzero, locally maximal gradients.
    const target = Math.max(1, Math.ceil(nonzero * 0.7));
    let cumulative = 0;
    for (let i = 1; i <= 255; i++) {
      cumulative += hist[i];
      if (cumulative >= target) { high = Math.max(24, i); break; }
    }
  }
  const low = Math.max(6, high * 0.45);
  const used = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0, tail = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    if (thin[i] >= high && !used[i]) { used[i] = 1; queue[tail++] = i; }
  }
  while (head < tail) {
    const i = queue[head++], x = i % width, y = (i - x) / width;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const xx = x + ox, yy = y + oy;
      if (xx < 1 || xx >= width - 1 || yy < 1 || yy >= height - 1) continue;
      const j = yy * width + xx;
      if (!used[j] && thin[j] >= low) { used[j] = 1; queue[tail++] = j; }
    }
  }
  const binary = new Uint8ClampedArray(count);
  for (let i = 0; i < count; i++) binary[i] = used[i] ? 0 : 255;
  return { binary, thresholdUsed: high };
}

/** Erase tiny connected black-pixel specks, preserving larger regions/edges. */
export function removeSpecks(
  binary: Uint8ClampedArray, width: number, height: number, minArea: number,
): Uint8ClampedArray {
  if (binary.length !== width * height || !Number.isInteger(minArea) || minArea < 0 || minArea > 1000)
    throw new Error('Invalid speck filter arguments.');
  const out = binary.slice();
  if (minArea <= 1) return out;
  const visited = new Uint8Array(binary.length), queue = new Int32Array(binary.length);
  for (let start = 0; start < binary.length; start++) {
    if (visited[start] || binary[start] !== 0) continue;
    let head = 0, tail = 1;
    queue[0] = start; visited[start] = 1;
    while (head < tail) {
      const i = queue[head++], x = i % width, y = (i - x) / width;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const xx = x + ox, yy = y + oy;
        if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
        const j = yy * width + xx;
        if (!visited[j] && binary[j] === 0) {
          visited[j] = 1;
          queue[tail++] = j;
        }
      }
    }
    if (tail < minArea) for (let k = 0; k < tail; k++) out[queue[k]] = 255;
  }
  return out;
}
