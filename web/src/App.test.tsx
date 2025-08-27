import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import App from './App'

class MockWS {
  url: string
  onmessage: ((ev: MessageEvent<string>) => unknown) | null = null
  onopen: (() => unknown) | null = null
  onclose: (() => unknown) | null = null
  static last: MockWS | null = null
  constructor(url: string) {
    this.url = url
    MockWS.last = this
    const _timer = setTimeout(() => {
      if (this.onopen) this.onopen()
    }, 0)
    clearTimeout(_timer)
  }
  send() {}
  close() {
    if (this.onclose) this.onclose()
  }
}

// Stub WebSocket on globalThis
const g = globalThis as unknown as { WebSocket?: unknown }
g.WebSocket = MockWS as unknown

// Ensure Three GLTF loader is not invoked to fetch assets during test
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({ GLTFLoader: class {} }))

// r3f useLoader will try to use GLTFLoader; stub to return a minimal scene-like object
vi.mock('@react-three/fiber', async (orig) => {
  const mod = (await orig()) as unknown as Record<string, unknown>
  return {
    ...mod,
    useLoader: () => ({ scene: {} }),
  }
})

describe('App', () => {
  it('renders and shows initial waiting state', () => {
    render(<App />)
    const el = screen.getByText(/Waiting for data/i)
    expect(el).toBeTruthy()
  })

  it('updates UI when a WebSocket message arrives', async () => {
    render(<App />)
    // Simulate a server-sent payload
  const payload = { metrics: { activation_mean: 0.42 } }
    // Deliver the message
    await waitFor(() => expect(MockWS.last).toBeTruthy())
    await act(async () => {
      MockWS.last!.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent)
    })
    // Assert the JSON render includes the metric key
    await waitFor(() => expect(screen.getByText(/activation_mean/)).toBeTruthy())
  })
})
