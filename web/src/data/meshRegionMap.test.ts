import { describe, it, expect } from 'vitest'
import { meshNameToRegionId } from './meshRegionMap'

describe('meshNameToRegionId', () => {
  it('maps common names to region ids', () => {
    expect(meshNameToRegionId('frontal_mesh')).toBe('frontal-lobe')
    expect(meshNameToRegionId('Pariet_Group')).toBe('parietal-lobe')
    expect(meshNameToRegionId('Temporal001')).toBe('temporal-lobe')
    expect(meshNameToRegionId('occipitalSurface')).toBe('occipital-lobe')
    expect(meshNameToRegionId('cerebellum_low')).toBe('cerebellum')
    expect(meshNameToRegionId('BrainStem_geo')).toBe('brainstem')
  })
  it('returns null for non-matching names', () => {
    expect(meshNameToRegionId('unknown')).toBeNull()
    expect(meshNameToRegionId('')).toBeNull()
    expect(meshNameToRegionId(undefined as unknown as string)).toBeNull()
  })
})

