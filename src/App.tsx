import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Point, Stroke } from './features/paths/path';
import { exampleStroke, periodicSamples } from './features/paths/path';
import { chooseCoefficients, discreteRmse } from './features/fourier/dft';
import { fftCoefficients } from './features/fourier/fft';
import { resizeImage } from './features/import/loadImage';
import { DEFAULT_TRACE_OPTIONS } from './features/import/contours';
import type { TraceOptions } from './features/import/contours';
import { renderScene, screenToWorld } from './features/animation/draw';

const SAMPLE_COUNT = 256;
type ExampleName = 'circle' | 'square' | 'flower';

export default function App() {
  const [strokes, setStrokes] = useState<Stroke[]>(() => [exampleStroke('flower')]);
  const [selectedExample, setSelectedExample] = useState<ExampleName | 'custom' | 'image'>('flower');
  const [harmonics, setHarmonics] = useState(36);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [circles, setCircles] = useState(true);
  const [trace, setTrace] = useState(true);
  const [original, setOriginal] = useState(true);
  const [drawMode, setDrawMode] = useState(false);
  const [closeDrawing, setCloseDrawing] = useState(false);
  const [feedback, setFeedback] = useState('Choose an example, upload an image or draw a path.');
  const [imageName,setImageName] = useState('');
  const [imagePreview,setImagePreview] = useState('');
  const [imageVersion,setImageVersion] = useState(0);
  const [processing,setProcessing] = useState(false);
  const [traceOptions,setTraceOptions] = useState<TraceOptions>(DEFAULT_TRACE_OPTIONS);
  const raster=useRef<ImageData|null>(null);
  const requestId=useRef(0);
  const fileInput=useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const draft = useRef<Point[]>([]);
  const drawingNow = useRef(false);

  const samples = useMemo(() => strokes.map(s => periodicSamples(s, SAMPLE_COUNT)), [strokes]);
  const spectrum = useMemo(() => samples.map(fftCoefficients), [samples]);
  const coefficients = useMemo(() => spectrum.map(s => chooseCoefficients(s, harmonics)), [spectrum, harmonics]);
  const rmse = useMemo(() => samples.length ?
    Math.sqrt(samples.reduce((sum, points, i) => sum + discreteRmse(points, coefficients[i])**2, 0)/samples.length) : 0,
    [samples, coefficients]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const draw = () => renderScene(el, strokes, coefficients, phase, {
      showCircles: circles, showTrace: trace, showOriginal: original,
    }, draft.current);
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(el);
    return () => observer.disconnect();
  }, [strokes, coefficients, phase, circles, trace, original, drawMode]);

  useEffect(() => {
    if (!playing || drawMode || processing || strokes.length === 0) return;
    let raf = 0;
    let last: number | null = null;
    const animate = (time: number) => {
      if (last !== null) {
        const dt = Math.min(80, time - last);
        setPhase(p => (p + dt * speed / 6500) % 1);
      }
      last = time;
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, drawMode, processing, strokes.length]);


  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  useEffect(() => {
    const image=raster.current;
    if(!image)return;
    const worker=new Worker(new URL('./workers/imageWorker.ts',import.meta.url),{type:'module'});
    const id=++requestId.current;
    setProcessing(true);
    const timeout=window.setTimeout(()=>{
      const rgba=image.data.slice();
      worker.postMessage({id,rgba:rgba.buffer,width:image.width,height:image.height,options:traceOptions},[rgba.buffer]);
    },120);
    worker.onmessage=(event:MessageEvent<{id:number;strokes?:Stroke[];error?:string}>)=>{
      if(event.data.id!==requestId.current)return;
      setProcessing(false);
      if(event.data.error){setFeedback(event.data.error);return;}
      const result=event.data.strokes||[];
      setStrokes(result);setSelectedExample('image');setPhase(0);
      setFeedback(result.length ? 'Extracted '+result.length+' independent image contours from '+imageName+'.'
        : 'No contours found. Adjust threshold, invert the colors, or use a higher-contrast image.');
    };
    worker.onerror=()=>{
      if(id===requestId.current){setProcessing(false);setFeedback('Image tracing failed. Try a smaller image.');}
    };
    return ()=>{window.clearTimeout(timeout);worker.terminate();};
  },[imageVersion,traceOptions,imageName]);

  const onImage=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){
      setFeedback('Choose PNG, JPG or WebP.');return;
    }
    if(file.size>10*1024*1024){setFeedback('Maximum image size is 10 MB.');return;}
    const id=++requestId.current;
    setPlaying(false);setDrawMode(false);setProcessing(true);
    setFeedback('Decoding image locally…');
    try{
      const image=await resizeImage(file);
      if(id!==requestId.current)return;
      raster.current=image;setImageName(file.name);
      setImagePreview(URL.createObjectURL(file));setSelectedExample('image');
      setImageVersion(v=>v+1);
    }catch(error){
      if(id===requestId.current){setProcessing(false);
        setFeedback(error instanceof Error ? error.message : 'Could not open image.');}
    }
  };

  const choose = (name: ExampleName) => {
    requestId.current++; raster.current = null; setImageVersion(v => v+1); setProcessing(false);
    setStrokes([exampleStroke(name)]);
    setSelectedExample(name);
    setPhase(0);
    setDrawMode(false);
    setFeedback(name[0].toUpperCase() + name.slice(1) + ' loaded. Change harmonics to examine the approximation.');
  };
  const startDraw = () => {
    requestId.current++; raster.current = null; setImageVersion(v => v+1);
    setPlaying(false);
    setDrawMode(true);
    setFeedback('Draw one continuous stroke inside the canvas. Release to fit it.');
    draft.current = [];
  };
  const redrawDraft = () => {
    if (canvas.current) renderScene(canvas.current, strokes, coefficients, phase, {
      showCircles: circles, showTrace: trace, showOriginal: original,
    }, draft.current);
  };
  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawMode || !canvas.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingNow.current = true;
    draft.current = [screenToWorld(event.currentTarget, event.clientX, event.clientY)];
    redrawDraft();
  };
  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingNow.current || !drawMode) return;
    event.preventDefault();
    const p = screenToWorld(event.currentTarget, event.clientX, event.clientY);
    const prev = draft.current[draft.current.length - 1];
    if (Math.hypot(prev.x - p.x, prev.y - p.y) < 0.009) return;
    draft.current.push(p);
    redrawDraft();
  };
  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingNow.current || !drawMode) return;
    event.preventDefault();
    drawingNow.current = false;
    const points = draft.current.slice();
    draft.current = [];
    if (points.length < 3) {
      setFeedback('Stroke too short. Please draw a longer path.');
      redrawDraft();
      return;
    }
    setStrokes([{ name: 'Your drawing', points, closed: closeDrawing }]);
    setSelectedExample('custom');
    setPhase(0);
    setDrawMode(false);
    setFeedback(closeDrawing
      ? 'Closed stroke fitted: final point is connected to the first.'
      : 'Open stroke fitted: reverse travel lifts the pen, so no extra line appears.');
  };
  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">∑</div><div>
          <strong>Fourier Sketch <span>Studio</span></strong>
          <small>THE ART OF HARMONICS</small>
        </div></div>
        <div className="topbar-right"><span className="phase-chip">PHASE 02 · IMAGE LAB</span><a href="https://github.com/humanamiri85/circle-sketch-lab" target="_blank" rel="noreferrer">View on GitHub ↗</a></div>
      </header>
      <section className="intro">
        <div><p className="eyebrow">MATHEMATICS IN MOTION</p><h1>Turn images into <em>frequencies.</em></h1><p className="intro-copy">Upload a photo, extract its silhouettes, and watch independent Fourier epicycles redraw each contour.</p></div>
        <div className="privacy-label">◇ &nbsp;Your images stay on this device</div>
      </section>
      <main className="workspace">
        <aside className="panel input-panel">
          <div className="panel-title"><span className="section-number">01</span><h2>Source image & paths</h2></div>
          <p className="panel-subtitle">Upload a photo, choose an example or draw your own.</p>
          <h3>UPLOAD YOUR IMAGE</h3>
          <input className="visually-hidden" ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={onImage} aria-label="Select image for Fourier tracing" />
          <button className="action-button" disabled={processing} onClick={() => fileInput.current?.click()}>{processing ? '◌ Extracting contours…' : '↑ Upload photo'}</button>
          <p className="source-help">PNG / JPG / WebP · up to 10 MB. Works best on high-contrast images.</p>
          {imagePreview && <>
            <div className="image-preview"><img src={imagePreview} alt="Your uploaded image" /><span title={imageName}>{imageName}</span></div>
            <div className="trace-controls">
              <div className="setting-head"><label htmlFor="threshold">Threshold</label><output>{traceOptions.threshold}</output></div>
              <input id="threshold" type="range" min="1" max="254" value={traceOptions.threshold} onChange={e => setTraceOptions(t=>({...t,threshold:Number(e.target.value)}))} />
              <div className="setting-head"><label htmlFor="max-paths">Maximum contours</label><output>{traceOptions.maxPaths}</output></div>
              <input id="max-paths" type="range" min="1" max="12" value={traceOptions.maxPaths} onChange={e=>setTraceOptions(t=>({...t,maxPaths:Number(e.target.value)}))} />
              <label className="check-row"><input type="checkbox" checked={traceOptions.invert} onChange={e=>setTraceOptions(t=>({...t,invert:e.target.checked}))} /> Trace light areas instead</label>
            </div>
          </>}
          <div className="panel-rule" />
          <h3>EXAMPLES</h3>
          <div className="example-grid">
            {(['circle', 'square', 'flower'] as ExampleName[]).map(name => <button
              key={name}
              className={'example ' + (selectedExample === name && !drawMode ? 'active' : '')}
              onClick={() => choose(name)} aria-pressed={selectedExample === name && !drawMode}>
              <span aria-hidden="true" className={'example-symbol ' + name}>{name === 'circle' ? '◯' : name === 'square' ? '□' : '✿'}</span>
              <span>{name[0].toUpperCase() + name.slice(1)}</span>
            </button>)}
          </div>
          <div className="panel-rule" />
          <h3>YOUR OWN SHAPE</h3>
          <label className="check-row"><input type="checkbox" checked={closeDrawing} onChange={e => setCloseDrawing(e.target.checked)} /> Close freehand stroke</label>
          <button className={'action-button ' + (drawMode ? 'active' : '')} onClick={startDraw}>{drawMode ? '✎ Drawing mode active' : '✎ Draw your own path'}</button>
          {drawMode && <button className="subtle-button" onClick={() => { setDrawMode(false); draft.current = []; setFeedback('Drawing cancelled.'); }}>Cancel drawing</button>}
          <div className="tip-card"><b>How it works</b><p>Each point becomes a complex number. Fourier coefficients describe how rotating vectors combine to retrace the path.</p></div>
        </aside>
        <section className="viewer" aria-label="Fourier animation canvas">
          <div className="viewer-head"><div><span className="live-dot" /> LIVE FOURIER CANVAS</div><span>{SAMPLE_COUNT} SAMPLES · {harmonics} HARMONICS + DC · {strokes.length} PATHS</span></div>
          <div className={'canvas-container ' + (drawMode ? 'drawing' : '')}>
            <canvas ref={canvas} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
              onPointerCancel={() => { drawingNow.current = false; draft.current = []; redrawDraft(); }}
              aria-label={drawMode ? 'Draw your path here' : 'Fourier approximation of ' + selectedExample} />
            {drawMode && <div className="canvas-hint">Drag your finger, mouse or stylus to draw</div>}
            {processing && <div className="canvas-hint">Extracting image contours…</div>}
            <div className="canvas-legend"><span><i className="legend-trace" /> Reconstructed</span><span><i className="legend-source" /> Original path</span></div>
          </div>
          <div className="transport">
            <button className="transport-main" disabled={processing || strokes.length === 0} onClick={() => { setPlaying(p => !p); setDrawMode(false); }} aria-label={playing ? 'Pause animation' : 'Play animation'}>{playing ? 'Ⅱ' : '▶'}</button>
            <button className="transport-reset" onClick={() => { setPhase(0); setPlaying(false); }} aria-label="Restart animation">↺</button>
            <label className="scrubber"><span>PROGRESS</span><input aria-label="Animation progress" type="range" min="0" max="1000" value={Math.round(phase * 1000)} onChange={e => { setPlaying(false); setPhase(Number(e.target.value) / 1000); }} /><output>{Math.round(phase * 100)}%</output></label>
          </div>
        </section>
        <aside className="panel settings-panel">
          <div className="panel-title"><span className="section-number">02</span><h2>Fourier controls</h2></div>
          <p className="panel-subtitle">Fine-tune the reconstruction of each contour.</p>
          <div className="setting-head"><label htmlFor="harmonics">Non-DC harmonics per path</label><output>{harmonics}</output></div>
          <input id="harmonics" type="range" min="1" max="128" step="1" value={harmonics} onChange={e => setHarmonics(Number(e.target.value))} />
          <div className="range-labels"><span>1 · Minimal</span><span>128 · Detailed</span></div>
          <div className="setting-head"><label htmlFor="speed">Animation speed</label><output>{speed.toFixed(1)}×</output></div>
          <input id="speed" type="range" min="0.2" max="3" step="0.2" value={speed} onChange={e => setSpeed(Number(e.target.value))} />
          <div className="range-labels"><span>0.2×</span><span>3×</span></div>
          <div className="panel-rule" />
          <h3>VISIBILITY</h3>
          <label className="switch-row"><span>Epicycle circles</span><input type="checkbox" checked={circles} onChange={e => setCircles(e.target.checked)} /></label>
          <label className="switch-row"><span>Reconstructed trail</span><input type="checkbox" checked={trace} onChange={e => setTrace(e.target.checked)} /></label>
          <label className="switch-row"><span>Original path guide</span><input type="checkbox" checked={original} onChange={e => setOriginal(e.target.checked)} /></label>
          <div className="metric-card"><span>AVERAGE PATH RECONSTRUCTION ERROR</span><strong>{rmse.toFixed(5)}</strong><small>RMSE · normalized coordinate units</small></div>
          <p className="setting-note">DC (frequency 0) is always included. Each contour is drawn independently. Remaining coefficients are added in low-frequency order.</p>
        </aside>
      </main>
      <div className="bottom-status" role="status" aria-live="polite"><span className="status-dot" /> {feedback}</div>
      <footer><span>FOURIER SKETCH STUDIO · ORIGINAL EDUCATIONAL PROJECT</span><span>Phase 2 / Photo contours & FFT · Exports planned later</span></footer>
    </div>
  );
}
