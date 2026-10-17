import type { Point, Stroke } from '../paths/path';
import { pointAt } from '../paths/path';
import type { Coefficient } from '../fourier/dft';
import { reconstruct, epicycles } from '../fourier/dft';

export type DisplayOptions = Readonly<{
  showCircles: boolean;
  showOriginal: boolean;
  showTrace: boolean;
}>;

type CoordinateMap = (p: Point) => [number, number];

export function screenToWorld(canvas: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width, rect.height) * 0.37;
  return {
    x: (clientX - rect.left - rect.width / 2) / scale,
    y: -(clientY - rect.top - rect.height / 2) / scale,
  };
}

function paintStroke(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  map: CoordinateMap,
  color: string,
  width: number,
  closed = false,
) {
  if (!points.length) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  let [x, y] = map(points[0]);
  ctx.moveTo(x, y);
  for (const p of points.slice(1)) {
    [x, y] = map(p);
    ctx.lineTo(x, y);
  }
  if (closed) ctx.closePath();
  ctx.stroke();
}

export function renderScene(
  canvas: HTMLCanvasElement,
  stroke: Stroke,
  coeffs: readonly Coefficient[],
  phase: number,
  options: DisplayOptions,
  draft: readonly Point[] = [],
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = rect.width, h = rect.height;
  const pw = Math.max(1, Math.round(w * dpr));
  const ph = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#091326';
  ctx.fillRect(0, 0, w, h);
  const scale = Math.min(w, h) * 0.37;
  const map: CoordinateMap = p => [w / 2 + scale * p.x, h / 2 - scale * p.y];

  ctx.strokeStyle = 'rgba(166,190,229,.07)';
  ctx.lineWidth = 1;
  for (let i = -6; i <= 6; i++) {
    const spacing = scale / 4;
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * spacing, 0);
    ctx.lineTo(w / 2 + i * spacing, h);
    ctx.moveTo(0, h / 2 + i * spacing);
    ctx.lineTo(w, h / 2 + i * spacing);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(124,164,225,.18)';
  ctx.beginPath();
  ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
  ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
  ctx.stroke();

  if (options.showOriginal && stroke.points.length) {
    const pts = Array.from({ length: 340 }, (_, i) => pointAt(stroke, stroke.closed ? i / 340 : i / 339));
    ctx.setLineDash([5, 7]);
    paintStroke(ctx, pts, map, 'rgba(146,164,199,.50)', 1.4, stroke.closed);
    ctx.setLineDash([]);
  }

  if (options.showTrace && coeffs.length) {
    const maxInkTime = stroke.closed
      ? Math.max(0, Math.min(1, phase))
      : Math.min(0.5, Math.max(0, phase));
    const count = Math.max(2, Math.ceil(maxInkTime * 560) + 1);
    const trace = Array.from({ length: count }, (_, i) => reconstruct(coeffs, maxInkTime * i / (count - 1)));
    paintStroke(ctx, trace, map, '#65f0cc', 2.8);
  }

  const chain = epicycles(coeffs, phase);
  if (options.showCircles) {
    for (const circle of chain) {
      const [cx, cy] = map({ x: circle.x, y: circle.y });
      const [ex, ey] = map({ x: circle.endX, y: circle.endY });
      if (circle.frequency !== 0 && circle.radius > 0.000001) {
        ctx.strokeStyle = 'rgba(114,168,242,.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, circle.radius * scale, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(168,202,254,.75)';
      ctx.lineWidth = 1.25;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
    }
  }
  const tip = reconstruct(coeffs, phase);
  const [tipX, tipY] = map(tip);
  ctx.beginPath();
  ctx.arc(tipX, tipY, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#a5fff1';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(tipX, tipY, 11, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(101,240,204,.28)';
  ctx.stroke();
  if (draft.length) paintStroke(ctx, draft, map, '#fbbf82', 3);
}
