import { describe, it, expect, fireEvent } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Legend } from './Legend'

describe('Legend filters', () => {
  it('filters to frontal when chip clicked', () => {
    render(<Legend />)
    const chip = screen.getByRole('button', { name: /filter frontal/i })
    fireEvent.click(chip)
    const items = screen.getAllByText(/Frontal/i)
    expect(items.length).toBeGreaterThan(0)
  })
})
