import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BrainScene } from './BrainScene'
import { BRAIN_REGIONS } from '../data/brainRegions'

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

vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual('@react-three/fiber')
  return {
    ...actual,
    Canvas: ({ children }: { children?: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
    useFrame: () => {},
  }
})

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Environment: () => <div data-testid="environment" />,
  Html: ({ children }: { children?: React.ReactNode }) => <div data-testid="html">{children}</div>,
  Text: ({ children }: { children?: React.ReactNode }) => <div data-testid="text">{children}</div>,
}))

vi.mock('@react-three/rapier', () => ({
  Physics: ({ children }: { children?: React.ReactNode }) => <div data-testid="physics">{children}</div>,
  RigidBody: ({ children }: { children?: React.ReactNode }) => <div data-testid="rigid-body">{children}</div>,
}))

describe('BrainScene integration (tooltip content)', () => {
  it('renders tooltip info for selected region via activity data', () => {
    const region = BRAIN_REGIONS[0]
    const activity = {
      timestamp: Date.now(),
      globalActivation: 0.42,
      brainWaves: { delta: 0.1, theta: 0.2, alpha: 0.3, beta: 0.4, gamma: 0.5 },
      connections: [],
      regions: {
        [region.id]: { activation: 0.77, connectivity: 0.5, temperature: 37.1, bloodFlow: 0.66 },
      },
    }
    render(
      <div style={{ height: 200 }}>
        <BrainScene activity={activity} selectedRegion={region.id} />
      </div>
    )
    expect(screen.getByText(new RegExp(region.name, 'i'))).toBeInTheDocument()
    expect(screen.getByText(/Activation:/i)).toBeInTheDocument()
  })
})

