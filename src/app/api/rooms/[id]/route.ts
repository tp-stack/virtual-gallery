import { NextRequest, NextResponse } from "next/server";
import { getArtworksPaginated } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const roomId = parseInt(params.id);
  if (isNaN(roomId)) {
    return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
  }

  const result = getArtworksPaginated({
    page: 1,
    limit: 1000,
    roomId: String(roomId),
  });

  return NextResponse.json({
    room_id: roomId,
    artworks: result.data,
  });
}
