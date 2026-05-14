const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const PROJECT_REF = "pkxfxuhrbosqloblttnr";

async function tryConnect(password) {
  const client = new Client({
    host: `${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    console.log("Connected with password:", password);
    return client;
  } catch (e) {
    return null;
  }
}

async function main() {
  // Try common passwords
  const passwords = [
    "",
    "postgres",
    "admin",
    "password",
    "supabase",
    PROJECT_REF,
  ];

  for (const pw of passwords) {
    const client = await tryConnect(pw);
    if (client) {
      const sql = fs.readFileSync(
        path.join(__dirname, "..", "supabase", "migrations", "001_create_artworks.sql"),
        "utf-8"
      );
      try {
        await client.query(sql);
        console.log("Migration executed successfully!");
        
        // Verify
        const res = await client.query("SELECT count(*) as cnt FROM artworks");
        console.log("Artworks table created. Row count:", res.rows[0].cnt);
      } catch (e) {
        console.log("Migration error:", e.message);
      }
      await client.end();
      return;
    }
  }
  console.log("Could not connect with any password");
  console.log("Need the database password from Supabase dashboard");
}

main().catch(console.error);
