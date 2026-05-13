"use client";

import { RigidBody } from "@react-three/rapier";

const WALL_THICKNESS = 0.3;

const FLOOR_MAP: Record<string, [number, number, number]> = {
  marble: [0.9, 0.85, 0.8],
  dark_wood: [0.2, 0.1, 0.08],
  light_oak: [0.7, 0.55, 0.4],
  stone: [0.5, 0.5, 0.5],
  concrete: [0.35, 0.35, 0.35],
  tatami: [0.6, 0.55, 0.3],
  black_mirror: [0.08, 0.08, 0.12],
  pine: [0.65, 0.5, 0.35],
  parquet: [0.55, 0.4, 0.25],
  polished_concrete: [0.25, 0.25, 0.27],
};

const CEILING_COLOR = "#1A1A1A";

export default function MuseumRoom({
  width,
  height,
  depth,
  wallColor,
  floor,
  lighting,
  doorway = null,
}: {
  width: number;
  height: number;
  depth: number;
  wallColor: string;
  floor: string;
  lighting?: string;
  doorway?: { z?: number; width?: number; height?: number } | null;
}) {
  const hw = width / 2;
  const hd = depth / 2;
  const wt = WALL_THICKNESS;
  const dw = doorway?.width ?? 0;
  const dh = doorway?.height ?? 0;
  const dz = doorway?.z ?? 0;

  const floorColor = FLOOR_MAP[floor] ?? [0.4, 0.4, 0.4];

  const colorStr = `rgb(${floorColor.map(c => Math.round(c * 255)).join(",")})`;

  return (
    <group>
      {/* Floor */}
      <RigidBody type="kinematicPosition">
        <mesh position={[0, -0.15, 0]} receiveShadow>
          <boxGeometry args={[width, 0.3, depth]} />
          <meshStandardMaterial color={colorStr} roughness={0.8} />
        </mesh>
      </RigidBody>

      {/* Ceiling */}
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[width, 0.1, depth]} />
        <meshStandardMaterial color={CEILING_COLOR} />
      </mesh>

      {/* Back wall (positive Z) */}
      {(() => {
        const wallZ = hd;
        return (
          <RigidBody type="kinematicPosition">
            <mesh position={[0, height / 2, wallZ]}>
              <boxGeometry args={[width, height, wt]} />
              <meshStandardMaterial color={wallColor} roughness={0.6} />
            </mesh>
          </RigidBody>
        );
      })()}

      {/* Front wall (negative Z) - with doorway */}
      <RigidBody type="kinematicPosition">
        <mesh position={[0, height / 2, -hd]}>
          <boxGeometry args={[width, height, wt]} />
          <meshStandardMaterial color={wallColor} roughness={0.6} />
        </mesh>
      </RigidBody>
      {/* Doorway opening - cutout using two side pillars */}
      {dw > 0 && (
        <>
          <RigidBody type="kinematicPosition">
            <mesh position={[-hw + dw / 2 + 0.5, dh / 2, -hd]}>
              <boxGeometry args={[hw - dw / 2 - 0.5, dh, wt]} />
              <meshStandardMaterial color={wallColor} roughness={0.6} />
            </mesh>
          </RigidBody>
          <RigidBody type="kinematicPosition">
            <mesh position={[hw - dw / 2 - 0.5, dh / 2, -hd]}>
              <boxGeometry args={[hw - dw / 2 - 0.5, dh, wt]} />
              <meshStandardMaterial color={wallColor} roughness={0.6} />
            </mesh>
          </RigidBody>
          {/* Lintel above doorway */}
          <RigidBody type="kinematicPosition">
            <mesh position={[0, height - (height - dh) / 2, -hd]}>
              <boxGeometry args={[dw, height - dh, wt]} />
              <meshStandardMaterial color={wallColor} roughness={0.6} />
            </mesh>
          </RigidBody>
        </>
      )}

      {/* Left wall (negative X) */}
      <RigidBody type="kinematicPosition">
        <mesh position={[-hw, height / 2, 0]}>
          <boxGeometry args={[wt, height, depth]} />
          <meshStandardMaterial color={wallColor} roughness={0.6} />
        </mesh>
      </RigidBody>

      {/* Right wall (positive X) */}
      <RigidBody type="kinematicPosition">
        <mesh position={[hw, height / 2, 0]}>
          <boxGeometry args={[wt, height, depth]} />
          <meshStandardMaterial color={wallColor} roughness={0.6} />
        </mesh>
      </RigidBody>

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <hemisphereLight args={[wallColor, "#000000", 0.2]} />

      {lighting === "warm" && (
        <pointLight position={[0, height - 0.5, 0]} intensity={0.6} color="#FFD4A0" distance={depth} />
      )}
      {lighting === "dramatic" && (
        <spotLight position={[0, height - 0.5, 0]} angle={0.6} penumbra={0.5} intensity={0.8} color="#FFF0E0" distance={depth} />
      )}
      {lighting === "natural" && (
        <pointLight position={[0, height - 0.5, 0]} intensity={0.5} color="#C8E0FF" distance={depth} />
      )}
      {lighting === "moody" && (
        <pointLight position={[0, height - 1, 0]} intensity={0.35} color="#FF9944" distance={depth} />
      )}
      {lighting === "neon" && (
        <pointLight position={[0, height - 0.5, 0]} intensity={0.7} color="#FF00FF" distance={depth} />
      )}
      {lighting === "soft_paper" && (
        <pointLight position={[0, height - 1, 0]} intensity={0.4} color="#FFF8E0" distance={depth} />
      )}
      {lighting === "golden" && (
        <pointLight position={[0, height - 0.5, 0]} intensity={0.7} color="#FFD700" distance={depth} />
      )}
    </group>
  );
}
