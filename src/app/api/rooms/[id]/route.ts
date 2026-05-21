import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getArtworksPaginated } from "@/lib/data";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

function safeInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
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

  // Try Supabase first
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("artworks")
      .select("*")
      .eq("room_id", roomId)
      .order("position_z", { ascending: true });

    if (!error && data) {
      return NextResponse.json({ room_id: roomId, artworks: data, source: "supabase" });
    }
  }

  // Fallback to JSON file
  const result = getArtworksPaginated({ page: 1, limit: 1000, roomId: String(roomId) });
  return NextResponse.json({ room_id: roomId, artworks: result.data, source: "json" });
}
