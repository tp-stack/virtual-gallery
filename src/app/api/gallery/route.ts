import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getRooms } from "@/lib/data";

export const dynamic = "force-dynamic";

const ROOM_WIDTH = 30;
const ROOM_DEPTH = 20;

export async function GET() {
  const supabase = getSupabaseClient();
  if (supabase) {
    // Use raw Supabase REST API to bypass client-side limits
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const url = `${supabaseUrl}/rest/v1/artworks?select=room_id&order=room_id&limit=100000`;
        const res = await fetch(url, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          cache: "no-store",
        });

        if (res.ok) {
          const roomData = await res.json();
          if (roomData && roomData.length > 0) {
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
      } catch {}
    }

    // Fallback: use Supabase client (limited to 1000 rows)
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
        source: "supabase-client",
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
