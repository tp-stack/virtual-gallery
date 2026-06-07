import { NextResponse } from "next/server";
import { hasFdeDatabaseConfig, listFdeExhibitionPlacements } from "@/lib/fde-db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!hasFdeDatabaseConfig()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  try {
    return NextResponse.json({ data: await listFdeExhibitionPlacements(params.id), source: "fde" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load exhibition placements." },
      { status: 500 }
    );
  }
}
