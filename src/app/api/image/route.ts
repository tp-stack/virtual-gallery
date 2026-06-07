import { NextRequest, NextResponse } from "next/server";
import { isAllowedArtworkImageUrl } from "@/lib/image";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const IMAGE_FETCH_TIMEOUT_MS = 5000;

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");

  if (!rawUrl || !isAllowedArtworkImageUrl(rawUrl)) {
    return NextResponse.json({ error: "Image URL is not allowed" }, { status: 400 });
  }

  let upstream: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
    upstream = await fetch(rawUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; VirtualGallery/1.0; +https://localhost)",
      },
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 24 },
    });
    clearTimeout(timeout);
  } catch {
    return NextResponse.json({ error: "Image fetch timed out" }, { status: 504 });
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Unable to fetch image" },
      { status: upstream.status === 404 ? 404 : 502 }
    );
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return NextResponse.json({ error: "URL did not return an image" }, { status: 415 });
  }

  const contentLength = Number(upstream.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image is too large" }, { status: 413 });
  }

  const image = await upstream.arrayBuffer();
  if (image.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image is too large" }, { status: 413 });
  }

  return new NextResponse(image, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
