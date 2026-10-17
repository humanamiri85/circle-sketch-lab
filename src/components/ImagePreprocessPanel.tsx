import { useEffect, useRef } from 'react';
import type { Stroke } from '../features/paths/path';
import {
  DEFAULT_PREPROCESS_OPTIONS,
} from '../features/preprocess/imageProcessing';
import type { PreprocessOptions } from '../features/preprocess/imageProcessing';

export type PreviewStages = {
  width: number;
  height: number;
  grayscale: Uint8ClampedArray;
  binary: Uint8ClampedArray;
  strokes: Stroke[];
  thresholdUsed: number;
};

type Props = {
  imageUrl: string;
  imageName: string;
  processing: boolean;
  options: PreprocessOptions;
  preview: PreviewStages | null;
  onOptionsChange: (options: PreprocessOptions) => void;
};

function PixelPreview({ title, pixels, width, height }: {
  title: string; pixels: Uint8ClampedArray; width: number; height: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    canvas.width = width; canvas.height = height;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < pixels.length; i++) {
      const j = i * 4;
      rgba[j] = rgba[j + 1] = rgba[j + 2] = pixels[i];
      rgba[j + 3] = 255;
    }
    context.putImageData(new ImageData(rgba, width, height), 0, 0);
  }, [pixels, width, height]);
  return <figure className="stage-tile"><figcaption>{title}</figcaption><canvas ref={ref} aria-label={title + ' processed preview'} /></figure>;
}

function ContoursPreview({ data }: { data: PreviewStages }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const { width, height, strokes } = data;
    canvas.width = width; canvas.height = height;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = '#1256a9';
    context.lineWidth = 1.5;
    context.lineJoin = 'round';
    const scale = Math.max(width, height) / 2;
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      context.beginPath();
      context.moveTo(width / 2 + stroke.points[0].x * scale,
        height / 2 - stroke.points[0].y * scale);
      for (const point of stroke.points.slice(1)) {
        context.lineTo(width / 2 + point.x * scale, height / 2 - point.y * scale);
      }
      if (stroke.closed) context.closePath();
      context.stroke();
    }
  }, [data]);
  return <figure className="stage-tile"><figcaption>4 · Fourier paths</figcaption><canvas ref={ref} aria-label="Extracted contours preview" /></figure>;
}

export function ImagePreprocessPanel({
  imageUrl, imageName, processing, options, preview, onOptionsChange,
}: Props) {
  const change = (values: Partial<PreprocessOptions>) => onOptionsChange({ ...options, ...values });
  return <div className="preprocess-panel">
    <div className="preprocess-header">
      <h3>SMART IMAGE CLEANUP</h3>
      <button className="subtle-button auto-button" type="button"
        onClick={() => onOptionsChange({ ...DEFAULT_PREPROCESS_OPTIONS, mode: options.mode })}>
        ↻ Auto clean
      </button>
    </div>
    <div className="image-preview"><img src={imageUrl} alt="Original uploaded image" /><span title={imageName}>{imageName}</span></div>
    <div className="setting-head"><label htmlFor="image-mode">Detection mode</label></div>
    <select id="image-mode" className="image-select" value={options.mode}
      onChange={e => change({ mode: e.target.value as PreprocessOptions['mode'] })}>
      <option value="silhouette">Silhouette · dark regions</option>
      <option value="outline">Outline · image edges</option>
    </select>
    <p className="source-help">
      {options.mode === 'outline'
        ? 'Edges are detected with a Sobel filter. Best for sketches and clear lines.'
        : 'Trace the boundaries of dark or light regions. Best for logos and filled shapes.'}
    </p>
    <label className="check-row"><input type="checkbox" checked={options.autoThreshold}
      onChange={e => change({ autoThreshold: e.target.checked })} />
      Automatically choose threshold
    </label>
    <div className="setting-head"><label htmlFor="image-threshold">
      {options.mode === 'outline' ? 'Edge sensitivity' : 'Black / white threshold'}
    </label><output>{options.autoThreshold ? (preview?.thresholdUsed ?? 'Auto') : options.threshold}</output></div>
    <input id="image-threshold" type="range" min="1" max="254" value={options.threshold}
      disabled={options.autoThreshold} onChange={e => change({ threshold: Number(e.target.value) })} />
    <div className="setting-head"><label htmlFor="image-blur">Denoising / blur</label><output>{options.blur}</output></div>
    <input id="image-blur" type="range" min="0" max="4" step="1" value={options.blur}
      onChange={e => change({ blur: Number(e.target.value) })} />
    <label className="check-row"><input type="checkbox" checked={options.invert}
      disabled={options.mode === 'outline'} onChange={e => change({ invert: e.target.checked })} />
      Trace light areas instead {options.mode === 'outline' ? '(silhouette only)' : ''}
    </label>
    <div className="setting-head"><label htmlFor="minimum-perimeter">Minimum contour size</label>
      <output>{options.minPerimeter} px</output></div>
    <input id="minimum-perimeter" type="range" min="0" max="160" step="4"
      value={options.minPerimeter} onChange={e => change({ minPerimeter: Number(e.target.value) })} />
    <div className="setting-head"><label htmlFor="max-paths">Maximum contours</label>
      <output>{options.maxPaths}</output></div>
    <input id="max-paths" type="range" min="1" max="12" value={options.maxPaths}
      onChange={e => change({ maxPaths: Number(e.target.value) })} />
    <h3 className="stages-heading">LIVE PROCESSING PREVIEW</h3>
    {preview && !processing && <div className="stage-grid">
      <figure className="stage-tile"><figcaption>1 · Original</figcaption><img src={imageUrl} alt="Original color image" /></figure>
      <PixelPreview title="2 · Grayscale" pixels={preview.grayscale} width={preview.width} height={preview.height} />
      <PixelPreview title="3 · Black & white" pixels={preview.binary} width={preview.width} height={preview.height} />
      <ContoursPreview data={preview} />
    </div>}
    {processing && <p role="status" className="preview-loading">Processing in your browser…</p>}
    {!processing && !preview && <p className="source-help">No processed preview yet.</p>}
    <p className="source-help">Changes automatically update the Fourier animation. No image is uploaded to a server.</p>
  </div>;
}
