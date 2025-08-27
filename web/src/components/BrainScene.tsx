import { Canvas, useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Environment, Text, Html } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Physics, RigidBody } from '@react-three/rapier'
import { Suspense, useState, useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { BRAIN_REGIONS } from '../data/brainRegions'
import { meshNameToRegionId } from '../data/meshRegionMap'
import type { NeuralActivity } from '../services/neuralSimulation'
import { VisualizationModeManager } from '../services/visualizationModes'
import type { VisualizationMode } from '../services/visualizationModes'
import { BrainConnectivity } from './BrainConnectivity'
// Fix type-only import for GLTF
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useLocalStorage } from '../hooks/useLocalStorage'

const visualizationManager = new VisualizationModeManager();


function BrainModel(props: {
  onRegionClick?: (regionId: string) => void;
  onHoverRegion?: (regionId: string | null) => void;
  onModelReady?: (ready: boolean) => void;
  activity?: NeuralActivity | null | undefined;
}) {
  // Replace useLoader with manual loader and a safe fallback when the external .bin is missing
  const [gltf, setGltf] = useState<GLTF | null>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    const loader: any = new GLTFLoader()
    const url = '/models/openbrain/brain.gltf'
    if (loader && typeof loader.load === 'function') {
      try {
        loader.load(
          url,
          (loaded: unknown) => { setGltf(loaded as GLTF); props.onModelReady?.(true) },
          undefined,
          (err: unknown) => {
            console.warn('GLTF load failed, using placeholder geometry:', err)
            setGltf(null)
            props.onModelReady?.(false)
          }
        )
      } catch (err) {
        console.warn('GLTF load threw synchronously; using placeholder geometry:', err)
        setGltf(null)
        props.onModelReady?.(false)
      }
    } else {
      console.warn('GLTFLoader.load not available in this environment; using placeholder geometry')
      setGltf(null)
      props.onModelReady?.(false)
    }
  }, [])

  // Update material based on visualization mode and activity
  useFrame(() => {
    if (meshRef.current && props.activity) {
      // hook retained for real-time updates if needed
    }
  })

  const pickRegionIdFromEvent = (e: ThreeEvent<MouseEvent>): string | null => {
    // Prefer mesh name mapping
    const byName = meshNameToRegionId(e?.object?.name)
    if (byName) return byName
    // Fallback: nearest region center to the intersection point
    const p = e?.point as THREE.Vector3 | undefined
    if (!p) return null
    let best: { id: string; d2: number } | null = null
    for (const r of BRAIN_REGIONS) {
      const dx = p.x - r.position[0]
      const dy = p.y - r.position[1]
      const dz = p.z - r.position[2]
      const d2 = dx * dx + dy * dy + dz * dz
      if (!best || d2 < best.d2) best = { id: r.id, d2 }
    }
    return best?.id ?? null
  }

  // If GLTF is available, render it; otherwise render a lightweight placeholder
  if (gltf) {
    return (
      <primitive
        object={gltf.scene}
        scale={0.01}
        onPointerMove={(e: ThreeEvent<MouseEvent>) => {
          const id = pickRegionIdFromEvent(e)
          props.onHoverRegion?.(id)
        }}
        onPointerOver={(e: ThreeEvent<MouseEvent>) => {
          const id = pickRegionIdFromEvent(e)
          props.onHoverRegion?.(id)
        }}
        onPointerOut={() => props.onHoverRegion?.(null)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          const id = pickRegionIdFromEvent(e)
          if (id && props.onRegionClick) props.onRegionClick(id)
        }}
      />
    )
  }

  // Placeholder brain: translucent sphere to keep the scene functional without the heavy asset
  return (
    <group>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <sphereGeometry args={[2.8, 32, 32]} />
        <meshStandardMaterial color="#888" transparent opacity={0.2} wireframe />
      </mesh>
    </group>
  )
}

