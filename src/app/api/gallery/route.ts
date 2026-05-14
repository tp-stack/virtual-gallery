import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getRooms } from "@/lib/data";

export const dynamic = "force-dynamic";

const ROOM_WIDTH = 30;
const ROOM_DEPTH = 20;

export async function GET() {
  const supabase = getSupabaseClient();
  if (supabase) {
    // Get count of artworks with room_ids (exact, not limited to 1000 rows)
    const { count, error: countError } = await supabase
      .from("artworks")
      .select("*", { count: "exact", head: true })
      .not("room_id", "is", null);

    if (!countError && count) {
      // Approximate rooms: 10 artworks per room
      const estimatedRooms = Math.ceil(count / 10);

      // Get the first 1000 rows of room data for the lower rooms
      const { data: roomData } = await supabase
        .from("artworks")
        .select("room_id")
        .not("room_id", "is", null)
        .order("room_id");

      const roomIds = new Set((roomData || []).map((r: any) => r.room_id));

      // Estimate missing rooms from the count
      for (let r = 0; r < estimatedRooms; r++) {
        roomIds.add(r);
      }

      const sortedIds = Array.from(roomIds).sort((a: any, b: any) => a - b);

      const rooms = sortedIds.map((rid: any) => ({
        id: `room-${rid}`,
        room_id: rid,
        position: { x: (rid % 3) * ROOM_WIDTH, y: 0, z: Math.floor(rid / 3) * (ROOM_DEPTH + 2) },
        width: ROOM_WIDTH,
        depth: ROOM_DEPTH,
      }));

      return NextResponse.json({
        rooms,
        total_rooms: rooms.length,
        dimensions: { width: ROOM_WIDTH, height: 5, depth: ROOM_DEPTH },
        source: "supabase",
      });
    }
  }

  const rooms = getRooms();
  return NextResponse.json({
    rooms,
    total_rooms: rooms.length,
    dimensions: { width: ROOM_WIDTH, height: 5, depth: ROOM_DEPTH },
    source: "json",
  });
}
