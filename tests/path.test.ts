import { describe, expect, it } from 'vitest';
import { pointAt, periodicSamples, exampleStroke } from '../src/features/paths/path';

describe('path sampling and closure', () => {
  it('samples circle points evenly and finite', () => {
    const p = periodicSamples(exampleStroke('circle'), 128);
    expect(p).toHaveLength(128);
    expect(p[0].x).toBeCloseTo(0.82, 2);
    expect(p.every(q => Number.isFinite(q.x) && Number.isFinite(q.y))).toBe(true);
  });

  it('closes only explicitly closed strokes', () => {
    const open = { name: 'Open', closed: false, points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] };
    const closed = { ...open, closed: true };
    expect(pointAt(open, 1)).toEqual({ x: 1, y: 1 });
    expect(pointAt(closed, 1)).toEqual({ x: 0, y: 0 });
  });

  it('uses a continuous forward/back periodic extension for open strokes', () => {
    const open = { name: 'Line', closed: false, points: [{ x: -1, y: 0 }, { x: 1, y: 0 }] };
    const p = periodicSamples(open, 64);
    expect(p[0].x).toBeCloseTo(-1);
    expect(p[32].x).toBeCloseTo(1);
    expect(p[63].x).toBeLessThan(-0.9);
  });

  it('rejects invalid sample budgets', () => {
    expect(() => periodicSamples(exampleStroke('square'), 1)).toThrow();
    expect(() => periodicSamples(exampleStroke('square'), 4096)).toThrow();
  });
});
