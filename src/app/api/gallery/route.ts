import { NextResponse } from "next/server";
import { getGalleryData } from "@/lib/data";

export async function GET() {
  const data = getGalleryData();

  const rooms = data.gallery.layout.map((room) => ({
    id: room.id,
    name: room.name,
    movement: room.movement,
    artwork_ids: room.artwork_ids,
    position: room.position || { x: 0, y: 0, z: 0 },
    width: room.dimensions?.width || 30,
    depth: room.dimensions?.depth || 20,
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
  });
}
