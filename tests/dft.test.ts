import { describe, it, expect } from 'vitest';
import { chooseCoefficients, directDft, reconstruct, discreteRmse } from '../src/features/fourier/dft';
import type { Point } from '../src/features/paths/path';

const n = 64;
const wave = (f: (t: number) => Point): Point[] => Array.from({ length: n }, (_, i) => f(i / n));
const at = (t: number, frequency: number) => ({
  x: Math.cos(2 * Math.PI * t * frequency),
  y: Math.sin(2 * Math.PI * t * frequency),
});
const near = (v: number, expected: number) => expect(v).toBeCloseTo(expected, 9);

describe('reference Fourier numerical contract', () => {
  it('represents a constant entirely with DC', () => {
    const input = wave(() => ({ x: 0.3, y: -0.8 }));
    const coeff = directDft(input);
    near(coeff[0].re, 0.3); near(coeff[0].im, -0.8);
    near(discreteRmse(input, chooseCoefficients(coeff, 0)), 0);
  });

  it('identifies counterclockwise k=+1 and clockwise k=-1', () => {
    const ccw = directDft(wave(t => at(t, 1)));
    const cw = directDft(wave(t => at(t, -1)));
    near(ccw.find(c => c.frequency === 1)!.re, 1);
    near(cw.find(c => c.frequency === -1)!.re, 1);
    near(discreteRmse(wave(t => at(t, 1)), chooseCoefficients(ccw, 1)), 0);
    near(discreteRmse(wave(t => at(t, -1)), chooseCoefficients(cw, 2)), 0);
  });

  it('recovers a shifted and scaled circle', () => {
    const input = wave(t => ({ x: 0.3 + 0.6 * at(t, 1).x, y: -0.2 + 0.6 * at(t, 1).y }));
    const coeff = directDft(input);
    near(coeff[0].re, 0.3); near(coeff[0].im, -0.2);
    near(coeff.find(c => c.frequency === 1)!.re, 0.6);
    near(discreteRmse(input, chooseCoefficients(coeff, 1)), 0);
  });

  it('extracts signed frequencies for a multi-harmonic signal', () => {
    const input = wave(t => ({
      x: 0.5 * at(t, 1).x + 0.2 * at(t, -2).x,
      y: 0.5 * at(t, 1).y + 0.2 * at(t, -2).y,
    }));
    const coeff = directDft(input);
    near(coeff.find(c => c.frequency === 1)!.re, 0.5);
    near(coeff.find(c => c.frequency === -2)!.re, 0.2);
    near(discreteRmse(input, coeff), 0);
  });

  it('inverts every sample with the full discrete basis', () => {
    const input = wave(t => ({ x: Math.cos(2 * Math.PI * t) + .3 * Math.cos(6 * Math.PI * t), y: .5 * Math.sin(4 * Math.PI * t) }));
    const coeff = directDft(input);
    input.forEach((p, i) => {
      const q = reconstruct(coeff, i / n);
      near(q.x, p.x); near(q.y, p.y);
    });
  });

  it('always includes DC and selects signed frequencies deterministically', () => {
    const coeff = directDft(wave(t => at(t, 1)));
    expect(chooseCoefficients(coeff, 0)).toHaveLength(1);
    expect(chooseCoefficients(coeff, 1).map(c => c.frequency)).toEqual([0, 1]);
    expect(chooseCoefficients(coeff, 2).map(c => c.frequency)).toEqual([0, 1, -1]);
  });
});
