import { describe, it, expect, beforeEach } from 'vitest'
import { ensurePrefsMigrated, PREF_VERSION } from './prefs'

describe('prefs migration', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  it('sets version when missing', () => {
    ensurePrefsMigrated()
    expect(parseInt(localStorage.getItem('ob.pref.version') || '0')).toBe(PREF_VERSION)
  })
  it('does not downgrade version', () => {
    localStorage.setItem('ob.pref.version', String(PREF_VERSION + 1))
    ensurePrefsMigrated()
    expect(parseInt(localStorage.getItem('ob.pref.version') || '0')).toBe(PREF_VERSION + 1)
  })
})

