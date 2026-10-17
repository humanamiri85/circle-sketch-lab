# Test strategy

Numerical fixtures:
- DC constant vector
- Positive and negative signed unit-circle frequency
- Shifted/scaled complex circle
- Two-harmonic combination
- Full discrete inverse transform
- Deterministic low-frequency selection with DC
- Closure policy and open reverse extension
- Invalid sampling budget

CI on main, feature branches and pull requests: npm install, typecheck, unit tests, production build.

Manual acceptance remains required for pointer drawing, responsive mobile viewport and browser playback. The PR should not claim browser E2E checks until executed. Future: Playwright interaction, screenshot review, constrained-CPU testing and safe SVG import tests.
