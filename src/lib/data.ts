import fs from "fs";
import path from "path";

export interface Artwork {
  id: string;
  source_id?: string;
  title: string;
  artist: string;
  year: number;
  movement: string;
  origin: string;
  medium: string;
  museum: string;
  image_url: string;
  image_url_3d?: string;
  image_url_hd?: string;
  dimensions: string;
  description: string;
  description_long: string;
  audio_narration: string;
  tags: string[];
  highlight: boolean;
  position_x?: number;
  position_y?: number;
  position_z?: number;
  rotation_y?: number;
  room_id?: number;
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
  artwork_positions?: Record<string, { x: number; y: number; z: number; rotY: number }>;
  dimensions?: { width: number; height: number; depth: number };
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

export function getArtworksPaginated(params: {
  page: number;
  limit: number;
  movement?: string | null;
  search?: string | null;
  roomId?: string | null;
}) {
  const { artworks } = getGalleryData();
  const { page, limit, movement, search, roomId } = params;

  let filtered = [...artworks];

  if (movement) {
    filtered = filtered.filter((a) => a.movement === movement);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.artist.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }
  if (roomId) {
    filtered = filtered.filter((a) => a.room_id === parseInt(roomId));
  }

  const total = filtered.length;
  const from = (page - 1) * limit;
  const to = from + limit;
  const data = filtered.slice(from, to).sort((a, b) => a.year - b.year);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function getRooms() {
  const { gallery, artworks } = getGalleryData();
  const roomSet = new Set<number>();
  for (const art of artworks) {
    if (art.room_id !== undefined && art.room_id !== null) {
      roomSet.add(art.room_id);
    }
  }
  const roomIds = Array.from(roomSet).sort((a, b) => a - b);

  return roomIds.map((rid) => ({
    id: `room-${rid}`,
    room_id: rid,
    movement: gallery.layout.find((l) =>
      l.artwork_ids.some((aid) => {
        const art = artworks.find((a) => a.id === aid || a.source_id === aid);
        return art && (art.room_id === rid);
      })
    )?.movement || "Unknown",
    position: { x: (rid % 3) * 30, y: 0, z: Math.floor(rid / 3) * 22 },
    width: 30,
    depth: 20,
  }));
}
