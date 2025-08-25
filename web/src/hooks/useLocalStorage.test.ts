import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage', () => {
  it('reads and writes values in localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('ob.test', 'foo'))
    expect(result.current[0]).toBe('foo')
    act(() => {
      result.current[1]('bar')
    })
    const raw = localStorage.getItem('ob.test')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toBe('bar')
  })
})

