# Circle Sketch Lab — phased development

Every phase is implemented in a feature branch and reviewed in a Pull Request. The owner approves merging to main.

| Phase | Main deliverable | Acceptance criteria |
| --- | --- | --- |
| 0 | Product, architecture, numerical and QA specification | Documentation ready |
| 1 | Responsive React studio, circle/square/flower, freehand drawing, signed DFT, epicycles, playback controls | Interactive prototype; numerical tests and build pass |
| 2 | FFT and Web Worker plus sampling refinements | Numerically equivalent to reference DFT, UI stays responsive |
| 3 | SVG and raster import, thresholding, edge and contour processing | Real user images can be converted to usable paths safely |
| 4 | XY versus complex modes, spectrum, phase, RMSE comparisons, auto-accuracy | Quantitative plots/tests agree with source path |
| 5 | PNG, SVG, JSON, CSV, browser video, project save/load | Valid reopenable outputs and MIME support handling |
| 6 | Guided Fourier learning, responsive and accessibility polish | Mobile/touch/browser behavior verified |
| 7 | GitHub Pages public release and technical audit | Live URL loads and controls work |

## Not yet in Phase 1
Raster-photo tracing, vector import/export, professional video output, accounts, remote collaboration, or exact visual parity with the reference.

## Known engineering risks
Multi-contour sequencing and pen-up events, accurate frequency sign and phase normalization, FFT worker cancellation, mobile Canvas performance, browser-specific recording, user-provided SVG security, resource licensing.

## Definition of done
Each PR includes unit checks, relevant UI validation, change description and known limitations. Main remains stable and deployable.
