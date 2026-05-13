import { getGalleryData } from "@/lib/data";
import HomeClient from "@/components/HomeClient";

export default function HomePage() {
  const data = getGalleryData();
  return <HomeClient artworks={data.artworks} gallery={data.gallery} />;
}
