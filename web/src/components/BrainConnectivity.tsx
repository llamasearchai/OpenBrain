import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { BRAIN_REGIONS } from '../data/brainRegions';
import type { ConnectionActivity } from '../services/neuralSimulation';

interface BrainConnectivityProps {
  connections: ConnectionActivity[];
  onConnectionClick?: (connection: ConnectionActivity) => void;
}

export function BrainConnectivity({ connections, onConnectionClick }: BrainConnectivityProps) {
  // Create connection lines
  const connectionLines = useMemo(() => {
    return connections.map((conn, index) => {
      const sourceRegion = BRAIN_REGIONS.find(r => r.id === conn.source);
      const targetRegion = BRAIN_REGIONS.find(r => r.id === conn.target);
      
      if (!sourceRegion || !targetRegion) return null;
      
      // Create positions array [x1, y1, z1, x2, y2, z2]
      const positions = [
        sourceRegion.position[0],
        sourceRegion.position[1],
        sourceRegion.position[2],
        targetRegion.position[0],
        targetRegion.position[1],
        targetRegion.position[2]
      ];
      
      // Determine color based on connection strength
      const color = new THREE.Color();
      if (conn.strength > 0.7) {
        color.setRGB(1, 0, 0); // Red for strong connections
      } else if (conn.strength > 0.4) {
        color.setRGB(1, 0.5, 0); // Orange for medium connections
      } else {
        color.setRGB(0, 1, 0); // Green for weak connections
      }
      
      return {
        id: `conn-${index}`,
        positions,
        color: color.getHex(),
        width: Math.max(0.5, conn.strength * 3),
        connection: conn
      };
    }).filter(Boolean) as { 
      id: string; 
      positions: number[]; 
      color: number; 
      width: number; 
      connection: ConnectionActivity 
    }[];
  }, [connections]);

  return (
    <group>
      {connectionLines.map((line) => (
        <ConnectionLine
          key={line.id}
          positions={line.positions}
          color={line.color}
          width={line.width}
          onClick={(e) => { e.stopPropagation(); onConnectionClick?.(line.connection); }}
        />
      ))}
    </group>
  );
}

interface ConnectionLineProps {
  positions: number[];
  color: number;
  width: number;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
}

function ConnectionLine({ positions, color, width, onClick }: ConnectionLineProps) {
  
  // Create geometry and material
  const geometry = useMemo(() => {
    const geom = new LineGeometry();
    geom.setPositions(positions);
    return geom;
  }, [positions]);
  
  const material = useMemo(() => {
    return new LineMaterial({
      color,
      linewidth: width,
      vertexColors: false,
      dashed: false,
      alphaToCoverage: true,
    });
  }, [color, width]);
  
  return (
    <mesh onClick={onClick}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
