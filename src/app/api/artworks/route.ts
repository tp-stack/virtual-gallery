import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getArtworksPaginated } from "@/lib/data";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

function safeInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function GET(request: NextRequest) {
  const { allowed, remaining, resetAt } = rateLimit(getClientIp(request));
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, safeInt(searchParams.get("page"), 1));
  const limit = Math.min(Math.max(1, safeInt(searchParams.get("limit"), 50)), 100);
  const movement = searchParams.get("movement");
  const search = searchParams.get("search");
  const roomId = searchParams.get("room");

  // Try Supabase first
  const supabase = getSupabaseClient();
  if (supabase) {
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

    if (!error && data) {
      return NextResponse.json({
        data,
        total: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0,
        source: "supabase",
      });
    }
  }

  // Fallback to JSON file
  const result = getArtworksPaginated({ page, limit, movement, search, roomId });
  return NextResponse.json({ ...result, source: "json" });
}
