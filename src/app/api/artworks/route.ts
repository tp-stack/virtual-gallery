import { NextRequest, NextResponse } from "next/server";
import { getGalleryData } from "@/lib/data";

export async function GET(request: NextRequest) {
  const { artworks } = getGalleryData();
  const { searchParams } = new URL(request.url);

  const movement = searchParams.get("movement");
  const search = searchParams.get("search");
  const limit = searchParams.get("limit");

  let filtered = [...artworks];

  if (movement) {
    filtered = filtered.filter((a) => a.movement === movement);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.artist.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }

  if (limit) {
    filtered = filtered.slice(0, parseInt(limit));
  }

  return NextResponse.json(filtered);
}
