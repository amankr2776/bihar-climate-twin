import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, Stars, Float, MeshDistortMaterial, Torus } from "@react-three/drei";
import * as THREE from "three";

function Planet() {
  const mesh = useRef<THREE.Mesh>(null);
  const rim = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (mesh.current) mesh.current.rotation.y += dt * 0.12;
    if (rim.current) rim.current.rotation.y -= dt * 0.06;
  });
  return (
    <group>
      <Sphere args={[2.35, 64, 64]}>
        <meshBasicMaterial color="#4f8bff" transparent opacity={0.08} side={THREE.BackSide} />
      </Sphere>
      <Sphere args={[2.5, 64, 64]}>
        <meshBasicMaterial color="#ff6b3d" transparent opacity={0.05} side={THREE.BackSide} />
      </Sphere>
      <Sphere ref={mesh} args={[2, 96, 96]}>
        <MeshDistortMaterial
          color="#0b1a2f"
          emissive="#1a3a6b"
          emissiveIntensity={0.35}
          roughness={0.4}
          metalness={0.6}
          distort={0.22}
          speed={1.2}
        />
      </Sphere>
      <Sphere ref={rim} args={[2.02, 48, 48]}>
        <meshBasicMaterial color="#ff8a3d" wireframe transparent opacity={0.28} />
      </Sphere>
      <Float speed={1.4} rotationIntensity={0.6} floatIntensity={0.6}>
        <Torus args={[3.1, 0.01, 16, 128]} rotation={[Math.PI / 2.5, 0.3, 0]}>
          <meshBasicMaterial color="#ff6b3d" transparent opacity={0.6} />
        </Torus>
        <Torus args={[3.4, 0.006, 16, 128]} rotation={[Math.PI / 3, -0.4, 0.5]}>
          <meshBasicMaterial color="#4f8bff" transparent opacity={0.5} />
        </Torus>
      </Float>
    </group>
  );
}

function DataParticles({ count = 240 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.6 + Math.random() * 2.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);
  useFrame((_, dt) => {
    if (points.current) points.current.rotation.y += dt * 0.05;
  });
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#ffb684" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.4, 6.5], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop="always"
    >
      <color attach="background" args={["#050914"]} />
      <fog attach="fog" args={["#050914", 8, 18]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ff8a3d" />
      <directionalLight position={[-4, -2, -3]} intensity={0.6} color="#4f8bff" />
      <Suspense fallback={null}>
        <Planet />
        <DataParticles />
        <Stars radius={60} depth={40} count={2500} factor={3} saturation={0} fade speed={0.6} />
      </Suspense>
    </Canvas>
  );
}
