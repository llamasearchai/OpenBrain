import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BrainScene } from './BrainScene'

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

describe('Overlay persistence and search interactions', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists auto-rotate, speed, labels, and focus duration', () => {
    render(<div style={{ height: 200 }}><BrainScene /></div>)

    const auto = screen.getByLabelText('Auto rotate') as HTMLInputElement
    const labels = screen.getByLabelText('Toggle labels') as HTMLInputElement
    const speed = screen.getByLabelText('Rotate speed') as HTMLInputElement
    const focus = screen.getByLabelText('Camera focus duration') as HTMLInputElement

    // Toggle and set values
    fireEvent.click(auto) // false
    fireEvent.click(labels) // false
    fireEvent.change(speed, { target: { value: '-0.5' } })
    fireEvent.change(focus, { target: { value: '2' } })

    expect(localStorage.getItem('ob.autoRotate')).toContain('false')
    expect(localStorage.getItem('ob.showLabels')).toContain('false')
    expect(localStorage.getItem('ob.autoRotateSpeed')).toContain('-0.5')
    expect(localStorage.getItem('ob.focusDuration')).toContain('2')
  })

  it('search supports keyboard selection (ArrowDown + Enter)', () => {
    const onClick = vi.fn()
    render(<div style={{ height: 200 }}><BrainScene onRegionClick={onClick} /></div>)

    const search = screen.getByLabelText('Search brain region') as HTMLInputElement
    fireEvent.change(search, { target: { value: 'fron' } })
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    fireEvent.keyDown(search, { key: 'Enter' })

    expect(onClick).toHaveBeenCalled()
  })
})

