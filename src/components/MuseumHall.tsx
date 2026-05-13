"use client";

import { RigidBody } from "@react-three/rapier";

export default function MuseumHall({
  room,
  isLast,
}: {
  room: any;
  isLast: boolean;
}) {
  const w = room.width || 30;
  const d = room.depth || 20;
  const h = 5;
  const wt = 0.5;
  const zPos = room.position?.z || 0;
  const xPos = room.position?.x || 0;

  return (
    <group position={[xPos, 0, zPos]}>
      {/* Floor */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[w / 2, -0.25, d / 2]} receiveShadow>
          <boxGeometry args={[w, wt, d]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
      </RigidBody>

      {/* Left Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, h / 2, d / 2]}>
          <boxGeometry args={[wt, h, d]} />
          <meshStandardMaterial color="#1e1e1e" />
        </mesh>
      </RigidBody>

      {/* Right Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[w, h / 2, d / 2]}>
          <boxGeometry args={[wt, h, d]} />
          <meshStandardMaterial color="#1e1e1e" />
        </mesh>
      </RigidBody>

      {/* Back Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[w / 2, h / 2, 0]}>
          <boxGeometry args={[w, h, wt]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </RigidBody>

      {/* Front wall (open - connects to next room) */}
      {!isLast && (
        <>
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={[w / 2 - 6, h / 2, d]}>
              <boxGeometry args={[w - 12, h, wt]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={[w / 2 + 6, h / 2, d]}>
              <boxGeometry args={[w - 12, h, wt]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={[w / 2, h - 1, d]}>
              <boxGeometry args={[12, 2, wt]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </RigidBody>
        </>
      )}

      <pointLight position={[w / 2, h - 0.5, d / 2]} intensity={0.8} />
    </group>
  );
}
