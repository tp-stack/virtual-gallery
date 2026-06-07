import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getArtworksPaginated, getStreamArtworksPaginated } from "@/lib/data";
import { hasFdeDatabaseConfig, listFdeArtworks } from "@/lib/fde-db";
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
  const limit = Math.min(Math.max(1, safeInt(searchParams.get("limit"), 50)), 500);
  const movement = searchParams.get("movement");
  const search = searchParams.get("search");
  const roomId = searchParams.get("room");
  const artist = searchParams.get("artist");
  const medium = searchParams.get("medium");
  const institution = searchParams.get("institution") || searchParams.get("museum");
  const year_min = safeInt(searchParams.get("year_min"), 0);
  const year_max = safeInt(searchParams.get("year_max"), 0);

  if (hasFdeDatabaseConfig()) {
    try {
      const result = await listFdeArtworks({
        page,
        limit,
        search,
        roomId,
        artist,
        medium,
      });
      return NextResponse.json({ ...result, source: "fde" });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load artworks from FDE." },
        { status: 500 }
      );
    }
  }

  const streamResult = getStreamArtworksPaginated({
    page,
    limit,
    movement,
    search,
    roomId,
    artist,
    medium,
    institution,
    year_min,
    year_max,
  });
  if (streamResult) {
    return NextResponse.json({ ...streamResult, source: "stream" });
  }

  // Try Supabase first
  const supabase = getSupabaseClient();
  if (supabase) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from("artworks").select("*", { count: "exact" });

    if (movement) query = query.eq("movement", movement);
    if (artist) query = query.ilike("artist", `%${artist}%`);
    if (medium) query = query.ilike("medium", `%${medium}%`);
    if (institution) query = query.ilike("museum", `%${institution}%`);
    if (year_min) query = query.gte("year", year_min);
    if (year_max) query = query.lte("year", year_max);
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,artist.ilike.%${search}%,description.ilike.%${search}%,museum.ilike.%${search}%`
      );
    }
    if (roomId) query = query.eq("room_id", parseInt(roomId));

    query = query.range(from, to).order("year", { ascending: true });

    const { data, error, count } = await query;

    if (!error && data) {
      return NextResponse.json({
        data: data.map(normalizeDbArtwork),
        total: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0,
        source: "supabase",
      });
    }
  }

  // Fallback to JSON file
  const result = getArtworksPaginated({ page, limit, movement, search, roomId, artist, medium, institution, year_min, year_max });
  return NextResponse.json({ ...result, source: "json" });
}
