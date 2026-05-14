import { notFound } from "next/navigation";
import ArtworkDetail from "@/components/ArtworkDetail";

export const dynamic = "force-dynamic";

export default async function ArtworkPage({
  params,
}: {
  params: { id: string };
}) {
  let artwork: any = null;

  try {
    // Try Supabase/API first (much faster than reading 52MB JSON)
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const res = await fetch(
      `${base}/api/artworks?limit=1&search=${encodeURIComponent(params.id)}`
    );
    const json = await res.json();
    artwork = (json.data || []).find(
      (a: any) => a.id === params.id || a.source_id === params.id
    );

    // Fallback: read from JSON if API fails
    if (!artwork) {
      const { getGalleryData } = await import("@/lib/data");
      const { artworks } = getGalleryData();
      artwork = artworks.find((a: any) => a.id === params.id);
    }
  } catch {
    const { getGalleryData } = await import("@/lib/data");
    const { artworks } = getGalleryData();
    artwork = artworks.find((a: any) => a.id === params.id);
  }

  if (!artwork) notFound();
  return <ArtworkDetail artwork={artwork} />;
}
