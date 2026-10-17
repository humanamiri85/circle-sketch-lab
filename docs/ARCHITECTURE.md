# Mathematical and software architecture

## Scope
Phase 1 is a browser-only React / TypeScript / Vite studio with Canvas 2D renderer, independent pure Fourier and path modules and Vitest unit tests. Production build is configured with Vite base /circle-sketch-lab/ for GitHub Pages.

## Fourier contract
Let z_j = x_j + i y_j for j=0,...,M-1. Coefficients are C_k = (1/M) sum_j z_j exp(-i 2π k j/M). Reconstruction uses sum_k C_k exp(i 2π k t). The frequency index for k > floor(M/2) is signed k-M. DC k=0 is always present and the slider counts additional non-DC components. Select by ascending |frequency|, positive before negative at equal magnitude.

## Open strokes
Source strokes retain {points, closed}. Closed shapes sample the cyclic path; open shapes follow a forward-then-back periodic extension. The second half is pen-up for the displayed reconstruction trace, to avoid drawing artificial connector lines. The epicycle tip still travels backwards.

## Visualization
Canvas CSS sizing, device pixel ratio mapping, single coordinate transform, grid, ghost original, reconstructed trace, circles and vectors. Pointer coordinates map back to the same normalized coordinate system. Raster upload and SVG parsing are explicitly deferred.

## Future phases
FFT, Web Workers, typed image preprocessing, path segmentation, spectrum/phase view, error analysis, exports, educational lab and persistence.

## Security
Do not add untrusted SVG innerHTML, remote image uploads or unauthorized reference-site assets. Handle import size, mime, script and network-resource sanitization in the later import phases.