function RegionHighlight({ regionId }: { regionId: string | null }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // In a real implementation, we would position and scale the highlight
  // based on the actual brain region geometry
  useFrame(() => {
    if (meshRef.current) {
      // Simple animation for demonstration
      meshRef.current.rotation.y += 0.01
    }
  })
  
  if (!regionId) return null
  
  const region = BRAIN_REGIONS.find(r => r.id === regionId)
  if (!region) return null
  
  return (
    <mesh ref={meshRef} position={region.position as [number, number, number]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial
        color={region.color}
        transparent
        opacity={0.6}
        emissive={region.color}
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}

function BrainWaves({ activity }: { activity?: NeuralActivity | null | undefined }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame(() => {
    if (activity && meshRef.current) {
      // Animate based on brain wave activity
      const scale = 1 + (activity.brainWaves.alpha * 0.5)
      meshRef.current.scale.setScalar(scale)
    }
  })
  
  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[3, 32, 32]} />
      <meshStandardMaterial
        color="#4287f5"
        transparent
        opacity={0.1}
        wireframe={true}
      />
    </mesh>
  )
}

function RegionLabels() {
  return (
    <>
      {BRAIN_REGIONS.map((region) => (
        <Text
          key={region.id}
          position={region.position as [number, number, number]}
          color={region.color}
          fontSize={0.1}
          maxWidth={2}
          lineHeight={0.8}
          letterSpacing={0.02}
          textAlign="center"
        >
          {region.abbreviation}
        </Text>
      ))}
    </>
  )
}

interface BrainSceneProps {
  activity?: NeuralActivity | null;
  onRegionClick?: (regionId: string) => void;
  selectedRegion?: string | null;
  visualizationMode?: VisualizationMode;
  onStimulateRegion?: (regionId: string) => void;
}

export function BrainScene({
  activity,
  onRegionClick,
  selectedRegion,
  visualizationMode = 'structural',
  onStimulateRegion,
}: BrainSceneProps) {
  const [showLabels, setShowLabels] = useLocalStorage<boolean>('ob.showLabels', true)
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [pinnedRegion, setPinnedRegion] = useLocalStorage<string | null>('ob.pinnedRegion', null)
  const [autoRotate, setAutoRotate] = useLocalStorage<boolean>('ob.autoRotate', true)
  const [autoRotateSpeed, setAutoRotateSpeed] = useLocalStorage<number>('ob.autoRotateSpeed', -0.2) // negative = clockwise
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [hasGltf, setHasGltf] = useState(false)
  
  // Keep controls in sync with state
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
      controlsRef.current.autoRotateSpeed = autoRotateSpeed
    }
  }, [autoRotate, autoRotateSpeed])
  
  // Update visualization mode
  useEffect(() => {
    visualizationManager.setMode(visualizationMode);
  }, [visualizationMode]);
  
  return (
    <Canvas data-testid="canvas" camera={{ position: [2.5, 1.5, 2.5], fov: 50 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.0} />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#4287f5" />
      
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]}>
          <RigidBody type="dynamic" colliders="trimesh">
            <BrainModel
              onRegionClick={(id) => {
                onRegionClick?.(id)
                setPinnedRegion(id)
              }}
              onHoverRegion={(id) => {
                setHoveredRegion(id)
              }}
              onModelReady={(ready) => setHasGltf(ready)}
              activity={activity}
            />
          </RigidBody>
        </Physics>
        
        <RegionHighlight regionId={(selectedRegion || hoveredRegion || pinnedRegion) ?? null} />
        <RegionTooltip regionId={(selectedRegion ?? hoveredRegion ?? pinnedRegion) ?? null} activity={activity} />
        {!hasGltf && (
          <RegionProxies
            onHover={setHoveredRegion}
            onClick={(id) => {
              onRegionClick?.(id)
              setPinnedRegion(id)
            }}
          />
        )}

        <OverlayUI
          autoRotate={autoRotate}
          onToggleAutoRotate={(v) => setAutoRotate(v)}
          autoRotateSpeed={autoRotateSpeed}
          onChangeSpeed={(v) => setAutoRotateSpeed(v)}
          showLabels={showLabels}
          onToggleLabels={(v) => setShowLabels(v)}
          pinnedRegion={pinnedRegion}
          onUnpin={() => setPinnedRegion(null)}
          onResetView={() => { setPinnedRegion(null); setResetKey((k) => k + 1) }}
          onSelectRegion={(id) => {
            setPinnedRegion(id)
            onRegionClick?.(id)
          }}
          onStimulate={() => pinnedRegion && onStimulateRegion?.(pinnedRegion)}
        />
        
        {activity && (
          <group name="brain-connectivity">
            <BrainConnectivity
              connections={activity.connections}
              onConnectionClick={(conn) => {
                console.log('Connection clicked:', conn);
              }}
            />
          </group>
        )}
        
        <BrainWaves activity={activity} />
        {showLabels && <RegionLabels />}
        
        <Environment preset="studio" />
        <CameraFocus
          controlsRef={controlsRef}
          focusTo={pinnedRegion ? (BRAIN_REGIONS.find(r=>r.id===pinnedRegion)?.position as [number,number,number]) ?? null : null}
          resetKey={resetKey}
        />
      </Suspense>
      
      <gridHelper args={[10, 10]} />
      <axesHelper args={[5]} />
      {/* Auto-rotation with damping and user speed control */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={2.5}
        maxDistance={10}
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI - 0.4}
      />
    </Canvas>
  )
}

