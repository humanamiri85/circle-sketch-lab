import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Point, Stroke } from './features/paths/path';
import { exampleStroke, periodicSamples } from './features/paths/path';
import { chooseCoefficients, directDft, discreteRmse } from './features/fourier/dft';
import { renderScene, screenToWorld } from './features/animation/draw';

const SAMPLE_COUNT = 256;
type ExampleName = 'circle' | 'square' | 'flower';

export default function App() {
  const [stroke, setStroke] = useState<Stroke>(() => exampleStroke('flower'));
  const [selectedExample, setSelectedExample] = useState<ExampleName | 'custom'>('flower');
  const [harmonics, setHarmonics] = useState(36);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [circles, setCircles] = useState(true);
  const [trace, setTrace] = useState(true);
  const [original, setOriginal] = useState(true);
  const [drawMode, setDrawMode] = useState(false);
  const [closeDrawing, setCloseDrawing] = useState(false);
  const [feedback, setFeedback] = useState('Choose an example or draw a path to begin.');
  const canvas = useRef<HTMLCanvasElement>(null);
  const draft = useRef<Point[]>([]);
  const drawingNow = useRef(false);

  const samples = useMemo(() => periodicSamples(stroke, SAMPLE_COUNT), [stroke]);
  const spectrum = useMemo(() => directDft(samples), [samples]);
  const coefficients = useMemo(() => chooseCoefficients(spectrum, harmonics), [spectrum, harmonics]);
  const rmse = useMemo(() => discreteRmse(samples, coefficients), [samples, coefficients]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const draw = () => renderScene(el, stroke, coefficients, phase, {
      showCircles: circles, showTrace: trace, showOriginal: original,
    }, draft.current);
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(el);
    return () => observer.disconnect();
  }, [stroke, coefficients, phase, circles, trace, original, drawMode]);

  useEffect(() => {
    if (!playing || drawMode) return;
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
  }, [playing, speed, drawMode]);

  const choose = (name: ExampleName) => {
    setStroke(exampleStroke(name));
    setSelectedExample(name);
    setPhase(0);
    setDrawMode(false);
    setFeedback(name[0].toUpperCase() + name.slice(1) + ' loaded. Change harmonics to examine the approximation.');
  };
  const startDraw = () => {
    setPlaying(false);
    setDrawMode(true);
    setFeedback('Draw one continuous stroke inside the canvas. Release to fit it.');
    draft.current = [];
  };
  const redrawDraft = () => {
    if (canvas.current) renderScene(canvas.current, stroke, coefficients, phase, {
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
    setStroke({ name: 'Your drawing', points, closed: closeDrawing });
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
        <div className="topbar-right"><span className="phase-chip">PHASE 01 · INTERACTIVE STUDIO</span><a href="https://github.com/humanamiri85/circle-sketch-lab" target="_blank" rel="noreferrer">View on GitHub ↗</a></div>
      </header>
      <section className="intro">
        <div><p className="eyebrow">MATHEMATICS IN MOTION</p><h1>Draw with <em>frequencies.</em></h1><p className="intro-copy">Watch rotating vectors recreate any path. Sketch your own shape, explore Fourier harmonics, and see precision emerge.</p></div>
        <div className="privacy-label">◇ &nbsp;100% client-side computation</div>
      </section>
      <main className="workspace">
        <aside className="panel input-panel">
          <div className="panel-title"><span className="section-number">01</span><h2>Source path</h2></div>
          <p className="panel-subtitle">Start with a mathematical shape or create your own.</p>
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
          <div className="viewer-head"><div><span className="live-dot" /> LIVE FOURIER CANVAS</div><span>{SAMPLE_COUNT} SAMPLES · {harmonics} HARMONICS + DC</span></div>
          <div className={'canvas-container ' + (drawMode ? 'drawing' : '')}>
            <canvas ref={canvas} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
              onPointerCancel={() => { drawingNow.current = false; draft.current = []; redrawDraft(); }}
              aria-label={drawMode ? 'Draw your path here' : 'Fourier approximation of ' + stroke.name} />
            {drawMode && <div className="canvas-hint">Drag your finger, mouse or stylus to draw</div>}
            <div className="canvas-legend"><span><i className="legend-trace" /> Reconstructed</span><span><i className="legend-source" /> Original path</span></div>
          </div>
          <div className="transport">
            <button className="transport-main" onClick={() => { setPlaying(p => !p); setDrawMode(false); }} aria-label={playing ? 'Pause animation' : 'Play animation'}>{playing ? 'Ⅱ' : '▶'}</button>
            <button className="transport-reset" onClick={() => { setPhase(0); setPlaying(false); }} aria-label="Restart animation">↺</button>
            <label className="scrubber"><span>PROGRESS</span><input aria-label="Animation progress" type="range" min="0" max="1000" value={Math.round(phase * 1000)} onChange={e => { setPlaying(false); setPhase(Number(e.target.value) / 1000); }} /><output>{Math.round(phase * 100)}%</output></label>
          </div>
        </section>
        <aside className="panel settings-panel">
          <div className="panel-title"><span className="section-number">02</span><h2>Fourier controls</h2></div>
          <p className="panel-subtitle">Fine-tune the reconstruction.</p>
          <div className="setting-head"><label htmlFor="harmonics">Non-DC harmonics</label><output>{harmonics}</output></div>
          <input id="harmonics" type="range" min="1" max="96" step="1" value={harmonics} onChange={e => setHarmonics(Number(e.target.value))} />
          <div className="range-labels"><span>1 · Minimal</span><span>96 · Detailed</span></div>
          <div className="setting-head"><label htmlFor="speed">Animation speed</label><output>{speed.toFixed(1)}×</output></div>
          <input id="speed" type="range" min="0.2" max="3" step="0.2" value={speed} onChange={e => setSpeed(Number(e.target.value))} />
          <div className="range-labels"><span>0.2×</span><span>3×</span></div>
          <div className="panel-rule" />
          <h3>VISIBILITY</h3>
          <label className="switch-row"><span>Epicycle circles</span><input type="checkbox" checked={circles} onChange={e => setCircles(e.target.checked)} /></label>
          <label className="switch-row"><span>Reconstructed trail</span><input type="checkbox" checked={trace} onChange={e => setTrace(e.target.checked)} /></label>
          <label className="switch-row"><span>Original path guide</span><input type="checkbox" checked={original} onChange={e => setOriginal(e.target.checked)} /></label>
          <div className="metric-card"><span>DISCRETE RECONSTRUCTION ERROR</span><strong>{rmse.toFixed(5)}</strong><small>RMSE · normalized coordinate units</small></div>
          <p className="setting-note">DC (frequency 0) is always included. Remaining coefficients are added in low-frequency order.</p>
        </aside>
      </main>
      <div className="bottom-status"><span className="status-dot" /> {feedback}</div>
      <footer><span>FOURIER SKETCH STUDIO · ORIGINAL EDUCATIONAL PROJECT</span><span>Phase 1 / Prototype · Raster import & exports planned later</span></footer>
    </div>
  );
}
