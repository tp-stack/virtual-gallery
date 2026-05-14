import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getRooms } from "@/lib/data";

export const dynamic = "force-dynamic";

const ROOM_WIDTH = 30;
const ROOM_DEPTH = 20;

export async function GET() {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data: roomData, error } = await supabase
      .from("artworks")
      .select("room_id")
      .not("room_id", "is", null)
      .order("room_id");

    if (!error && roomData && roomData.length > 0) {
      const roomIds = Array.from(new Set(roomData.map((r: any) => r.room_id))).sort(
        (a: any, b: any) => a - b
      );

      const rooms = roomIds.map((rid: any) => ({
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
