import { NextResponse } from "next/server";
import { getCollectionFacets, getStreamManifest } from "@/lib/data";
import { getFdeCollectionFacets, hasFdeDatabaseConfig } from "@/lib/fde-db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (hasFdeDatabaseConfig()) {
    try {
      return NextResponse.json({ ...(await getFdeCollectionFacets()), source: "fde" });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load FDE facets." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ...getCollectionFacets(), source: getStreamManifest() ? "stream" : "json" });
}
