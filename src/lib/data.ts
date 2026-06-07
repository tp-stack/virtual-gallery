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
  room_id?: number;
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
let streamManifestCache: any | null | false = false;
let streamInstitutionMapCache: Record<string, { slug: string; institution: string }> | null = null;

const STREAM_DIR = path.join(process.cwd(), "public", "data", "artworks-stream");
const ROOM_WIDTH = 30;
const ROOM_DEPTH = 20;
const ROOM_GAP = 2;

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function getStreamManifest() {
  if (streamManifestCache !== false) return streamManifestCache;
  const filePath = path.join(STREAM_DIR, "manifest.json");
  if (!fs.existsSync(filePath)) {
    streamManifestCache = null;
    return null;
  }
  streamManifestCache = readJsonFile(filePath);
  return streamManifestCache;
}

function getStreamInstitutionMap(): Record<string, { slug: string; institution: string }> {
  if (streamInstitutionMapCache) return streamInstitutionMapCache;
  const filePath = path.join(STREAM_DIR, "institution-map.json");
  if (!fs.existsSync(filePath)) {
    streamInstitutionMapCache = {};
    return streamInstitutionMapCache;
  }
  streamInstitutionMapCache = readJsonFile<Record<string, { slug: string; institution: string }>>(filePath);
  return streamInstitutionMapCache;
}

function readStreamShard(shardIndex: number): Artwork[] {
  const filePath = path.join(STREAM_DIR, "shards", `${String(shardIndex).padStart(6, "0")}.json`);
  if (!fs.existsSync(filePath)) return [];
  return readJsonFile<Artwork[]>(filePath);
}

function findStreamInstitutionSlug(query: string) {
  const q = query.toLowerCase();
  const institutionMap = getStreamInstitutionMap();
  const exact = institutionMap[q];
  if (exact) return exact.slug;

  const manifest = getStreamManifest();
  const match = manifest?.facets?.institutions?.find((item: any) =>
    String(item.institution || "").toLowerCase().includes(q)
  );
  return match ? institutionMap[String(match.institution).toLowerCase()]?.slug : null;
}

function getStreamRowsByIndexes(indexes: number[], offset: number, limit: number, shardSize: number) {
  const requested = indexes.slice(offset, offset + limit);
  const byShard = new Map<number, number[]>();
  for (const rowIndex of requested) {
    const shardIndex = Math.floor(rowIndex / shardSize);
    if (!byShard.has(shardIndex)) byShard.set(shardIndex, []);
    byShard.get(shardIndex)!.push(rowIndex);
  }

  const rowsByIndex = new Map<number, Artwork>();
  for (const [shardIndex, rowIndexes] of Array.from(byShard.entries())) {
    const shard = readStreamShard(shardIndex);
    for (const rowIndex of rowIndexes) {
      const item = shard[rowIndex % shardSize];
      if (item) rowsByIndex.set(rowIndex, item);
    }
  }

  return requested.map((rowIndex) => rowsByIndex.get(rowIndex)).filter(Boolean) as Artwork[];
}

function hasOnlyStreamSupportedFilters(params: {
  movement?: string | null;
  search?: string | null;
  roomId?: string | null;
  artist?: string | null;
  medium?: string | null;
  institution?: string | null;
  year_min?: number | null;
  year_max?: number | null;
}) {
  return !params.movement && !params.search && !params.artist && !params.medium && !params.year_min && !params.year_max;
}

