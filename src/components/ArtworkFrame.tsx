"use client";

import { useState, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { Html } from "@react-three/drei";

export default function ArtworkFrame({
  artwork,
  position,
  rotation,
  onSelect,
}: {
  artwork: any;
  position: [number, number, number];
  rotation: [number, number, number];
  onSelect: (art: any) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [inRange, setInRange] = useState(false);
  const keysPressed = useRef(new Set<string>());

  useEffect(() => {
    const down = (e: KeyboardEvent) => keysPressed.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame(() => {
    if (!inRange) return;
    if (keysPressed.current.has("e")) {
      onSelect(artwork);
      keysPressed.current.delete("e");
    }
  });

  const frameWidth = 3;
  const frameDepth = 0.1;
  const frameBorder = 0.15;

  return (
    <group position={position} rotation={rotation}>
      {/* Interaction Sensor */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[frameWidth / 2, 1.5, 1.5]}
          position={[0, 0, -1.5]}
          sensor
          onIntersectionEnter={() => setInRange(true)}
          onIntersectionExit={() => setInRange(false)}
        />
      </RigidBody>

      {/* Backboard */}
      <mesh position={[0, 0, -frameDepth]}>
        <boxGeometry
          args={[frameWidth + frameBorder, 2 + frameBorder, frameDepth]}
        />
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Painting surface */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[frameWidth, 2]} />
        <meshStandardMaterial
          color={hovered ? "#555" : "#333"}
          emissive={hovered ? "#C9A84C" : "#000"}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Gold plaque */}
      <mesh position={[0, -1.3, -0.01]}>
        <boxGeometry args={[0.8, 0.2, 0.02]} />
        <meshStandardMaterial color="#C9A84C" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Interaction Prompt */}
      {inRange && (
        <Html center position={[0, -0.5, -1]} distanceFactor={5}>
          <div className="bg-black/80 text-white px-3 py-1 rounded text-sm pointer-events-none whitespace-nowrap border border-gold-500/50">
            [E] Inspect {artwork.title}
          </div>
        </Html>
      )}
    </group>
  );
}
