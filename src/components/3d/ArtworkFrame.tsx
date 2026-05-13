"use client";

import { useRef, useState } from "react";
import { Image } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";

const FRAME_DEPTH = 0.05;
const FRAME_WIDTH = 0.08;

export default function ArtworkFrame({
  imageUrl,
  position,
  rotationY,
  aspect,
  onHover,
  onClick,
}: {
  imageUrl: string;
  position: [number, number, number];
  rotationY: number;
  aspect: number;
  onHover?: (hovering: boolean) => void;
  onClick?: () => void;
}) {
  const frameW = 2.2;
  const frameH = frameW / aspect;
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<any>(null);

  const handlePointerOver = () => {
    setHovered(true);
    onHover?.(true);
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = () => {
    setHovered(false);
    onHover?.(false);
    document.body.style.cursor = "default";
  };

  const fw2 = frameW / 2;
  const fh2 = frameH / 2;
  const fb = FRAME_WIDTH;

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      {/* Frame - outer border */}
      <mesh position={[0, 0, -FRAME_DEPTH]} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} onClick={onClick}>
        <boxGeometry args={[frameW + fb * 2, frameH + fb * 2, FRAME_DEPTH * 2]} />
        <meshStandardMaterial color={hovered ? "#D4B96A" : "#8B7355"} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Frame inner ring */}
      <mesh position={[0, 0, -FRAME_DEPTH * 0.5]}>
        <boxGeometry args={[frameW + fb, frameH + fb, FRAME_DEPTH]} />
        <meshStandardMaterial color="#5C4033" roughness={0.7} />
      </mesh>

      {/* Painting image */}
      <Image
        url={imageUrl}
        position={[0, 0, FRAME_DEPTH]}
        scale={[frameW, frameH]}
        transparent
      />

      {/* Interaction sensor */}
      <RigidBody type="kinematicPosition" sensor position={[0, 0, 0.5]}>
        <mesh visible={false}>
          <boxGeometry args={[frameW + 1, frameH + 1, 0.5]} />
        </mesh>
      </RigidBody>
    </group>
  );
}
