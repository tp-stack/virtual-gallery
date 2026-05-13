import { NextRequest, NextResponse } from "next/server";
import { getArtworksPaginated } from "@/lib/data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const movement = searchParams.get("movement");
  const search = searchParams.get("search");
  const roomId = searchParams.get("room");

  const result = getArtworksPaginated({
    page,
    limit,
    movement,
    search,
    roomId,
  });

  return NextResponse.json(result);
}
