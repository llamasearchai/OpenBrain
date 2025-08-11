import '@testing-library/jest-dom'

// Polyfill ResizeObserver for jsdom
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error global available in vitest
global.ResizeObserver = RO as any

// Stub canvas context to avoid WebGL access in tests
// @ts-expect-error jsdom
HTMLCanvasElement.prototype.getContext = () => ({})

// Optional: matchMedia stub to satisfy libraries querying media
// @ts-expect-error jsdom
window.matchMedia = window.matchMedia || function () {
  return { matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false } }
} as any


