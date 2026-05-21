import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getArtworksPaginated } from "@/lib/data";

function safeInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const roomId = safeInt(params.id, -1);
  if (isNaN(roomId)) {
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
