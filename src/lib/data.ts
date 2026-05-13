import fs from "fs";
import path from "path";

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  year: number;
  movement: string;
  origin: string;
  medium: string;
  museum: string;
  image_url: string;
  dimensions: string;
  description: string;
  description_long: string;
  audio_narration: string;
  tags: string[];
  highlight: boolean;
}

export interface GalleryLayoutItem {
  id: string;
  name: string;
  movement: string;
  artwork_ids: string[];
  artwork_placements?: {
    artwork_id: string;
    position: { x: number; y: number; z: number };
    rotationY: number;
    side: string;
  }[];
  style: Record<string, string>;
  dimensions?: { width: number; height: number; depth: number };
  doorway?: { width: number; height: number };
  position?: { x: number; y: number; z: number };
}

export interface Gallery {
  name: string;
  rooms: number;
  layout: GalleryLayoutItem[];
  featured_artwork: string;
}

export interface GalleryData {
  gallery: Gallery;
  artworks: Artwork[];
}

let cached: GalleryData | null = null;

export function getGalleryData(): GalleryData {
  if (cached) return cached;
  const filePath = path.join(process.cwd(), "public", "data", "artworks.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  cached = JSON.parse(raw);
  return cached!;
}
