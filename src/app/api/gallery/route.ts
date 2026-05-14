import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getRooms } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  // Try Supabase first
  const supabase = getSupabaseClient();
  if (supabase) {
    // Use distinct count via aggregation by fetching all room_ids
    const { data: roomData, error } = await supabase
      .from("artworks")
      .select("room_id")
      .not("room_id", "is", null)
      .order("room_id")
      .range(0, 100000);

    if (!error && roomData && roomData.length > 0) {
      const roomIds = Array.from(new Set(roomData.map((r: any) => r.room_id))).sort(
        (a: any, b: any) => a - b
      );

      const rooms = roomIds.map((rid: any) => ({
        id: `room-${rid}`,
        room_id: rid,
        position: { x: (rid % 3) * 30, y: 0, z: Math.floor(rid / 3) * 22 },
        width: 30,
        depth: 20,
      }));

      return NextResponse.json({
        rooms,
        total_rooms: rooms.length,
        dimensions: { width: 30, height: 5, depth: 20 },
        source: "supabase",
      });
    }
  }

  // Fallback to JSON file
  const rooms = getRooms();
  return NextResponse.json({
    rooms,
    total_rooms: rooms.length,
    dimensions: { width: 30, height: 5, depth: 20 },
    source: "json",
  });
}
