import { notFound } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import ArtworkDetail from "@/components/ArtworkDetail";
import { getGalleryData } from "@/lib/data";

export async function generateStaticParams() {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("artworks")
        .select("source_id")
        .limit(200);

      if (data && data.length > 0) {
        return data.map((art: any) => ({ id: art.source_id }));
      }
    } catch {}
  }

  const { artworks } = getGalleryData();
  return artworks.map((art: any) => ({ id: art.id }));
}

export default async function ArtworkPage({
  params,
}: {
  params: { id: string };
}) {
  let artwork: any = null;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("artworks")
        .select("*")
        .eq("source_id", params.id)
        .single();
      if (data) artwork = data;
    } catch {}
  }

  if (!artwork) {
    const { artworks } = getGalleryData();
    artwork = artworks.find((a: any) => a.id === params.id);
  }

  if (!artwork) notFound();

  return <ArtworkDetail artwork={artwork} />;
}
