import React, { useMemo, useState } from 'react'
import { BRAIN_REGIONS } from '../data/brainRegions'

interface LegendProps {
  selected?: string | null
  onSelect?: (id: string) => void
}

export function Legend({ selected, onSelect }: LegendProps) {
  const [filter, setFilter] = useState<string>('all')
  const chips = ['all','frontal-lobe','parietal-lobe','temporal-lobe','occipital-lobe','cerebellum','brainstem']
  const filtered = useMemo(() => (filter === 'all' ? BRAIN_REGIONS : BRAIN_REGIONS.filter(r => r.id === filter)), [filter])
  return (
    <div>
      <h3>Region Legend</h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {chips.map((c) => (
          <button key={c} onClick={() => setFilter(c)} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid var(--ob-card-border)', background: filter===c ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', color: 'inherit' }} aria-label={`Filter ${c}`}>
            {c.replace('-lobe','')}
          </button>
        ))}
      </div>
      <div className="ob-scroll">
        {filtered.map((r) => (
          <div
            key={r.id}
            onClick={() => onSelect?.(r.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              cursor: 'pointer',
              borderBottom: '1px solid var(--ob-card-border)',
              background: selected === r.id ? 'rgba(255,255,255,0.06)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: r.color,
                  boxShadow: '0 0 8px rgba(0,0,0,0.4)'
                }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div className="ob-muted" style={{ fontSize: 12 }}>{r.abbreviation}</div>
              </div>
            </div>
            <div className="ob-badge">{r.functions[0]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
