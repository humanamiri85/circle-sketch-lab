# Product requirements

Create an independent, accessible educational art tool for 2D Fourier epicycle approximation.

Phase 1: sample examples (circle/square/flower), freehand pointer stroke, direct DFT and inverse, animation play/pause/seek/speed, harmonic slider and visibility toggles, numerical RMSE. Keep all computation local.

Phase 2: FFT + Web Workers with deterministic equivalence against reference direct DFT.

Phase 3: raster and SVG input, preprocessing, contour extraction, safe parsing, path editor, separated multistroke traces.

Phase 4: Fourier spectrum (magnitude/phase), XY/complex modes, frequency budget and RMSE analysis.

Phase 5: reusable PNG/SVG/CSV/JSON and browser-supported video.

Phase 6: guided lessons, cross-browser/mobile accessibility and performance.

Phase 7: verified Pages release.

Acceptance for Phase 1: Functional circle/square/flower and freehand input; epicycles correspond to computed coefficients; drawing controls are responsive and truthful; numerical tests pass. No non-functional export/upload controls.
