import { NextResponse } from "next/server";
import { hasFdeDatabaseConfig, listFdeExhibitions } from "@/lib/fde-db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasFdeDatabaseConfig()) {
    return NextResponse.json({ data: [], source: "not_configured" });
  }

  try {
    return NextResponse.json({ data: await listFdeExhibitions(), source: "fde" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load exhibitions." },
      { status: 500 }
    );
  }
}