export function getGalleryData(): GalleryData {
  if (cached) return cached;
  const filePath = path.join(process.cwd(), "public", "data", "artworks.json");
  if (!fs.existsSync(filePath)) {
    cached = {
      gallery: {
        name: "Virtual Gallery",
        rooms: 0,
        layout: [],
        featured_artwork: "",
      },
      artworks: [],
    };
    return cached;
  }
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
  artist?: string | null;
  medium?: string | null;
  institution?: string | null;
  year_min?: number | null;
  year_max?: number | null;
}) {
  const stream = getStreamArtworksPaginated(params);
  if (stream) return stream;

  const { artworks } = getGalleryData();
  const { page, limit, movement, search, roomId, artist, medium, institution, year_min, year_max } = params;

  let filtered = [...artworks];

  if (movement) {
    filtered = filtered.filter((a) => a.movement === movement);
  }
  if (artist) {
    const q = artist.toLowerCase();
    filtered = filtered.filter((a) => a.artist.toLowerCase().includes(q));
  }
  if (medium) {
    const q = medium.toLowerCase();
    filtered = filtered.filter((a) => a.medium?.toLowerCase().includes(q));
  }
  if (institution) {
    const q = institution.toLowerCase();
    filtered = filtered.filter((a) => a.museum?.toLowerCase().includes(q));
  }
  if (year_min || year_max) {
    filtered = filtered.filter((a) => {
      if (!a.year) return false;
      if (year_min && a.year < year_min) return false;
      if (year_max && a.year > year_max) return false;
      return true;
    });
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.artist.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.museum.toLowerCase().includes(q)
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

export function getStreamArtworksPaginated(params: {
  page: number;
  limit: number;
  movement?: string | null;
  search?: string | null;
  roomId?: string | null;
  artist?: string | null;
  medium?: string | null;
  institution?: string | null;
  year_min?: number | null;
  year_max?: number | null;
}) {
  const manifest = getStreamManifest();
  if (!manifest || !hasOnlyStreamSupportedFilters(params)) return null;

  const page = Math.max(1, params.page);
  const limit = Math.max(1, params.limit);
  const from = (page - 1) * limit;
  const shardSize = manifest.shardSize || 1000;

  if (params.roomId) {
    const room = getStreamRoom(Number(params.roomId));
    const data = room.slice(from, from + limit);
    return { data, total: room.length, page, limit, totalPages: Math.ceil(room.length / limit) };
  }

  if (params.institution) {
    const slug = findStreamInstitutionSlug(params.institution);
    if (!slug) return { data: [], total: 0, page, limit, totalPages: 0 };
    const filePath = path.join(STREAM_DIR, "institutions", `${slug}.json`);
    if (!fs.existsSync(filePath)) return { data: [], total: 0, page, limit, totalPages: 0 };
    const indexes = readJsonFile<number[]>(filePath);
    return {
      data: getStreamRowsByIndexes(indexes, from, limit, shardSize),
      total: indexes.length,
      page,
      limit,
      totalPages: Math.ceil(indexes.length / limit),
    };
  }

  const startShard = Math.floor(from / shardSize);
  const end = from + limit;
  const endShard = Math.floor((end - 1) / shardSize);
  const rows: Artwork[] = [];
  for (let shardIndex = startShard; shardIndex <= endShard; shardIndex++) {
    rows.push(...readStreamShard(shardIndex));
  }

  return {
    data: rows.slice(from % shardSize, from % shardSize + limit),
    total: manifest.total,
    page,
    limit,
    totalPages: Math.ceil(manifest.total / limit),
  };
}

export function getCollectionFacets() {
  const manifest = getStreamManifest();
  if (manifest?.facets) {
    return {
      ...manifest.facets,
      yearRange: manifest.yearRange || { min: 0, max: 0 },
      total: manifest.total || 0,
    };
  }

  const { artworks } = getGalleryData();
  const movementMap = new Map<string, number>();
  const artistMap = new Map<string, number>();
  const mediumMap = new Map<string, number>();
  const institutionMap = new Map<string, number>();
  let yMin = Infinity;
  let yMax = -Infinity;

  for (const art of artworks) {
    if (art.movement) movementMap.set(art.movement, (movementMap.get(art.movement) || 0) + 1);
    if (art.artist && art.artist !== "Unknown") artistMap.set(art.artist, (artistMap.get(art.artist) || 0) + 1);
    if (art.medium) mediumMap.set(art.medium, (mediumMap.get(art.medium) || 0) + 1);
    if (art.museum) institutionMap.set(art.museum, (institutionMap.get(art.museum) || 0) + 1);
    if (art.year && art.year > 0) {
      if (art.year < yMin) yMin = art.year;
      if (art.year > yMax) yMax = art.year;
    }
  }

  const toSortedFacet = (map: Map<string, number>, key: string) =>
    Array.from(map.entries())
      .map(([value, count]) => ({ [key]: value, count }))
      .sort((a, b) => Number(b.count) - Number(a.count));

  return {
    movements: toSortedFacet(movementMap, "movement"),
    artists: toSortedFacet(artistMap, "artist"),
    mediums: toSortedFacet(mediumMap, "medium"),
    institutions: toSortedFacet(institutionMap, "institution"),
    yearRange: {
      min: yMin === Infinity ? 0 : yMin,
      max: yMax === -Infinity ? 0 : yMax,
    },
    total: artworks.length,
  };
}

export function getStreamRooms(limit = 1000) {
  const manifest = getStreamManifest();
  if (!manifest) return null;
  const rooms = Math.min(Number(manifest.rooms) || 0, limit);
  return Array.from({ length: rooms }, (_, rid) => ({
    id: `room-${rid}`,
    room_id: rid,
    name: `Gallery ${rid + 1}`,
    movement: "Open Access Collection",
    position: { x: 0, y: 0, z: rid * (ROOM_DEPTH + ROOM_GAP) },
    width: ROOM_WIDTH,
    depth: ROOM_DEPTH,
  }));
}

export function getStreamRoom(roomId: number) {
  const manifest = getStreamManifest();
  if (!manifest || !Number.isFinite(roomId) || roomId < 0) return [];
  const artPerRoom = manifest.artPerRoom || 10;
  const shardSize = manifest.shardSize || 1000;
  const from = roomId * artPerRoom;
  const to = Math.min(from + artPerRoom, manifest.total);
  if (from >= manifest.total) return [];
  const rows: Artwork[] = [];
  for (let index = from; index < to; index++) {
    const shard = readStreamShard(Math.floor(index / shardSize));
    const art = shard[index % shardSize];
    if (art) rows.push(art);
  }
  return rows;
}

export function getRooms() {
  const streamRooms = getStreamRooms();
  if (streamRooms) return streamRooms;

  const { gallery, artworks } = getGalleryData();
  const roomSet = new Set<number>();
  for (const art of artworks) {
    if (art.room_id !== undefined && art.room_id !== null) {
      roomSet.add(art.room_id);
    }
  }
  const roomIds = Array.from(roomSet).sort((a, b) => a - b);
  const layoutByRoom = new Map<number, GalleryLayoutItem>();
  for (const item of gallery.layout || []) {
    const id = item.room_id ?? Number(String(item.id || "").replace("room-", ""));
    if (Number.isFinite(id)) layoutByRoom.set(id, item);
  }

  return roomIds.map((rid) => {
    const layout = layoutByRoom.get(rid);
    return {
      id: `room-${rid}`,
      room_id: rid,
      name: layout?.name || `Gallery ${rid + 1}`,
      movement: layout?.movement || "Unknown",
      position: layout?.position || { x: 0, y: 0, z: rid * 22 },
      width: layout?.dimensions?.width || 30,
      depth: layout?.dimensions?.depth || 20,
    };
  });
}
