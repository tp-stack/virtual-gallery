import "server-only";

import { Pool, type QueryResult, type QueryResultRow } from "pg";

const VIRTUAL_GALLERY_SCHEMA = "app_virtual_gallery";

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
    SELECT id, display_name, birth_year, death_year, nationality, biography, metadata, created_at
    FROM artists
    ORDER BY display_name
  `);
  return result.rows;
}

export async function listFdeArtworks(params: {
  page: number;
  limit: number;
  search?: string | null;
  artist?: string | null;
  medium?: string | null;
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
    where.push(`(a.title ILIKE ${key} OR a.description ILIKE ${key} OR ar.display_name ILIKE ${key})`);
  }

  if (params.artist) {
    where.push(`ar.display_name ILIKE ${addValue(`%${params.artist}%`)}`);
  }

  if (params.medium) {
    where.push(`a.medium ILIKE ${addValue(`%${params.medium}%`)}`);
  }

  if (params.roomId) {
    where.push(`
      EXISTS (
        SELECT 1
        FROM artwork_placements ap
        WHERE ap.artwork_id = a.id
          AND ap.room_id::text = ${addValue(params.roomId)}
      )
    `);
  }

  const offset = (params.page - 1) * params.limit;
  const limitParam = addValue(params.limit);
  const offsetParam = addValue(offset);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const result = await fdeQuery<{
    id: string;
    artist_id: string | null;
    title: string;
    year_text: string | null;
    medium: string | null;
    dimensions: string | null;
    description: string | null;
    image_object_path: string | null;
    thumbnail_object_path: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    artist: string | null;
    total_count: string;
  }>(
    `
      SELECT
        a.id,
        a.artist_id,
        a.title,
        a.year_text,
        a.medium,
        a.dimensions,
        a.description,
        a.image_object_path,
        a.thumbnail_object_path,
        a.metadata,
        a.created_at,
        ar.display_name AS artist,
        count(*) OVER ()::text AS total_count
      FROM artworks a
      LEFT JOIN artists ar ON ar.id = a.artist_id
      ${whereSql}
      ORDER BY a.created_at DESC, a.title ASC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `,
    values
  );

  const total = result.rows.length ? Number(result.rows[0].total_count) : 0;
  return {
    data: result.rows.map(({ total_count, image_object_path, thumbnail_object_path, year_text, ...row }) => ({
      ...row,
      year: year_text,
      year_text,
      image_url: image_object_path || thumbnail_object_path || "",
      image_object_path,
      thumbnail_object_path,
    })),
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(total / params.limit),
  };
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
