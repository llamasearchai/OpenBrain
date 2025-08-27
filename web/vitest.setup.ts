import '@testing-library/jest-dom'

// Polyfill ResizeObserver for jsdom
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO as unknown

// Stub canvas context to avoid WebGL access in tests
// @ts-expect-error jsdom env: canvas not available
HTMLCanvasElement.prototype.getContext = () => ({}) as unknown

// Optional: matchMedia stub to satisfy libraries querying media
window.matchMedia = window.matchMedia || (function () {
  return {
    matches: false,
    // Legacy
    addListener() {},
    removeListener() {},
    // Modern
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false },
  } as unknown as typeof window.matchMedia
})()


