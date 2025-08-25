// Heuristic mapping from GLTF mesh/node names to our BrainRegion ids
// Falls back to spatial proximity if no name match.

export const MESH_REGION_PATTERNS: Array<{ pattern: RegExp; regionId: string }> = [
  { pattern: /frontal|front\b/i, regionId: 'frontal-lobe' },
  { pattern: /pariet/i, regionId: 'parietal-lobe' },
  { pattern: /temporal|tempo/i, regionId: 'temporal-lobe' },
  { pattern: /occip/i, regionId: 'occipital-lobe' },
  { pattern: /cerebell/i, regionId: 'cerebellum' },
  { pattern: /brain\s*stem|brainstem|stem\b/i, regionId: 'brainstem' },
]

export function meshNameToRegionId(name: string | undefined | null): string | null {
  if (!name) return null
  for (const { pattern, regionId } of MESH_REGION_PATTERNS) {
    if (pattern.test(name)) return regionId
  }
  return null
}

