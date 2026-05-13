"use client";

import { useState, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider } from "@react-three/rapier";
import { Image, Html } from "@react-three/drei";

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

  const aspect = (() => {
    try {
      const dims = (artwork.dimensions || "1x1").split("x").map((s: string) => parseFloat(s.trim()));
      if (dims.length === 2 && dims[0] > 0 && dims[1] > 0) return dims[0] / dims[1];
    } catch {}
    return 1.4;
  })();

  const frameW = 1.8;
  const frameH = frameW / aspect;

  return (
    <group position={position} rotation={rotation}>
      {/* Interaction Sensor */}
      <CuboidCollider
        args={[1.5, 1.5, 1.5]}
        position={[0, 0, -1.5]}
        sensor
        onIntersectionEnter={() => setInRange(true)}
        onIntersectionExit={() => setInRange(false)}
      />

      {/* Backboard */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[frameW + 0.1, frameH + 0.1, 0.1]} />
        <meshStandardMaterial color={hovered ? "#333" : "#1a1a1a"} />
      </mesh>

      {/* Gold frame border */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[frameW + 0.2, frameH + 0.2, 0.03]} />
        <meshStandardMaterial color={hovered ? "#D4B96A" : "#8B7355"} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* The Painting — uses drei <Image> for GPU memory management */}
      <Image
        url={artwork.image_url_3d}
        position={[0, 0, 0.02]}
        scale={[frameW, frameH]}
        transparent
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />

      {/* Interaction Prompt */}
      {inRange && (
        <Html center position={[0, -1, -1]} distanceFactor={5}>
          <div className="bg-black/90 text-white px-3 py-1 rounded text-xs border border-gold-500/50 pointer-events-none whitespace-nowrap">
            [E] Inspect {artwork.title?.slice(0, 40)}
          </div>
        </Html>
      )}
    </group>
  );
}
