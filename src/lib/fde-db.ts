import "server-only";

import { Pool, type QueryResult, type QueryResultRow } from "pg";

const VIRTUAL_GALLERY_SCHEMA = "app_virtual_gallery";
const OPEN_ACCESS_TABLE = "open_access_artworks";
const ART_PER_ROOM = 10;
const ROOM_WIDTH = 30;
const ROOM_DEPTH = 20;
const ROOM_GAP = 2;

let pool: Pool | null = null;

function getConfiguredSchema() {
  return process.env.DATABASE_SCHEMA || VIRTUAL_GALLERY_SCHEMA;
}

function assertVirtualGallerySchema(schema: string) {
  if (schema !== VIRTUAL_GALLERY_SCHEMA) {
    throw new Error(`Refusing to use database schema "${schema}". Expected "${VIRTUAL_GALLERY_SCHEMA}".`);
  }
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function hasFdeDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}

export function getFdePool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      application_name: "virtual-gallery",
    });
  }

  return pool;
}

export async function fdeQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<QueryResult<T>> {
  const schema = getConfiguredSchema();
  assertVirtualGallerySchema(schema);

  const client = await getFdePool().connect();
  try {
    await client.query(`SET search_path TO ${quoteIdentifier(schema)}, public`);
    return await client.query<T>(text, values);
  } finally {
    client.release();
  }
}

export async function getFdeHealth() {
  const schema = getConfiguredSchema();
  assertVirtualGallerySchema(schema);

  const result = await fdeQuery<{
    database: string;
    schema: string;
    server_time: string;
    table_count: string;
  }>(
    `
      SELECT
        current_database() AS database,
        current_schema() AS schema,
        now()::text AS server_time,
        (
          SELECT count(*)::text
          FROM information_schema.tables
          WHERE table_schema = $1
            AND table_type = 'BASE TABLE'
        ) AS table_count
    `,
    [schema]
  );

  const row = result.rows[0];
  return {
    status: "ok",
    database: row.database,
    schema: row.schema,
    server_time: row.server_time,
    table_count: Number(row.table_count),
  };
}

export async function listFdeArtists() {
  const result = await fdeQuery(`
    SELECT
      md5(artist) AS id,
      artist AS display_name,
      NULL::int AS birth_year,
      NULL::int AS death_year,
      NULL::text AS nationality,
      NULL::text AS biography,
      jsonb_build_object('source', $1) AS metadata,
      NULL::timestamptz AS created_at
    FROM (
      SELECT artist, count(*) AS count
      FROM ${quoteIdentifier(OPEN_ACCESS_TABLE)}
      WHERE artist IS NOT NULL
        AND btrim(artist) <> ''
        AND lower(artist) <> 'unknown'
      GROUP BY artist
      ORDER BY count DESC, artist ASC
      LIMIT 500
    ) ranked
  `, [OPEN_ACCESS_TABLE]);
  if (result.rows.length > 0) return result.rows;

  const fallback = await fdeQuery(`
    SELECT id, display_name, birth_year, death_year, nationality, biography, metadata, created_at
    FROM artists
    ORDER BY display_name
  `);
  return fallback.rows;
}

