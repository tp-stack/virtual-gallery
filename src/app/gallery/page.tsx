import { getGalleryData } from "@/lib/data";
import GalleryClient from "@/components/GalleryClient";

export default function GalleryPage() {
  const data = getGalleryData();

  const movements = data.artworks.reduce<{ movement: string; count: number }[]>((acc, art) => {
    const existing = acc.find((m) => m.movement === art.movement);
    if (existing) existing.count++;
    else acc.push({ movement: art.movement, count: 1 });
    return acc;
  }, []);

  movements.sort((a, b) => b.count - a.count);

  return <GalleryClient artworks={data.artworks} movements={movements} />;
}
