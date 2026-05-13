import { NextResponse } from "next/server";
import { getGalleryData } from "@/lib/data";

export async function GET() {
  const data = getGalleryData();

  // Transform to the flat format expected by the 3D GalleryWorld
  const rooms = data.gallery.layout.map((room) => ({
    id: room.id,
    name: room.name,
    movement: room.movement,
    artwork_ids: room.artwork_ids,
    position: room.position || { x: 0, y: 0, z: 0 },
    style: room.style,
    dimensions: room.dimensions || { width: 30, height: 5, depth: 20 },
    doorway: room.doorway || { width: 4, height: 3.5 },
  }));

  const artworkPositions: Record<string, { x: number; y: number; z: number; rotY: number }> = {};
  for (const room of data.gallery.layout) {
    const placements = room.artwork_placements || [];
    for (const p of placements) {
      artworkPositions[p.artwork_id] = {
        x: p.position.x,
        y: p.position.y,
        z: p.position.z,
        rotY: p.rotationY,
      };
    }
  }

  return NextResponse.json({
    rooms,
    artworks: data.artworks,
    artwork_positions: artworkPositions,
    dimensions: { width: 30, height: 5, depth: 20 },
  });
}
