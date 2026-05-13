import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({
      rooms: [],
      total_rooms: 0,
      dimensions: { width: 30, height: 5, depth: 20 },
    });
  }

  const { data: roomData, error } = await supabase
    .from("artworks")
    .select("room_id")
    .not("room_id", "is", null)
    .order("room_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
  });
}
