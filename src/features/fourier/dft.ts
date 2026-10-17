import type { Point } from '../paths/path';

export type Coefficient = Readonly<{ frequency: number; re: number; im: number }>;
export type Epicycle = Readonly<{
  frequency: number; x: number; y: number; radius: number; endX: number; endY: number;
}>;

/** Ck = mean(zj * exp(-i 2 pi k j/M)), signed frequency convention. */
export function directDft(samples: readonly Point[]): Coefficient[] {
  const m = samples.length;
  if (m < 2 || m > 2048) throw new Error('Expected 2..2048 finite samples');
  if (samples.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    throw new Error('Non-finite path coordinate');
  }
  return Array.from({ length: m }, (_, index) => {
    const frequency = index > Math.floor(m / 2) ? index - m : index;
    let re = 0, im = 0;
    for (let j = 0; j < m; j++) {
      const angle = -2 * Math.PI * index * j / m;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      re += samples[j].x * cos - samples[j].y * sin;
      im += samples[j].x * sin + samples[j].y * cos;
    }
    return { frequency, re: re / m, im: im / m };
  });
}

/** The number refers to non-DC harmonics. DC is always included. */
export function chooseCoefficients(coefficients: readonly Coefficient[], nonDcCount: number): Coefficient[] {
  const dc = coefficients.find(c => c.frequency === 0);
  if (!dc) throw new Error('Missing DC coefficient');
  const sorted = coefficients.filter(c => c.frequency !== 0).sort(
    (a, b) => Math.abs(a.frequency) - Math.abs(b.frequency) || b.frequency - a.frequency,
  );
  const count = Number.isFinite(nonDcCount) ? Math.max(0, Math.floor(nonDcCount)) : 0;
  return [dc, ...sorted.slice(0, count)];
}

export function reconstruct(coefficients: readonly Coefficient[], t: number): Point {
  let x = 0, y = 0;
  for (const c of coefficients) {
    const angle = 2 * Math.PI * c.frequency * t;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    x += c.re * cos - c.im * sin;
    y += c.re * sin + c.im * cos;
  }
  return { x, y };
}

export function epicycles(coefficients: readonly Coefficient[], t: number): Epicycle[] {
  const result: Epicycle[] = [];
  let x = 0, y = 0;
  for (const c of coefficients) {
    const angle = 2 * Math.PI * c.frequency * t;
    const dx = c.re * Math.cos(angle) - c.im * Math.sin(angle);
    const dy = c.re * Math.sin(angle) + c.im * Math.cos(angle);
    result.push({ frequency: c.frequency, x, y,
      radius: Math.hypot(c.re, c.im), endX: x + dx, endY: y + dy });
    x += dx; y += dy;
  }
  return result;
}

export function discreteRmse(samples: readonly Point[], coeffs: readonly Coefficient[]): number {
  if (!samples.length) return 0;
  let squared = 0;
  for (let i = 0; i < samples.length; i++) {
    const q = reconstruct(coeffs, i / samples.length);
    squared += (samples[i].x - q.x) ** 2 + (samples[i].y - q.y) ** 2;
  }
  return Math.sqrt(squared / samples.length);
}
