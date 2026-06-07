import { NextResponse } from "next/server";
import { getFdeHealth, hasFdeDatabaseConfig } from "@/lib/fde-db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasFdeDatabaseConfig()) {
    return NextResponse.json(
      { status: "missing_config", error: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  try {
    return NextResponse.json(await getFdeHealth());
  } catch (error) {
    return NextResponse.json(
      { status: "error", error: error instanceof Error ? error.message : "Database health check failed." },
      { status: 500 }
    );
  }
}
