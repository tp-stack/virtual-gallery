const https = require("https");

const SUPABASE_URL = "https://pkxfxuhrbosqloblttnr.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreGZ4dWhyYm9zcWxvYmx0dG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzA0MDUsImV4cCI6MjA4NjQwNjQwNX0.Dd8sMqzZkHjvyQ9owxI-cfflKTvDCGZKHJGXj2sTFCM";
const PROJECT_REF = "pkxfxuhrbosqloblttnr";

async function query(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const opts = {
      hostname: PROJECT_REF + ".supabase.co",
      path: "/rest/v1/rpc/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
        "Authorization": "Bearer " + ANON_KEY,
        "Content-Length": Buffer.byteLength(body),
      },
      rejectUnauthorized: false,
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // Test connection
  console.log("Testing connection...");
  const test = await query("SELECT 1 as ok");
  console.log("Test status:", test.status, test.body.slice(0, 200));

  if (test.status === 200 || test.status === 201) {
    // Run migration
    const fs = require("fs");
    const path = require("path");
    const sqlPath = path.join(__dirname, "..", "supabase", "migrations", "001_create_artworks.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("Running migration...");
    const mig = await query(sql);
    console.log("Migration status:", mig.status, mig.body.slice(0, 300));

    if (mig.status === 200 || mig.status === 201) {
      console.log("Migration successful!");

      // Upload artworks
      const jsonPath = path.join(__dirname, "..", "public", "data", "artworks.json");
      if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        const artworks = data.artworks || [];
        console.log(`Uploading ${artworks.length} artworks...`);

        const BATCH = 500;
        for (let i = 0; i < artworks.length; i += BATCH) {
          const batch = artworks.slice(i, i + BATCH);
          const rows = batch.map((a) => ({
            source_id: a.source_id || a.id,
            title: a.title || "",
            artist: a.artist || "",
            year: a.year || 0,
            movement: a.movement || "",
            origin: a.origin || "",
            medium: a.medium || "",
            museum: a.museum || "",
            image_url_3d: a.image_url_3d || a.image_url || "",
            image_url_hd: a.image_url_hd || a.image_url || "",
            dimensions: a.dimensions || "",
            description: a.description || "",
            description_long: a.description_long || "",
            audio_narration: a.audio_narration || "",
            tags: a.tags || [],
            highlight: a.highlight || false,
            position_x: a.position_x || null,
            position_y: a.position_y || 1.6,
            position_z: a.position_z || null,
            rotation_y: a.rotation_y || null,
            room_id: a.room_id || null,
            source_api: a.source_api || "",
          }));

          const ins = await query(
            `INSERT INTO artworks (source_id, title, artist, year, movement, origin, medium, museum, image_url_3d, image_url_hd, dimensions, description, description_long, audio_narration, tags, highlight, position_x, position_y, position_z, rotation_y, room_id, source_api) VALUES ` +
            rows.map((r) => `(${Object.values(r).map((v) => (typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : v === null ? "NULL" : v)).join(",")})`).join(",") +
            ` ON CONFLICT (source_id) DO UPDATE SET title = EXCLUDED.title, artist = EXCLUDED.artist, year = EXCLUDED.year, movement = EXCLUDED.movement, origin = EXCLUDED.origin, medium = EXCLUDED.medium, museum = EXCLUDED.museum, image_url_3d = EXCLUDED.image_url_3d, image_url_hd = EXCLUDED.image_url_hd, dimensions = EXCLUDED.dimensions, description = EXCLUDED.description, description_long = EXCLUDED.description_long, audio_narration = EXCLUDED.audio_narration, tags = EXCLUDED.tags, highlight = EXCLUDED.highlight, position_x = EXCLUDED.position_x, position_y = EXCLUDED.position_y, position_z = EXCLUDED.position_z, rotation_y = EXCLUDED.rotation_y, room_id = EXCLUDED.room_id, source_api = EXCLUDED.source_api`
          );
          console.log(`  Batch ${i / BATCH + 1}: ${rows.length} rows (${ins.status})`);
        }
        console.log("Upload complete!");
      } else {
        console.log("No artworks.json found");
      }
    } else {
      console.log("Migration failed");
    }
  } else {
    console.log("Connection test failed - anon key may not have table creation permissions");
    console.log("Need to either:");
    console.log("1. Create table manually in Supabase dashboard SQL editor");
    console.log("2. Or use a SUPABASE_ACCESS_TOKEN (service role)");
  }
}

main().catch(console.error);
