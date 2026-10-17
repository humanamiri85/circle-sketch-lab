# Fourier Sketch Studio — Circle Sketch Lab

An original, browser-first Fourier epicycle visualizer. Draw your own paths or explore mathematical examples, see rotating harmonics and measure numerical reconstruction error.

## Current status: Phase 1 (prototype)
- Working example inputs: circle, square, flower
- Freehand pointer drawing, with explicit open/closed path setting
- Arc-length resampling, 256 complex samples
- Reference direct DFT with 1/N scaling and signed frequencies
- Epicycle Canvas rendering with play/pause/seek, speed, harmonics, visibility toggles
- Discrete Cartesian RMSE and unit test suite
- Vite + React + TypeScript, GitHub Actions build/test and Pages deployment config

Not implemented yet: raster/photo vectorization, SVG input/output, browser video recording, FFT/Web Workers, advanced spectrum/error lab, lessons.

## Run locally
Requires Node.js 22.

1. npm install
2. npm run dev
3. npm run typecheck
4. npm test
5. npm run build

The generated package-lock.json should be committed before switching CI to npm ci. CI is currently using npm install. Local npm installation was blocked in the preparation environment; GitHub Actions should establish build/test results.

## Deploy
After the Phase 1 PR is reviewed and merged, enable **Settings → Pages → Build and deployment → Source: GitHub Actions**. The Vite public base is /circle-sketch-lab/. The target URL is https://humanamiri85.github.io/circle-sketch-lab/.

## Documentation
See docs/ARCHITECTURE.md, docs/PRODUCT_SPEC.md, docs/ROADMAP.md, docs/TEST_STRATEGY.md, docs/UX_BLUEPRINT.md, docs/CODEX_KICKOFF_PROMPT.md and docs/REFERENCE_AUDIT.md.

## Independence and privacy
All drawing/computation is local to the browser. No images are uploaded. The project reimplements mathematical behavior independently; it does not copy proprietary code, brand or assets from a reference site.

License is not selected yet.
