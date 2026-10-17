# Code map

- index.html / src/main.tsx: HTML entry and React mount
- src/App.tsx: interface, tool state, pointer drawing and animation clock
- src/styles/app.css: responsive workbench
- src/features/paths/path.ts: example strokes, segment interpolation and periodic samples
- src/features/fourier/dft.ts: direct DFT, frequency selection, reconstruction, epicycle geometry and RMSE
- src/features/animation/draw.ts: Canvas rendering and coordinates
- tests/: numerical unit fixtures
- .github/workflows/ci.yml: branch/PR validation
- .github/workflows/deploy.yml: Pages deployment after merge to main
- docs/: architecture, product, UX, tests, roadmap and development contracts

Future directories should be introduced only when functionality is implemented.
