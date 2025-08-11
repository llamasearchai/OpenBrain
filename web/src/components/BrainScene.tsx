import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Html, useProgress } from '@react-three/drei'
import { Physics, RigidBody } from '@react-three/rapier'
import { Suspense } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useLoader } from '@react-three/fiber'

function Loader() {
  const { progress } = useProgress()
  return <Html center>{progress.toFixed(0)} %</Html>
}

function BrainModel() {
  const gltf = useLoader(GLTFLoader, '/models/human_brain/Human_Brain.gltf')
  return <primitive object={gltf.scene} scale={0.01} />
}

export function BrainScene() {
  return (
    <Canvas camera={{ position: [2.5, 1.5, 2.5], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.0} />
      <Suspense fallback={<Loader />}>
        <Physics gravity={[0, -9.81, 0]}>
          <RigidBody type="dynamic" colliders="trimesh">
            <BrainModel />
          </RigidBody>
        </Physics>
        <Environment preset="studio" />
      </Suspense>
      <gridHelper args={[10, 10]} />
      <OrbitControls makeDefault />
    </Canvas>
  )
}


