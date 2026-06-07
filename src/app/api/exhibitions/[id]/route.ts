import { NextResponse } from "next/server";
import { getFdeExhibition, hasFdeDatabaseConfig } from "@/lib/fde-db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!hasFdeDatabaseConfig()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  try {
    const exhibition = await getFdeExhibition(params.id);
    if (!exhibition) {
      return NextResponse.json({ error: "Exhibition not found." }, { status: 404 });
    }
    return NextResponse.json({ data: exhibition, source: "fde" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load exhibition." },
      { status: 500 }
    );
  }
}
