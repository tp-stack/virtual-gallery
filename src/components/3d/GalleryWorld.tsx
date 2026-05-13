"use client";

import { useMemo } from "react";
import { Text } from "@react-three/drei";
import MuseumRoom from "./MuseumRoom";
import ArtworkFrame from "./ArtworkFrame";
import type { Artwork, Gallery } from "@/lib/data";

function FoyerText() {
  return (
    <Text
      position={[0, 3.5, 0]}
      fontSize={0.8}
      color="#C9A84C"
      font="https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDZbtM.woff"
      anchorX="center"
      anchorY="middle"
    >
      Timeless Masterpieces
    </Text>
  );
}

export default function GalleryWorld({
  artworks,
  gallery,
  onArtworkClick,
}: {
  artworks: Artwork[];
  gallery: Gallery;
  onArtworkClick?: (artworkId: string) => void;
}) {
  const artworkMap = useMemo(() => {
    const map = new Map<string, Artwork>();
    for (const art of artworks) map.set(art.id, art);
    return map;
  }, [artworks]);

  return (
    <>
      <fog attach="fog" args={["#0A0A0A", 10, 80]} />

      {gallery.layout.map((room) => {
        const pos = room.position || { x: 0, y: 0, z: 0 };
        const dim = room.dimensions || { width: 30, height: 5, depth: 20 };
        const dw = room.doorway || { width: 4, height: 3.5 };
        const artIds = room.artwork_ids || [];

        return (
          <group key={room.id} position={[pos.x, pos.y, pos.z]}>
            <MuseumRoom
              width={dim.width}
              height={dim.height}
              depth={dim.depth}
              wallColor={room.style.wall_color}
              floor={room.style.floor}
              lighting={room.style.lighting}
              doorway={{ width: dw.width, height: dw.height, z: -dim.depth / 2 }}
            />

            {room.id === "room-0" && <FoyerText />}

            {artIds.map((artId, index) => {
              const art = artworkMap.get(artId);
              if (!art) return null;

              const isLeft = index % 2 === 0;
              const paintingSpacing = (dim.depth * 0.7) / Math.max(Math.ceil(artIds.length / 2), 1);
              const zPainting = -dim.depth / 2 + 1.5 + Math.floor(index / 2) * paintingSpacing;

              const xPos = isLeft ? -dim.width / 2 + 0.35 : dim.width / 2 - 0.35;
              const rotY = isLeft ? Math.PI / 2 : -Math.PI / 2;

              let aspect = 1;
              try {
                const parts = (art.dimensions || "1x1").split("x").map((s) => parseFloat(s.trim()));
                if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
                  aspect = parts[0] / parts[1];
                }
              } catch {}

              return (
                <ArtworkFrame
                  key={artId}
                  imageUrl={art.image_url}
                  position={[xPos, 1.6, zPainting]}
                  rotationY={rotY}
                  aspect={aspect}
                  onClick={() => onArtworkClick?.(artId)}
                />
              );
            })}
          </group>
        );
      })}
    </>
  );
}
