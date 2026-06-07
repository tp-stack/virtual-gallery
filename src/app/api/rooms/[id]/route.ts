import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getArtworksPaginated, getStreamRoom } from "@/lib/data";
import { hasFdeDatabaseConfig, listFdeRoomArtworks } from "@/lib/fde-db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

function safeInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function normalizeDbArtwork(row: any) {
  const image = row.image_url || row.image_url_3d || row.image_url_hd || "";
  return {
    ...row,
    image_url: image,
    image_url_3d: row.image_url_3d || image,
    image_url_hd: row.image_url_hd || image,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { allowed, remaining, resetAt } = rateLimit(getClientIp(request));
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
    );
  }

  const roomId = safeInt(params.id, -1);
  if (roomId < 0) {
    return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
  }

  const streamRoom = getStreamRoom(roomId);
  if (streamRoom.length > 0) {
    return NextResponse.json({ room_id: roomId, artworks: streamRoom, source: "stream" });
  }

  if (hasFdeDatabaseConfig()) {
    try {
      const result = await listFdeRoomArtworks(roomId, 100);
      return NextResponse.json({ room_id: roomId, artworks: result.data, source: "fde" });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load FDE room." },
        { status: 500 }
      );
    }
  }

  // Try Supabase first
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("artworks")
      .select("*")
      .eq("room_id", roomId)
      .order("position_z", { ascending: true });

    if (!error && data) {
      return NextResponse.json({ room_id: roomId, artworks: data.map(normalizeDbArtwork), source: "supabase" });
    }
  }

  // Fallback to JSON file
  const result = getArtworksPaginated({ page: 1, limit: 1000, roomId: String(roomId) });
  return NextResponse.json({ room_id: roomId, artworks: result.data, source: "json" });
}
