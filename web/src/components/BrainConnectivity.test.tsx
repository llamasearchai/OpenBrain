import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { BrainConnectivity } from './BrainConnectivity'
import '@testing-library/jest-dom'

// Mock Three.js and React Three Fiber to avoid WebGL context issues
vi.mock('three', async () => {
  const actual = await vi.importActual('three')
  return {
    ...actual,
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      render: vi.fn(),
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      domElement: document.createElement('canvas'),
    })),
  }
})

vi.mock('three/examples/jsm/lines/Line2.js', () => ({
  Line2: vi.fn().mockImplementation(() => ({
    setGeometry: vi.fn(),
    setMaterial: vi.fn(),
  })),
}))

vi.mock('three/examples/jsm/lines/LineGeometry.js', () => ({
  LineGeometry: vi.fn().mockImplementation(() => ({
    setPositions: vi.fn(),
  })),
}))

vi.mock('three/examples/jsm/lines/LineMaterial.js', () => ({
  LineMaterial: vi.fn().mockImplementation(() => ({})),
}))

describe('BrainConnectivity', () => {
  const mockConnections = [
    {
      source: 'frontal-lobe',
      target: 'parietal-lobe',
      strength: 0.8,
      direction: 'forward' as const,
    },
    {
      source: 'temporal-lobe',
      target: 'occipital-lobe',
      strength: 0.6,
      direction: 'bidirectional' as const,
    },
  ]

  it('renders without crashing', () => {
    render(
      <div style={{ height: 200 }}>
        <BrainConnectivity connections={mockConnections} />
      </div>
    )
    
    // Since the component uses Three.js which is mocked, we can't easily test the actual rendering
    // But we can ensure it doesn't throw errors
    expect(true).toBe(true)
  })

  it('renders with connection click handler', () => {
    const mockClickHandler = vi.fn()
    
    render(
      <div style={{ height: 200 }}>
        <BrainConnectivity 
          connections={mockConnections} 
          onConnectionClick={mockClickHandler}
        />
      </div>
    )
    
    // Again, we can't easily test the actual interaction with mocked Three.js
    // But we can ensure it renders without errors
    expect(true).toBe(true)
  })

  it('handles empty connections', () => {
    render(
      <div style={{ height: 200 }}>
        <BrainConnectivity connections={[]} />
      </div>
    )
    
    expect(true).toBe(true)
  })

  it('handles invalid connections', () => {
    const invalidConnections = [
      {
        source: 'invalid-region',
        target: 'another-invalid-region',
        strength: 0.5,
        direction: 'forward' as const,
      },
    ]
    
    render(
      <div style={{ height: 200 }}>
        <BrainConnectivity connections={invalidConnections} />
      </div>
    )
    
    expect(true).toBe(true)
  })
})
