import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Legend } from './Legend'
import { BRAIN_REGIONS } from '../data/brainRegions'

describe('Legend', () => {
  it('renders region items with colors and abbreviations', () => {
    render(<Legend />)
    // Spot check a couple of regions
    expect(screen.getByText(BRAIN_REGIONS[0].name)).toBeInTheDocument()
    expect(screen.getByText(BRAIN_REGIONS[0].abbreviation)).toBeInTheDocument()
  })

  it('calls onSelect when a region is clicked', () => {
    const onSelect = vi.fn()
    render(<Legend onSelect={onSelect} />)
    const item = screen.getByText(BRAIN_REGIONS[0].name)
    fireEvent.click(item)
    expect(onSelect).toHaveBeenCalledWith(BRAIN_REGIONS[0].id)
  })
})