function RegionProxies({
  onHover,
  onClick,
}: {
  onHover: (regionId: string | null) => void
  onClick?: (regionId: string) => void
}) {
  return (
    <group name="region-proxies">
      {BRAIN_REGIONS.map((region) => (
        <mesh
          key={region.id}
          position={region.position as [number, number, number]}
          onPointerOver={(e) => {
            e.stopPropagation()
            onHover(region.id)
          }}
          onPointerMove={(e) => {
            e.stopPropagation()
            onHover(region.id)
          }}
          onPointerOut={(e) => {
            e.stopPropagation()
            onHover(null)
          }}
          onClick={(e) => {
            e.stopPropagation()
            onClick?.(region.id)
          }}
        >
          <boxGeometry args={region.size as [number, number, number]} />
          {/* Transparent but pickable */}
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function RegionTooltip({ regionId, activity }: { regionId: string | null, activity?: NeuralActivity | null | undefined }) {
  if (!regionId) return null
  const region = BRAIN_REGIONS.find(r => r.id === regionId)
  if (!region) return null
  const rAct = activity?.regions?.[region.id]
  return (
    <Html
      position={region.position as [number, number, number]}
      center
      distanceFactor={6}
      transform
      occlude
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 10px',
          borderRadius: 8,
          maxWidth: 220,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          border: `1px solid ${region.color}`,
          fontSize: 12,
          lineHeight: 1.2,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6, color: region.color }}>
          {region.name} ({region.abbreviation})
        </div>
        {rAct && (
          <div style={{ marginBottom: 6, fontSize: 11, opacity: 0.9 }}>
            Activation: {(rAct.activation * 100).toFixed(0)}% · Blood flow: {(rAct.bloodFlow * 100).toFixed(0)}%
          </div>
        )}
        <div>
          {region.functions.slice(0, 4).map((fn) => (
            <div key={fn} style={{ marginBottom: 2 }}>• {fn}</div>
          ))}
        </div>
      </div>
    </Html>
  )
}

function OverlayUI({
  autoRotate,
  onToggleAutoRotate,
  autoRotateSpeed,
  onChangeSpeed,
  showLabels,
  onToggleLabels,
  pinnedRegion,
  onUnpin,
  onResetView,
  onSelectRegion,
  onStimulate,
}: {
  autoRotate: boolean
  onToggleAutoRotate: (v: boolean) => void
  autoRotateSpeed: number
  onChangeSpeed: (v: number) => void
  showLabels: boolean
  onToggleLabels: (v: boolean) => void
  pinnedRegion: string | null
  onUnpin: () => void
  onResetView: () => void
  onSelectRegion: (id: string) => void
  onStimulate: () => void
}) {
  const pinned = pinnedRegion ? BRAIN_REGIONS.find((r) => r.id === pinnedRegion) : null
  const [query, setQuery] = useState('')
  const [focusDuration, setFocusDuration] = useLocalStorage<number>('ob.focusDuration', 1.5)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const results = query.length
    ? BRAIN_REGIONS.filter(r =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.abbreviation.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : []
  return (
    <Html position={[-4, 3.5, 0]} transform distanceFactor={10} style={{ pointerEvents: 'auto' }}>
      <div
        style={{
          background: 'rgba(20,20,20,0.7)',
          color: 'white',
          padding: '10px 12px',
          borderRadius: 10,
          width: 260,
          backdropFilter: 'blur(4px)',
          boxShadow: '0 6px 16px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
          <strong>View Controls</strong>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => onToggleAutoRotate(e.target.checked)}
              aria-label="Auto rotate"
            />
            Auto rotate
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => onToggleLabels(e.target.checked)}
              aria-label="Toggle labels"
            />
            Labels
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>Speed</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={autoRotateSpeed}
            onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
            style={{ width: 160 }}
            aria-label="Rotate speed"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>Focus</span>
          <input
            type="number"
            min={0.5}
            max={5}
            step={0.1}
            value={focusDuration}
            onChange={(e) => setFocusDuration(parseFloat(e.target.value))}
            aria-label="Camera focus duration"
            style={{ width: 70 }}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="Search region..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlightedIndex(-1) }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                if (results.length > 0) setHighlightedIndex((i) => (i < 0 ? 0 : Math.min(results.length - 1, i + 1)))
              } else if (e.key === 'ArrowUp') {
                if (results.length > 0) setHighlightedIndex((i) => Math.max(-1, i - 1))
              } else if (e.key === 'Enter') {
                if (highlightedIndex >= 0 && results[highlightedIndex]) {
                  const r = results[highlightedIndex]
                  setQuery('')
                  onSelectRegion(r.id)
                }
              }
            }}
            aria-label="Search brain region"
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.06)',
              color: 'white',
              outline: 'none'
            }}
          />
          {results.length > 0 && (
            <div style={{
              marginTop: 6,
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              overflow: 'hidden'
            }}>
              {results.map((r, idx) => (
                <div
                  key={r.id}
                  onClick={() => { setQuery(''); onSelectRegion(r.id) }}
                  style={{ padding: '6px 8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', background: highlightedIndex===idx ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                >
                  <span>{r.name}</span>
                  <span style={{ opacity: 0.8 }}>{r.abbreviation}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onResetView}
            style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer' }}
          >
            Reset View
          </button>
        </div>
        {pinned && (
          <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 8 }}>
            <div style={{ marginBottom: 6 }}>
              <strong>Pinned:</strong> {pinned.name} ({pinned.abbreviation})
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {pinned.functions.slice(0, 3).map((f) => (
                <span key={f} style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: 6 }}>{f}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={onStimulate}
                style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer' }}
              >
                Stimulate
              </button>
              <button
                onClick={onUnpin}
                style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer' }}
              >
                Unpin
              </button>
            </div>
          </div>
        )}
      </div>
    </Html>
  )
}

function CameraFocus({
  controlsRef,
  focusTo,
  resetKey,
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>
  focusTo: [number, number, number] | null
  resetKey: number
}) {
  const targetRef = useRef<THREE.Vector3 | null>(null)
  const progressRef = useRef(0)
  useEffect(() => {
    targetRef.current = focusTo ? new THREE.Vector3(...focusTo) : null
    if (focusTo) progressRef.current = 0
  }, [focusTo])
  const lastReset = useRef(0)
  useEffect(() => {
    if (resetKey !== lastReset.current) {
      lastReset.current = resetKey
      targetRef.current = new THREE.Vector3(0, 0, 0)
      progressRef.current = 0
    }
  }, [resetKey])

  useFrame((state, delta) => {
    if (!targetRef.current || !controlsRef.current) return
    const controls = controlsRef.current
    const camera = state.camera
    // Ease progress
    const speed = 1.5 // seconds to focus
    progressRef.current = Math.min(1, progressRef.current + delta / speed)
    const t = 1 - Math.pow(1 - progressRef.current, 3) // cubic ease-out

    // Lerp controls target
    const currentTarget = controls.target.clone()
    const nextTarget = currentTarget.lerp(targetRef.current, t)
    controls.target.copy(nextTarget)

    // Position camera at an offset from target
    const desired = targetRef.current.clone().add(new THREE.Vector3(2.5, 1.5, 2.5))
    camera.position.lerp(desired, t * 0.5)
    controls.update()

    if (progressRef.current >= 1) {
      targetRef.current = null
    }
  })

  return null
}
