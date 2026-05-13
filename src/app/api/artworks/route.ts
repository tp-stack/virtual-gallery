import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
      error: "Supabase not configured",
    });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const movement = searchParams.get("movement");
  const search = searchParams.get("search");
  const roomId = searchParams.get("room");

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("artworks").select("*", { count: "exact" });

  if (movement) query = query.eq("movement", movement);
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,artist.ilike.%${search}%,description.ilike.%${search}%`
    );
  }
  if (roomId) query = query.eq("room_id", parseInt(roomId));

  query = query.range(from, to).order("year", { ascending: true });

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    total: count || 0,
    page,
    limit,
    totalPages: count ? Math.ceil(count / limit) : 0,
  });
}