export async function listFdeArtworks(params: {
  page: number;
  limit: number;
  search?: string | null;
  movement?: string | null;
  artist?: string | null;
  medium?: string | null;
  institution?: string | null;
  year_min?: number | null;
  year_max?: number | null;
  roomId?: string | null;
}) {
  const values: unknown[] = [];
  const where: string[] = [];

  function addValue(value: unknown) {
    values.push(value);
    return `$${values.length}`;
  }

  if (params.search) {
    const key = addValue(`%${params.search}%`);
    where.push(`(title ILIKE ${key} OR description ILIKE ${key} OR artist ILIKE ${key} OR museum ILIKE ${key})`);
  }

  if (params.movement) {
    where.push(`movement = ${addValue(params.movement)}`);
  }

  if (params.artist) {
    where.push(`artist ILIKE ${addValue(`%${params.artist}%`)}`);
  }

  if (params.medium) {
    where.push(`medium ILIKE ${addValue(`%${params.medium}%`)}`);
  }

  if (params.institution) {
    where.push(`museum ILIKE ${addValue(`%${params.institution}%`)}`);
  }

  if (params.year_min) {
    where.push(`year >= ${addValue(params.year_min)}`);
  }

  if (params.year_max) {
    where.push(`year <= ${addValue(params.year_max)}`);
  }

  if (params.roomId) {
    where.push(`room_id::text = ${addValue(params.roomId)}`);
  }

  const offset = (params.page - 1) * params.limit;
  const limitParam = addValue(params.limit);
  const offsetParam = addValue(offset);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const result = await fdeQuery<{
    id: string;
    source_id: string | null;
    title: string;
    artist: string | null;
    year: number | null;
    movement: string | null;
    origin: string | null;
    medium: string | null;
    museum: string | null;
    image_url: string | null;
    image_url_3d: string | null;
    image_url_hd: string | null;
    dimensions: string | null;
    description: string | null;
    description_long: string | null;
    audio_narration: string | null;
    tags: string[];
    highlight: boolean;
    position_x: number | null;
    position_y: number | null;
    position_z: number | null;
    rotation_y: number | null;
    room_id: number | null;
    source_api: string | null;
    created_at: string;
    total_count: string;
  }>(
    `
      SELECT
        id,
        source_id,
        title,
        artist,
        year,
        movement,
        origin,
        medium,
        museum,
        image_url,
        image_url_3d,
        image_url_hd,
        dimensions,
        description,
        description_long,
        audio_narration,
        tags,
        highlight,
        position_x,
        position_y,
        position_z,
        rotation_y,
        room_id,
        source_api,
        created_at,
        count(*) OVER ()::text AS total_count
      FROM ${quoteIdentifier(OPEN_ACCESS_TABLE)}
      ${whereSql}
      ORDER BY room_id ASC NULLS LAST, position_z ASC NULLS LAST, created_at DESC, title ASC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `,
    values
  );

  const total = result.rows.length ? Number(result.rows[0].total_count) : 0;
  return {
    data: result.rows.map(({ total_count, ...row }) => ({
      ...row,
      year: row.year || 0,
      year_text: row.year ? String(row.year) : "",
      image_url: row.image_url || row.image_url_3d || row.image_url_hd || "",
      image_url_3d: row.image_url_3d || row.image_url || row.image_url_hd || "",
      image_url_hd: row.image_url_hd || row.image_url_3d || row.image_url || "",
    })),
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(total / params.limit),
  };
}

export async function getFdeCollectionFacets() {
  const [movements, artists, mediums, institutions, years, total] = await Promise.all([
    fdeQuery(`
      SELECT movement, count(*)::int AS count
      FROM ${quoteIdentifier(OPEN_ACCESS_TABLE)}
      WHERE movement IS NOT NULL AND btrim(movement) <> ''
      GROUP BY movement
      ORDER BY count DESC, movement ASC
      LIMIT 80
    `),
    fdeQuery(`
      SELECT artist, count(*)::int AS count
      FROM ${quoteIdentifier(OPEN_ACCESS_TABLE)}
      WHERE artist IS NOT NULL AND btrim(artist) <> '' AND lower(artist) <> 'unknown'
      GROUP BY artist
      ORDER BY count DESC, artist ASC
      LIMIT 120
    `),
    fdeQuery(`
      SELECT medium, count(*)::int AS count
      FROM ${quoteIdentifier(OPEN_ACCESS_TABLE)}
      WHERE medium IS NOT NULL AND btrim(medium) <> ''
      GROUP BY medium
      ORDER BY count DESC, medium ASC
      LIMIT 80
    `),
    fdeQuery(`
      SELECT museum AS institution, count(*)::int AS count
      FROM ${quoteIdentifier(OPEN_ACCESS_TABLE)}
      WHERE museum IS NOT NULL AND btrim(museum) <> ''
      GROUP BY museum
      ORDER BY count DESC, museum ASC
      LIMIT 120
    `),
    fdeQuery(`
      SELECT min(NULLIF(year, 0))::int AS min, max(NULLIF(year, 0))::int AS max
      FROM ${quoteIdentifier(OPEN_ACCESS_TABLE)}
    `),
    fdeQuery(`SELECT count(*)::int AS total FROM ${quoteIdentifier(OPEN_ACCESS_TABLE)}`),
  ]);

  return {
    movements: movements.rows,
    artists: artists.rows,
    mediums: mediums.rows,
    institutions: institutions.rows,
    yearRange: {
      min: years.rows[0]?.min || 0,
      max: years.rows[0]?.max || 0,
    },
    total: total.rows[0]?.total || 0,
  };
}

