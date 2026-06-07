import { NextResponse } from "next/server";
import { hasFdeDatabaseConfig, listFdeArtists } from "@/lib/fde-db";
import { getSupabaseClient } from "@/lib/supabase";
import { getGalleryData } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasFdeDatabaseConfig()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from("artworks").select("artist").not("artist", "is", null).limit(5000);
      if (!error && data) {
        const names = Array.from(new Set(data.map((row: any) => String(row.artist || "").trim()).filter(Boolean))).sort();
        return NextResponse.json({
          data: names.map((name) => ({ id: name, display_name: name })),
          source: "supabase",
        });
      }
    }

    const names = Array.from(new Set(getGalleryData().artworks.map((artwork) => artwork.artist).filter(Boolean))).sort();
    return NextResponse.json({
      data: names.map((name) => ({ id: name, display_name: name })),
      source: "json",
    });
  }

  try {
    return NextResponse.json({ data: await listFdeArtists(), source: "fde" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load artists." },
      { status: 500 }
    );
  }
}
