"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Environment } from "@react-three/drei";
import { useRef, useMemo, Suspense } from "react";
import type * as THREE from "three";
import { ErrorBoundary } from "react-error-boundary";

function NeuralNetwork() {
  const groupRef = useRef<THREE.Group>(null);
  
  // Generate random node positions
  const nodes = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 30; i++) {
      positions.push([
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
      ]);
    }
    return positions;
  }, []);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#00dcff" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function GlowingRing({ radius, color, speed }: { radius: number; color: string; speed: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * speed;
      meshRef.current.rotation.y = state.clock.elapsedTime * speed * 0.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[radius, 0.02, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  );
}

function CentralOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.05);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color="#00dcff"
          emissive="#004466"
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.8}
          distort={0.3}
          speed={2}
        />
      </mesh>
      {/* Inner glow */}
      <mesh scale={1.1}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#00dcff" transparent opacity={0.1} />
      </mesh>
    </Float>
  );
}

function FloatingCubes() {
  const positions: [number, number, number][] = [
    [-3, 2, -2],
    [3, -1.5, -1],
    [-2.5, -2, 1],
    [2, 2.5, 2],
    [-4, 0, 0],
    [4, 1, -1],
  ];
  
  return (
    <>
      {positions.map((pos, i) => (
        <Float key={i} speed={1 + i * 0.2} rotationIntensity={2} floatIntensity={1}>
          <mesh position={pos}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshBasicMaterial 
              color={i % 2 === 0 ? "#00dcff" : "#ff00b4"} 
              wireframe 
              transparent 
              opacity={0.5}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

function DataStreams() {
  const groupRef = useRef<THREE.Group>(null);
  
  const streams = useMemo(() => {
    const result = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      result.push({
        x: Math.cos(angle) * 5,
        z: Math.sin(angle) * 5,
        height: 2 + Math.random() * 3,
      });
    }
    return result;
  }, []);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {streams.map((stream, i) => (
        <mesh key={i} position={[stream.x, 0, stream.z]}>
          <cylinderGeometry args={[0.01, 0.01, stream.height, 8]} />
          <meshBasicMaterial color="#00dcff" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function GridFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[30, 30, 30, 30]} />
      <meshBasicMaterial color="#00dcff" wireframe transparent opacity={0.1} />
    </mesh>
  );
}

function FallbackBackground() {
  return (
    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-background to-cyan-950/20">
      <div className="absolute inset-0 grid-pattern opacity-30" />
    </div>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#00dcff" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#ff00b4" />
      
      <CentralOrb />
      <NeuralNetwork />
      <FloatingCubes />
      <DataStreams />
      <GridFloor />
      
      {/* Orbital rings */}
      <GlowingRing radius={2} color="#00dcff" speed={0.3} />
      <GlowingRing radius={2.5} color="#ff00b4" speed={-0.2} />
      <GlowingRing radius={3} color="#00dcff" speed={0.15} />
      
      <Environment preset="night" />
    </>
  );
}

export function ArenaScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <ErrorBoundary fallback={<FallbackBackground />}>
        <Suspense fallback={<FallbackBackground />}>
          <Canvas
            camera={{ position: [0, 0, 8], fov: 60 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: 'transparent' }}
          >
            <Scene />
          </Canvas>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