export async function getFdeGalleryRooms(limit = 120) {
  const result = await fdeQuery<{
    max_room_id: string | null;
    count: string;
  }>(`
    SELECT max(room_id)::text AS max_room_id, count(*)::text AS count
    FROM ${quoteIdentifier(OPEN_ACCESS_TABLE)}
    WHERE room_id IS NOT NULL
  `);
  const row = result.rows[0];
  const totalRooms = row?.max_room_id ? Number(row.max_room_id) + 1 : Math.ceil(Number(row?.count || 0) / ART_PER_ROOM);
  const displayedRooms = Math.min(totalRooms, limit);

  return {
    rooms: Array.from({ length: displayedRooms }, (_, roomId) => ({
      id: `room-${roomId}`,
      room_id: roomId,
      name: `Gallery ${roomId + 1}`,
      movement: "Open Access Collection",
      position: { x: 0, y: 0, z: roomId * (ROOM_DEPTH + ROOM_GAP) },
      width: ROOM_WIDTH,
      depth: ROOM_DEPTH,
    })),
    total_rooms: totalRooms,
    displayed_rooms: displayedRooms,
    dimensions: { width: ROOM_WIDTH, height: 5, depth: ROOM_DEPTH },
  };
}

export async function listFdeRoomArtworks(roomId: number, limit = 100) {
  return listFdeArtworks({ page: 1, limit, roomId: String(roomId) });
}

export async function listFdeExhibitions() {
  const result = await fdeQuery(`
    SELECT id, title, subtitle, description, start_date, end_date, status, metadata, created_at
    FROM exhibitions
    ORDER BY created_at DESC, title ASC
  `);
  return result.rows;
}

export async function getFdeExhibition(id: string) {
  const result = await fdeQuery(
    `
      SELECT id, title, subtitle, description, start_date, end_date, status, metadata, created_at
      FROM exhibitions
      WHERE id = $1
    `,
    [id]
  );
  return result.rows[0] || null;
}

export async function listFdeExhibitionRooms(exhibitionId: string) {
  const result = await fdeQuery(
    `
      SELECT id, exhibition_id, name, room_type, sort_order, metadata, created_at
      FROM gallery_rooms
      WHERE exhibition_id = $1
      ORDER BY sort_order, name
    `,
    [exhibitionId]
  );
  return result.rows;
}

export async function listFdeExhibitionPlacements(exhibitionId: string) {
  const result = await fdeQuery(
    `
      SELECT
        ap.id,
        ap.artwork_id,
        ap.exhibition_id,
        ap.room_id,
        ap.wall_id,
        ap.position_x,
        ap.position_y,
        ap.position_z,
        ap.rotation_y,
        ap.scale,
        ap.label_text,
        ap.sort_order,
        ap.metadata,
        ap.created_at,
        a.title AS artwork_title,
        ar.display_name AS artist_display_name,
        a.image_object_path,
        a.thumbnail_object_path
      FROM artwork_placements ap
      JOIN artworks a ON a.id = ap.artwork_id
      LEFT JOIN artists ar ON ar.id = a.artist_id
      WHERE ap.exhibition_id = $1
      ORDER BY ap.sort_order, ap.created_at
    `,
    [exhibitionId]
  );
  return result.rows;
}
