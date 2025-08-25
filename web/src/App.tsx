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

// Create a simulator instance for the app
const neuralSimulator = new NeuralActivitySimulator();

function App() {
  const [activity, setActivity] = useState<NeuralActivity | null>(null)
  const [selectedRegion, setSelectedRegion] = useLocalStorage<string | null>('ob.selectedRegion', null)
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<number | null>(null)
  const [visualizationMode, setVisualizationMode] = useLocalStorage<VisualizationMode>('ob.vizMode', 'structural')
  const [activePanel, setActivePanel] = useLocalStorage<'metrics' | 'legend'>('ob.activePanel', 'metrics')
  type BrainWsMetrics = { activation_mean: number; activation_std: number; regions: Record<string, number> }
  type BrainWsPayload = { ts: number; metrics: BrainWsMetrics }
  const [wsData, setWsData] = useState<BrainWsPayload | null>(null)

  useEffect(() => {
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
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      
      ws.onmessage = (evt: MessageEvent<string>) => {
        try {
          // If we receive real data from WebSocket, keep a lightweight debug view
          const data = JSON.parse(evt.data) as BrainWsPayload
          setWsData(data)
          // In a real implementation, convert to NeuralActivity format and merge
        } catch (e) {
          console.error('Error parsing WebSocket message:', e)
        }
      }
      
      ws.onerror = (error) => {
        console.warn('WebSocket error, falling back to simulation:', error)
      }
    } catch (e) {
      console.warn('Could not connect to WebSocket, using simulation only:', e)
    }
    
    return () => {
      neuralSimulator.stop()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
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
          <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--ob-card-border)', padding: 4, borderRadius: 10 }}>
            <button onClick={() => setActivePanel('metrics')} style={{ background: activePanel==='metrics' ? 'rgba(255,255,255,0.08)' : 'transparent' }}>Metrics</button>
            <button onClick={() => setActivePanel('legend')} style={{ background: activePanel==='legend' ? 'rgba(255,255,255,0.08)' : 'transparent' }}>Legend</button>
          </div>
        </div>
      </div>

      <div className="ob-content">
        <div style={{ flex: 1 }}>
          <BrainScene
            activity={activity}
            onRegionClick={handleRegionSelect}
            selectedRegion={selectedRegion}
            visualizationMode={visualizationMode}
          />
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
