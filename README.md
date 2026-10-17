# Fourier Sketch Studio — Circle Sketch Lab

An original browser-first Fourier epicycle studio. Draw paths or import raster images, inspect extracted contours, and watch signed FFT harmonics reconstruct each shape. All raster processing is local to the user's browser.

**Status:** Phase 4 advanced image-processing proposal in `feat/phase-04-advanced-image-processing`. This branch must be reviewed and merged before it appears on the published site.

## Running locally

Requires Node.js 22.

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

## Available in main (Phases 1–2.1)
- Circle, square, flower, and freehand drawing, with open/closed stroke semantics.
- PNG/JPG/WebP upload (up to 10MB); local downsampling to 224 pixels longest side.
- Worker-based contour extraction; separately animated paths.
- Signed radix-2 FFT, epicycle animation and progress/speed/harmonic controls.
- Grayscale, box blur, automatic Otsu threshold, manual threshold, inversion, basic Sobel edge option.
- Four preview stages: original, grayscale, black/white, extracted Fourier contours.

## Proposed in Phase 4 (this PR)
- One-click **Logo**, **Sketch** and **Photo** preprocessing presets.
- Contrast enhancement (percentile stretch blended with original).
- **Adaptive local threshold** for uneven illumination.
- **Canny-style edge extraction** (Sobel gradient, nonmaximum suppression, dual-threshold hysteresis; the smoothing kernel is a box filter).
- Connected-component removal for tiny specks.
- Processing-method, contrast and cleanup controls in the existing live preview.
- All controls recompute with a worker; no server/API is required.

### Processing tips
- **Logo** → silhouette/global threshold with mild contrast.
- **Sketch** → Canny-style outline for sharp line art.
- **Photo** → outline with stronger contrast and denoising; manual threshold may help under difficult lighting.
- Use the four preview stages to check which boundaries actually reach the FFT input.

**Known limitations:** This is not AI subject segmentation or portrait tracing. Canny edges are converted to polygon boundaries by the existing contour tracer; a narrow edge can generate two nearby paths. Complex photos can create numerous disconnected or noisy contours, and small features may disappear when the input is downsampled to 224 px. Precision centerline vectorization, contour selection/editing, high-resolution extraction, and full photo cleanup belong to future phases.

## Deployment
Vite base is `/circle-sketch-lab/`. After PR review and merge, the GitHub Pages workflow deploys from `main` when Pages source is set to **GitHub Actions**.

GitHub Pages: https://humanamiri85.github.io/circle-sketch-lab/

## Privacy and rights
Image processing is local, without data uploads. The mathematical implementation and UI are independent; no proprietary reference code or artwork is copied. Choose a project license before public reuse of source is invited.
