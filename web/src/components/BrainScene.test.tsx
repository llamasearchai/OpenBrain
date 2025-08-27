import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BrainScene } from './BrainScene'
import { NeuralActivitySimulator } from '../services/neuralSimulation'

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

vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual('@react-three/fiber')
  return {
    ...actual,
    Canvas: ({ children }: { children?: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
    // Ensure GLTF loading does not require WebGL by stubbing useLoader
    useLoader: () => ({ scene: {} }),
    // Stub useFrame to no-op so hooks don't require a real Canvas context
    useFrame: () => {},
  }
})

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Environment: () => <div data-testid="environment" />,
  Html: ({ children }: { children?: React.ReactNode }) => <div data-testid="html">{children}</div>,
  useProgress: () => ({ progress: 50 }),
  Text: () => <div data-testid="text" />,
}))

vi.mock('@react-three/rapier', () => ({
  Physics: ({ children }: { children?: React.ReactNode }) => <div data-testid="physics">{children}</div>,
  RigidBody: ({ children }: { children?: React.ReactNode }) => <div data-testid="rigid-body">{children}</div>,
}))

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {},
}))


// Mock the brain connectivity component
vi.mock('./BrainConnectivity', () => ({
  BrainConnectivity: () => <div data-testid="brain-connectivity" />,
}))

describe('BrainScene', () => {
  beforeEach(() => {
    // Mock WebGL context
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Array(100) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Array(100) })),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      circle: vi.fn(),
      arc: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(
      <div style={{ height: 200 }}>
        <BrainScene />
      </div>
    )
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
  })

  it('renders with neural activity data', () => {
    // Create mock activity data
    const simulator = new NeuralActivitySimulator()
    simulator.start(1.0)
    const activity = simulator.generateActivity()
    
    render(
      <div style={{ height: 200 }}>
        <BrainScene activity={activity} />
      </div>
    )
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
    const connectivityEls = screen.getAllByTestId('brain-connectivity')
    expect(connectivityEls.length).toBeGreaterThan(0)
  })

  it('renders with selected region', () => {
    render(
      <div style={{ height: 200 }}>
        <BrainScene selectedRegion="frontal-lobe" />
      </div>
    )
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
  })

  it('renders with different visualization modes', () => {
    render(
      <div style={{ height: 200 }}>
        <BrainScene visualizationMode="fmri" />
      </div>
    )
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
  })

  it('handles region click events', () => {
    const mockOnRegionClick = vi.fn()
    
    render(
      <div style={{ height: 200 }}>
        <BrainScene onRegionClick={mockOnRegionClick} />
      </div>
    )
    
    // The actual click handling is in the BrainModel component which is mocked
    // This test just ensures the component renders with the prop
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
  })
})
