# Fourier Sketch Studio — Circle Sketch Lab

An original, browser-first Fourier epicycle visualizer. Draw your own paths or explore mathematical examples, see rotating harmonics and measure numerical reconstruction error.

## Current status: Phase 2 (image contour beta)
- Working example inputs: circle, square, flower
- Freehand pointer drawing, with explicit open/closed path setting
- Arc-length resampling, 256 complex samples
- Reference direct DFT with 1/N scaling and signed frequencies
- Epicycle Canvas rendering with play/pause/seek, speed, harmonics, visibility toggles
- Discrete Cartesian RMSE and unit test suite
- Vite + React + TypeScript, GitHub Actions build/test and Pages deployment config

Not implemented yet: raster/photo vectorization, SVG input/output, browser video recording, FFT/Web Workers, advanced spectrum/error lab, lessons.


## Phase 2.1: smart image preprocessing
- Upload PNG/JPG/WebP and locally preprocess without uploading images to a server.
- Auto (Otsu for silhouette, edge-percentile for outline) or manual threshold; adjustable box blur and minimum contour length.
- Select **Silhouette** for filled dark shapes or **Outline** for image boundaries (Sobel magnitude, not Canny or background removal).
- Four previews: original, grayscale, black-and-white mask and contour paths; changes re-trace the Fourier paths in a Web Worker.
- Limitations: noisy photos can still produce doubled or fragmented edges; masking is not semantic segmentation. Outline mode deliberately disables polarity inversion. The previews show downsampled raster processing, not full-resolution images.

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


## Phase 2 additions (in review)
- Upload PNG/JPEG/WebP files (up to 10 MB); local browser decode and resize to 224 pixels on the longest side.
- Threshold/invert controls and 1–12 separately extracted polygon contours; data never leaves your browser.
- Worker-based contour detection and signed complex radix-2 FFT in place of reference DFT.
- Independent path-by-path pen-up animation; every path has its own coefficients, with no invented bridging lines.
- Photo processing **traces high-contrast region boundaries**, not every internal feature of a complex photograph. No image/SVG/video download yet.
- More numerical and synthetic contour tests.

**Important:** The initial Phase 1 statements about raster import being unimplemented in the older README section are superseded by the Phase 2 additions above, once this PR merges.
