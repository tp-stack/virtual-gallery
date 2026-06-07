import { NextResponse } from "next/server";
import { getCollectionFacets, getStreamManifest } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ...getCollectionFacets(), source: getStreamManifest() ? "stream" : "json" });
}
