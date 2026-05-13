import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ room_id: params.id, artworks: [] });
  }

  const roomId = parseInt(params.id);
  if (isNaN(roomId)) {
    return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("artworks")
    .select("*")
    .eq("room_id", roomId)
    .order("position_z", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ room_id: roomId, artworks: data || [] });
}
