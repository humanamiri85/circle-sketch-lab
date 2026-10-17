export type Point = Readonly<{ x: number; y: number }>;
export type Stroke = Readonly<{ name: string; points: readonly Point[]; closed: boolean }>;

const interpolate = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
});
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function pointAt(stroke: Stroke, u: number): Point {
  const points = stroke.points;
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  if (u <= 0) return points[0];
  if (u >= 1) return stroke.closed ? points[0] : points[points.length - 1];
  const segments = points.length - 1 + Number(stroke.closed);
  const distances: number[] = [];
  let total = 0;
  for (let i = 0; i < segments; i++) {
    const d = distance(points[i], points[(i + 1) % points.length]);
    distances.push(d); total += d;
  }
  if (total <= 1e-12) return points[0];
  let remaining = Math.min(1, Math.max(0, u)) * total;
  for (let i = 0; i < segments; i++) {
    if (remaining <= distances[i] || i === segments - 1) {
      return interpolate(points[i], points[(i + 1) % points.length],
        distances[i] === 0 ? 0 : remaining / distances[i]);
    }
    remaining -= distances[i];
  }
  return points[0];
}

/** Retrace open strokes periodically; do not ink the returning half. */
export function periodicSamples(stroke: Stroke, count = 256): Point[] {
  if (!Number.isInteger(count) || count < 4 || count > 2048) throw new Error('Invalid sample count');
  return Array.from({ length: count }, (_, j) => {
    const t = j / count;
    return pointAt(stroke, stroke.closed ? t : t <= 0.5 ? 2 * t : 2 - 2 * t);
  });
}

export function exampleStroke(name: 'circle' | 'square' | 'flower'): Stroke {
  if (name === 'circle') return {
    name: 'Circle', closed: true,
    points: Array.from({ length: 180 }, (_, j) => {
      const t = 2 * Math.PI * j / 180;
      return { x: 0.82 * Math.cos(t), y: 0.82 * Math.sin(t) };
    }),
  };
  if (name === 'square') return {
    name: 'Square', closed: true,
    points: [
      { x: -0.75, y: -0.75 }, { x: 0.75, y: -0.75 },
      { x: 0.75, y: 0.75 }, { x: -0.75, y: 0.75 },
    ],
  };
  return {
    name: 'Flower', closed: true,
    points: Array.from({ length: 360 }, (_, j) => {
      const theta = 2 * Math.PI * j / 360;
      const r = 0.56 + 0.24 * Math.cos(6 * theta);
      return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
    }),
  };
}
