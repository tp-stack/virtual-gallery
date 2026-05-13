import { notFound } from "next/navigation";
import { getGalleryData } from "@/lib/data";
import ArtworkDetail from "@/components/ArtworkDetail";

export function generateStaticParams() {
  const { artworks } = getGalleryData();
  return artworks.map((art) => ({ id: art.id }));
}

export default function ArtworkPage({ params }: { params: { id: string } }) {
  const { artworks } = getGalleryData();
  const artwork = artworks.find((a) => a.id === params.id);
  if (!artwork) notFound();
  return <ArtworkDetail artwork={artwork} />;
}
