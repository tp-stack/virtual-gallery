import { getGalleryData } from "@/lib/data";
import TourClient from "./TourClient";

export default function TourPage() {
  const data = getGalleryData();
  return <TourClient artworks={data.artworks} gallery={data.gallery} />;
}
