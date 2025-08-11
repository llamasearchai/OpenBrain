import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BrainScene } from './BrainScene'

describe('BrainScene', () => {
  it('renders without crashing', () => {
    const { container } = render(<div style={{ height: 200 }}><BrainScene /></div>)
    expect(container).toBeTruthy()
  })
})


