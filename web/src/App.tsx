import './App.css'
import { BrainScene } from './components/BrainScene'
import { useEffect, useRef, useState } from 'react'

function App() {
  const [metrics, setMetrics] = useState<any | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const url = (import.meta as any).env.VITE_WS_URL || 'ws://localhost:8000/ws/brain'
    const ws = new WebSocket(url as string)
    wsRef.current = ws
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        setMetrics(data)
      } catch {}
    }
    return () => {
      ws.close()
    }
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', height: '100vh' }}>
      <BrainScene />
      <div style={{ padding: 16, overflow: 'auto', background: '#111', color: '#ddd' }}>
        <h2>Digital Twin Stream</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{metrics ? JSON.stringify(metrics, null, 2) : 'Waiting for data...'}</pre>
      </div>
    </div>
  )
}

export default App
