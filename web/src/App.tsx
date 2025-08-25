import './App.css'
import './index.css'
import { BrainScene } from './components/BrainScene'
import { useEffect, useRef, useState } from 'react'
import { NeuralActivitySimulator } from './services/neuralSimulation'
import type { NeuralActivity } from './services/neuralSimulation'
import { BRAIN_REGIONS } from './data/brainRegions'
import type { VisualizationMode } from './services/visualizationModes'
import { Legend } from './components/Legend'
import { useLocalStorage } from './hooks/useLocalStorage'
import React from 'react'
import { ensurePrefsMigrated } from './services/prefs'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }>{
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err: any) { console.error('App error boundary caught:', err) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20 }}>
          <h2>Something went wrong.</h2>
          <button onClick={() => location.reload()}>Reload</button>
        </div>
      )
    }
    return this.props.children
  }
}

// Create a simulator instance for the app
const neuralSimulator = new NeuralActivitySimulator();

function App() {
  const [activity, setActivity] = useState<NeuralActivity | null>(null)
  const [selectedRegion, setSelectedRegion] = useLocalStorage<string | null>('ob.selectedRegion', null)
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<number | null>(null)
  const [visualizationMode, setVisualizationMode] = useLocalStorage<VisualizationMode>('ob.vizMode', 'structural')
  const [activePanel, setActivePanel] = useLocalStorage<'metrics' | 'legend'>('ob.activePanel', 'metrics')
  const [wsLive, setWsLive] = useState(false)
  const backoffRef = useRef<number>(1000)
  const reconnectTimer = useRef<number | null>(null)
  const [fps, setFps] = useState<number | null>(null)
  const [showFps, setShowFps] = useState(false)
  type BrainWsMetrics = { activation_mean: number; activation_std: number; regions: Record<string, number> }
  type BrainWsPayload = { ts: number; metrics: BrainWsMetrics }
  const [wsData, setWsData] = useState<BrainWsPayload | null>(null)

  useEffect(() => {
    ensurePrefsMigrated()
    // Start the neural simulator
    neuralSimulator.start(1.0)
    
    // Set up activity polling
    intervalRef.current = setInterval(() => {
      const latestActivity = neuralSimulator.getLatestActivity()
      if (latestActivity) {
        setActivity(latestActivity)
      }
    }, 250)
    
    // Set up WebSocket connection (fallback to simulator if not available)
    const envAny = import.meta as unknown as { env?: Record<string, string> }
    const wsUrl = (envAny.env?.VITE_WS_URL as string | undefined) || 'ws://127.0.0.1:8000/ws/brain'
    
    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws
        ws.onopen = () => { setWsLive(true); backoffRef.current = 1000 }
        ws.onclose = () => {
          setWsLive(false)
          if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
          const delay = Math.min(30000, backoffRef.current * 2)
          backoffRef.current = delay
          reconnectTimer.current = window.setTimeout(connect, delay)
        }
        ws.onmessage = (evt: MessageEvent<string>) => {
          try {
            const data = JSON.parse(evt.data) as BrainWsPayload
            setWsData(data)
          } catch (e) {
            console.error('Error parsing WebSocket message:', e)
          }
        }
        ws.onerror = (error) => {
          console.warn('WebSocket error:', error)
        }
      } catch (e) {
        console.warn('Could not connect to WebSocket, using simulation only:', e)
      }
    }
    connect()

    return () => {
      neuralSimulator.stop()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (wsRef.current) { wsRef.current.close() }
      if (reconnectTimer.current) { clearTimeout(reconnectTimer.current) }
    }
  }, [])

  // Simple FPS tracker (dev only)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    let last = performance.now()
    let frames = 0
    let acc = 0
    let raf = 0
    const loop = (t: number) => {
      const dt = t - last
      last = t
      frames += 1
      acc += dt
      if (acc >= 1000) {
        setFps(frames)
        frames = 0
        acc = 0
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const onKey = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'f') setShowFps((s) => !s) }
    window.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey) }
  }, [])

  const handleRegionSelect = (regionId: string) => {
    setSelectedRegion(regionId === selectedRegion ? null : regionId)
  }

  const selectedRegionData = selectedRegion
    ? BRAIN_REGIONS.find(r => r.id === selectedRegion)
    : null

  return (
    <div className="ob-app">
      <div className="ob-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 600 }}>OpenBrain Digital Twin</div>
          <div className="ob-badge">Alpha</div>
        </div>
        <div>
          <select
            value={visualizationMode}
            onChange={(e) => setVisualizationMode(e.target.value as VisualizationMode)}
            aria-label="Visualization mode"
          >
            <option value="structural">Structural MRI</option>
            <option value="fmri">Functional MRI</option>
            <option value="dti">DTI Tractography</option>
            <option value="eeg">EEG Activity</option>
            <option value="connectivity">Connectivity Map</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="ob-muted">Neural Simulation: {activity ? 'Active' : 'Initializing...'}</div>
          <div role="tablist" aria-label="Side panel" style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--ob-card-border)', padding: 4, borderRadius: 10 }}>
            <button role="tab" aria-selected={activePanel==='metrics'} onClick={() => setActivePanel('metrics')} style={{ background: activePanel==='metrics' ? 'rgba(255,255,255,0.08)' : 'transparent' }}>Metrics</button>
            <button role="tab" aria-selected={activePanel==='legend'} onClick={() => setActivePanel('legend')} style={{ background: activePanel==='legend' ? 'rgba(255,255,255,0.08)' : 'transparent' }}>Legend</button>
          </div>
          <div className="ob-badge" aria-label={`WebSocket status ${wsLive ? 'Live' : 'Sim'}`} style={{ background: wsLive ? 'rgba(0,200,120,0.25)' : 'rgba(255,255,255,0.08)' }}>
            WS: {wsLive ? 'Live' : 'Sim'}
          </div>
        </div>
      </div>

      <div className="ob-content">
        <div style={{ flex: 1 }}>
          <ErrorBoundary>
            <BrainScene
              activity={activity}
              onRegionClick={handleRegionSelect}
              selectedRegion={selectedRegion}
              visualizationMode={visualizationMode}
              onStimulateRegion={(id) => neuralSimulator.stimulateRegion(id, 0.2)}
            />
          </ErrorBoundary>
          {import.meta.env.DEV && showFps && (
            <div style={{ position: 'absolute', top: 56, right: 10, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)' }}>
              FPS: {fps ?? '-'}
            </div>
          )}
        </div>

        <div className="ob-panel">
          {activePanel === 'metrics' ? (
            <div>
              <h2>Metrics</h2>
              {!wsData ? (
                <div>Waiting for data</div>
              ) : (
                <pre className="ob-card ob-scroll" style={{ padding: 8 }}>
                  {JSON.stringify(wsData, null, 2)}
                </pre>
              )}
              <div style={{ marginBottom: 20 }}>
                <h3>Global Metrics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div className="ob-muted" style={{ fontSize: 12 }}>Activation</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                      {(activity.globalActivation * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="ob-muted" style={{ fontSize: 12 }}>Timestamp</div>
                    <div style={{ fontSize: 14 }}>
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <h3>Brain Waves</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(activity.brainWaves).map(([wave, value]) => (
                    <div key={wave}>
                      <div className="ob-muted" style={{ fontSize: 12, textTransform: 'uppercase' }}>
                        {wave}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                        {(value * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <h3>Region Activity</h3>
                <div className="ob-scroll">
                  {Object.entries(activity.regions).map(([regionId, regionActivity]) => {
                    const region = BRAIN_REGIONS.find(r => r.id === regionId)
                    return region ? (
                      <div
                        key={regionId}
                        onClick={() => handleRegionSelect(regionId)}
                        style={{
                          padding: '8px 0',
                          borderBottom: '1px solid var(--ob-card-border)',
                          cursor: 'pointer',
                          background: selectedRegion === regionId ? 'rgba(255,255,255,0.06)' : 'transparent'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: selectedRegion === regionId ? 'bold' : 'normal' }}>
                              {region.name}
                            </div>
                            <div className="ob-muted" style={{ fontSize: 12 }}>
                              {region.abbreviation}
                            </div>
                          </div>
                          <div style={{
                            fontWeight: 'bold',
                            color: region.color
                          }}>
                            {(regionActivity.activation * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    ) : null
                  })}
                </div>
              </div>
              
              {selectedRegionData && activity && selectedRegion && (
                <div className="ob-card" style={{ padding: 12, marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 10px 0', color: selectedRegionData.color }}>
                    {selectedRegionData.name}
                  </h4>
                  <div className="ob-muted" style={{ fontSize: 12, marginBottom: 10 }}>
                    {selectedRegionData.functions.join(', ')}
                  </div>
                  {activity.regions[selectedRegion] && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Activation:</span>
                        <span>{(activity.regions[selectedRegion].activation * 100).toFixed(1)}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Temperature:</span>
                        <span>{activity.regions[selectedRegion].temperature.toFixed(1)}°C</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Blood Flow:</span>
                        <span>{(activity.regions[selectedRegion].bloodFlow * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div style={{ marginBottom: 20 }}>
                <h3>Connections</h3>
                <div className="ob-scroll">
                  {activity.connections.map((conn, index) => {
                    const source = BRAIN_REGIONS.find(r => r.id === conn.source)
                    const target = BRAIN_REGIONS.find(r => r.id === conn.target)
                    return source && target ? (
                      <div
                        key={index}
                        style={{
                          padding: '6px 0',
                          borderBottom: '1px solid var(--ob-card-border)',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <span style={{ color: source.color }}>{source.abbreviation}</span>
                          <span style={{ margin: '0 5px' }}>→</span>
                          <span style={{ color: target.color }}>{target.abbreviation}</span>
                        </div>
                        <div style={{ fontWeight: 'bold' }}>
                          {(conn.strength * 100).toFixed(0)}%
                        </div>
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2>Legend</h2>
              <Legend selected={selectedRegion || undefined} onSelect={handleRegionSelect} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
