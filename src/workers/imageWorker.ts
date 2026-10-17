/// <reference lib="webworker" />
import { traceContours } from '../features/import/contours';
import { binaryToRgba, preprocessImage } from '../features/preprocess/imageProcessing';
import type { PreprocessOptions } from '../features/preprocess/imageProcessing';

type Request = { id: number; rgba: ArrayBuffer; width: number; height: number; options: PreprocessOptions };

self.onmessage = (event: MessageEvent<Request>) => {
  const { id, rgba, width, height, options } = event.data;
  try {
    const result = preprocessImage(new Uint8ClampedArray(rgba), width, height, options);
    const strokes = traceContours(binaryToRgba(result.binary), width, height, {
      threshold: 128,
      invert: false,
      minPerimeter: options.minPerimeter,
      maxPaths: options.maxPaths,
      simplify: 0.75,
    });
    self.postMessage({
      id, width, height, strokes, thresholdUsed: result.thresholdUsed,
      grayscale: result.grayscale.buffer, binary: result.binary.buffer,
    }, [result.grayscale.buffer, result.binary.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Image preprocessing failed.' });
  }
};
