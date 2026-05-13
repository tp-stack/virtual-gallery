import { NextResponse } from "next/server";
import { getRooms } from "@/lib/data";

export async function GET() {
  const rooms = getRooms();

  return NextResponse.json({
    rooms,
    total_rooms: rooms.length,
    dimensions: { width: 30, height: 5, depth: 20 },
  });
}
