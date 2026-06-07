import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getRooms, getStreamManifest, getStreamRooms } from "@/lib/data";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ROOM_WIDTH = 30;
  const ROOM_DEPTH = 20;
const MAX_ROOMS = 5;

export async function GET(request: NextRequest) {
  const { allowed, remaining, resetAt } = rateLimit(getClientIp(request));
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
    );
  }

  const streamManifest = getStreamManifest();
  const streamRooms = getStreamRooms();
  if (streamManifest && streamRooms) {
    return NextResponse.json({
      rooms: streamRooms,
      total_rooms: streamManifest.rooms,
      displayed_rooms: streamRooms.length,
      dimensions: { width: ROOM_WIDTH, height: 5, depth: ROOM_DEPTH },
      source: "stream",
    });
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    // Use raw Supabase REST API to bypass client-side limits
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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

            let rooms = roomIds.map((rid: any) => ({
              id: `room-${rid}`,
              room_id: rid,
              position: { x: (rid % 3) * ROOM_WIDTH, y: 0, z: Math.floor(rid / 3) * (ROOM_DEPTH + 2) },
              width: ROOM_WIDTH,
              depth: ROOM_DEPTH,
            }));
            rooms = rooms.slice(0, MAX_ROOMS);

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

      let rooms = roomIds.map((rid: any) => ({
        id: `room-${rid}`,
        room_id: rid,
        position: { x: (rid % 3) * ROOM_WIDTH, y: 0, z: Math.floor(rid / 3) * (ROOM_DEPTH + 2) },
        width: ROOM_WIDTH,
        depth: ROOM_DEPTH,
      }));
      rooms = rooms.slice(0, MAX_ROOMS);

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
