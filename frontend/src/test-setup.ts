/// <reference types="vitest/globals" />
import '@testing-library/jest-dom'

// Mock HTMLCanvasElement.getContext (jsdom ne supporte pas canvas)
const noop = () => {}
// @ts-expect-error jsdom mock — types partiels intentionnels
HTMLCanvasElement.prototype.getContext = () => ({
  clearRect: noop, fillRect: noop, strokeRect: noop,
  beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
  arc: noop, arcTo: noop, bezierCurveTo: noop, quadraticCurveTo: noop,
  stroke: noop, fill: noop, clip: noop,
  fillText: noop, strokeText: noop,
  save: noop, restore: noop,
  translate: noop, scale: noop, rotate: noop, transform: noop, setTransform: noop,
  setLineDash: noop, getLineDash: () => [],
  createLinearGradient: () => ({ addColorStop: noop }),
  createRadialGradient: () => ({ addColorStop: noop }),
  measureText: () => ({ width: 0 }),
  getImageData: () => ({ data: new Uint8ClampedArray() }),
  putImageData: noop, createImageData: () => ({}),
  drawImage: noop,
  canvas: document.createElement('canvas'),
} as unknown as CanvasRenderingContext2D)
