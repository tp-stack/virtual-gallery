import pg from "pg";
import { describeDatabaseError, getFdeConfig, quoteIdentifier } from "./lib/fde-env.mjs";

const { Pool } = pg;
let pool;

const ids = {
  exhibition: "10000000-0000-4000-8000-000000000001",
  room: "10000000-0000-4000-8000-000000000002",
  wall: "10000000-0000-4000-8000-000000000003",
  artistOne: "10000000-0000-4000-8000-000000000004",
  artistTwo: "10000000-0000-4000-8000-000000000005",
  artworkOne: "10000000-0000-4000-8000-000000000006",
  artworkTwo: "10000000-0000-4000-8000-000000000007",
  artworkThree: "10000000-0000-4000-8000-000000000008",
  placementOne: "10000000-0000-4000-8000-000000000009",
  placementTwo: "10000000-0000-4000-8000-000000000010",
  placementThree: "10000000-0000-4000-8000-000000000011",
};

try {
  const { connectionString, schema } = getFdeConfig();
  pool = new Pool({ connectionString, application_name: "virtual-gallery-seed" });
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${quoteIdentifier(schema)}, public`);
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO artists (id, display_name, birth_year, nationality, biography, metadata)
        VALUES
          ($1, 'Ada Meridian', 1988, 'Italian', 'Digital installation artist focused on navigable memory spaces.', '{"seed": true}'::jsonb),
          ($2, 'Noor Vale', 1979, 'Moroccan', 'Media artist working with archival light, video, and spatial sound.', '{"seed": true}'::jsonb)
        ON CONFLICT (id) DO NOTHING
      `,
      [ids.artistOne, ids.artistTwo]
    );

    await client.query(
      `
        INSERT INTO exhibitions (id, title, subtitle, description, start_date, status, metadata)
        VALUES ($1, 'Future Virtual Gallery Seed Exhibition', 'FDE integration validation', 'A small private seed exhibition for validating the Virtual Gallery relational model.', current_date, 'draft', '{"seed": true}'::jsonb)
        ON CONFLICT (id) DO NOTHING
      `,
      [ids.exhibition]
    );

    await client.query(
      `
        INSERT INTO gallery_rooms (id, exhibition_id, name, room_type, sort_order, metadata)
        VALUES ($1, $2, 'Orientation Room', 'intro', 1, '{"seed": true}'::jsonb)
        ON CONFLICT (id) DO NOTHING
      `,
      [ids.room, ids.exhibition]
    );

    await client.query(
      `
        INSERT INTO gallery_walls (id, room_id, name, wall_index, metadata)
        VALUES ($1, $2, 'North Wall', 1, '{"seed": true}'::jsonb)
        ON CONFLICT (id) DO NOTHING
      `,
      [ids.wall, ids.room]
    );

    await client.query(
      `
        INSERT INTO artworks (id, artist_id, title, year_text, medium, dimensions, description, image_object_path, thumbnail_object_path, metadata)
        VALUES
          ($1, $4, 'Threshold Study', '2026', 'Generative image', 'Variable dimensions', 'A seed artwork representing the entry threshold of the virtual gallery.', 'virtual-gallery/seed/threshold-study.png', 'virtual-gallery/seed/thumbs/threshold-study.png', '{"seed": true}'::jsonb),
          ($2, $5, 'Archive Light Field', '2025', 'Video still', '16:9', 'A seed media work for testing object storage references without storing heavy files in Postgres.', 'virtual-gallery/seed/archive-light-field.mp4', 'virtual-gallery/seed/thumbs/archive-light-field.png', '{"seed": true}'::jsonb),
          ($3, $4, 'Room Coordinates', '2026', '3D reference', 'GLB scene reference', 'A seed work for validating placement coordinates and future 3D media references.', 'virtual-gallery/seed/room-coordinates.glb', 'virtual-gallery/seed/thumbs/room-coordinates.png', '{"seed": true}'::jsonb)
        ON CONFLICT (id) DO NOTHING
      `,
      [ids.artworkOne, ids.artworkTwo, ids.artworkThree, ids.artistOne, ids.artistTwo]
    );

    await client.query(
      `
        INSERT INTO artwork_placements (
          id, artwork_id, exhibition_id, room_id, wall_id,
          position_x, position_y, position_z, rotation_y, scale,
          label_text, sort_order, metadata
        )
        VALUES
          ($1, $4, $7, $8, $9, -4.5, 1.6, -8.8, 0, 1.0, 'Threshold Study', 1, '{"seed": true}'::jsonb),
          ($2, $5, $7, $8, $9, 0, 1.6, -8.8, 0, 1.0, 'Archive Light Field', 2, '{"seed": true}'::jsonb),
          ($3, $6, $7, $8, $9, 4.5, 1.6, -8.8, 0, 1.0, 'Room Coordinates', 3, '{"seed": true}'::jsonb)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        ids.placementOne,
        ids.placementTwo,
        ids.placementThree,
        ids.artworkOne,
        ids.artworkTwo,
        ids.artworkThree,
        ids.exhibition,
        ids.room,
        ids.wall,
      ]
    );

    await client.query("COMMIT");

    const summary = await client.query(`
      SELECT
        (SELECT count(*)::int FROM exhibitions) AS exhibitions,
        (SELECT count(*)::int FROM gallery_rooms) AS rooms,
        (SELECT count(*)::int FROM gallery_walls) AS walls,
        (SELECT count(*)::int FROM artists) AS artists,
        (SELECT count(*)::int FROM artworks) AS artworks,
        (SELECT count(*)::int FROM artwork_placements) AS placements
    `);

    console.log(JSON.stringify({ status: "ok", schema, ...summary.rows[0] }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error(JSON.stringify({ status: "error", error: describeDatabaseError(error) }, null, 2));
  process.exitCode = 1;
} finally {
  await pool?.end();
}
