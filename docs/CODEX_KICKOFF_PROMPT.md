# Phase 1 specification for Codex or human reviewer

Repository: humanamiri85/circle-sketch-lab
Working branch: feat/phase-01-vertical-slice
Base: main

Review the existing Phase 1 implementation (not just the documentation). Verify:

1. npm install, npm run typecheck, npm test, npm run build.
2. Signed direct DFT with 1/N normalization and 256 arc-length samples; DC coefficient always included, slider counts non-DC harmonics.
3. Inverse geometry for ±1 unit circle, shifted circle and multi-frequency series.
4. Preset examples and custom freehand drawing, with explicit open/closed stroke behavior (do not ink the pen-up return portion).
5. Mobile and desktop Canvas rendering, pixel ratio and pointer coordinates.
6. Play/pause, seek, speed, circles/source/trace toggles and numerical RMSE.
7. No unimplemented controls disguised as functional features.
8. Workflow builds and tests; make fixes only in feature branch, do not merge without owner approval.

Scope excludes image tracing, video, FFT workers and advanced classroom exercises.

In PR notes, distinguish tests actually run from tests merely proposed.
