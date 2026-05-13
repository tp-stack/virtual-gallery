"use client";

import { useState, useEffect, useRef } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";

export default function ArtworkFrame({
  artwork,
  position,
  rotation,
  hovered,
  artworkId,
}: {
  artwork: any;
  position: [number, number, number];
  rotation: [number, number, number];
  hovered: boolean;
  artworkId: string;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const mountedRef = useRef(true);
  const textureRef = useRef<THREE.Texture | null>(null);

  const imgUrl = artwork.image_url_3d || artwork.image_url;

  useEffect(() => {
    if (!imgUrl) return;
    mountedRef.current = true;
    setErrored(false);
    setLoaded(false);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!mountedRef.current) return;
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      textureRef.current = tex;
      setTexture(tex);
      setLoaded(true);
    };
    img.onerror = () => {
      if (!mountedRef.current) return;
      setErrored(true);
    };
    img.src = imgUrl;

    return () => {
      mountedRef.current = false;
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, [imgUrl]);

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
      {/* Backboard */}
      <mesh position={[0, 0, -0.05]} userData={{ artworkId, title: artwork.title }}>
        <boxGeometry args={[frameW + 0.1, frameH + 0.1, 0.1]} />
        <meshStandardMaterial color={hovered ? "#333" : "#1a1a1a"} />
      </mesh>

      {/* Gold frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[frameW + 0.2, frameH + 0.2, 0.03]} />
        <meshStandardMaterial color={hovered ? "#D4B96A" : "#8B7355"} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Painting surface */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[frameW, frameH]} />
        <meshStandardMaterial
          color={errored ? "#161616" : loaded ? "#fff" : "#161616"}
          map={texture || undefined}
          toneMapped={false}
        />
      </mesh>

      {/* "Being restored" overlay */}
      {errored && (
        <Html center position={[0, 0, 0.05]} distanceFactor={4}>
          <div className="text-center pointer-events-none select-none">
            <div className="w-6 h-px bg-[#C8A96A]/30 mx-auto mb-2" />
            <p className="text-[#B8B2A4] text-[10px] tracking-[0.08em] font-light uppercase whitespace-nowrap">
              Being restored
            </p>
            <p className="text-[#555] text-[8px] tracking-[0.12em] font-light uppercase mt-1 whitespace-nowrap">
              Please check back later
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}
