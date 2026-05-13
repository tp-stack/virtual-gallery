"use client";

import { RigidBody } from "@react-three/rapier";

export default function MuseumHall({
  room,
  isLast,
}: {
  room: any;
  isLast: boolean;
}) {
  const w = 30,
    h = 5,
    d = 20;
  const zPos = room.position.z;
  const wallThickness = 0.5;

  const floorColor =
    room.movement === "Renaissance"
      ? "#2a2a2a"
      : room.movement === "Baroque"
      ? "#1a1a1a"
      : "#e2e2e2";

  return (
    <group position={[0, 0, zPos]}>
      {/* Floor */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[w / 2, -0.25, d / 2]} receiveShadow>
          <boxGeometry args={[w, wallThickness, d]} />
          <meshStandardMaterial color={floorColor} roughness={0.8} />
        </mesh>
      </RigidBody>

      {/* Left Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, h / 2, d / 2]}>
          <boxGeometry args={[wallThickness, h, d]} />
          <meshStandardMaterial color="#1e1e1e" />
        </mesh>
      </RigidBody>

      {/* Right Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[w, h / 2, d / 2]}>
          <boxGeometry args={[wallThickness, h, d]} />
          <meshStandardMaterial color="#1e1e1e" />
        </mesh>
      </RigidBody>

      {/* Back Wall (first room only) */}
      {zPos === 0 && (
        <RigidBody type="fixed" colliders="cuboid">
          <mesh position={[w / 2, h / 2, 0]}>
            <boxGeometry args={[w, h, wallThickness]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </RigidBody>
      )}

      {/* Front Wall with Doorway (if not last room) */}
      {!isLast && (
        <>
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={[w / 2 - 6, h / 2, d]}>
              <boxGeometry args={[w - 12, h, wallThickness]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={[w / 2 + 6, h / 2, d]}>
              <boxGeometry args={[w - 12, h, wallThickness]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={[w / 2, h - 1, d]}>
              <boxGeometry args={[12, 2, wallThickness]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </RigidBody>
        </>
      )}

      {/* Room Spotlights */}
      <pointLight position={[w / 2, h - 0.5, d / 2]} intensity={1} />
    </group>
  );
}
