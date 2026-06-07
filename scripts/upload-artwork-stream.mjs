import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, isAbsolute, join, resolve } from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import { createClient } from "@supabase/supabase-js";
import { createHash, createHmac } from "crypto";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const DEFAULT_INPUT = join(root, "public", "data", "artworks.ndjson");
const DEFAULT_STATE = join(root, "public", "data", "artwork-upload-state.json");
const DEFAULT_LOCAL_OUTPUT = join(root, "public", "data", "artwork-exports");
const DEFAULT_LOCAL_EXPORT = join(DEFAULT_LOCAL_OUTPUT, "latest");
const EUROPEANA_PDM = "http\\://creativecommons.org/publicdomain/mark/1.0/";
const EUROPEANA_CC0 = "http\\://creativecommons.org/publicdomain/zero/1.0/";
const ART_PER_ROOM = 10;
const ROOM_DEPTH = 20;
const ROOM_GAP = 2;
const { Client } = pg;

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function quoteIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function resolveProjectPath(value, fallback) {
  if (!value) return fallback;
  return isAbsolute(value) ? value : resolve(root, value);
}

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function getSupabaseConfig() {
  loadDotEnv(join(root, ".env.local"));
  loadDotEnv(join(root, ".env"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  const keyType = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ? "service" : "publishable";
  return { url, key, keyType };
}

function getPostgresConfig() {
  loadDotEnv(join(root, ".env.local"));
  loadDotEnv(join(root, ".env"));
  const candidates = [process.env.DATABASE_URL, process.env.POSTGRES_URL, process.env.SUPABASE_DB_URL]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => !/\[YOUR-PASSWORD\]|%5BYOUR-PASSWORD%5D|YOUR-PASSWORD/i.test(value));
  const connectionString = candidates[0] || "";
  if (!connectionString) throw new Error("Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL");
  if (/\[YOUR-PASSWORD\]|%5BYOUR-PASSWORD%5D|YOUR-PASSWORD/i.test(connectionString)) {
    throw new Error("Postgres connection string still contains [YOUR-PASSWORD]");
  }
  return { connectionString };
}

function loadState(statePath) {
  if (!existsSync(statePath)) return {};
  try {
    return JSON.parse(readFileSync(statePath, "utf-8"));
  } catch {
    return {};
  }
}

function saveState(statePath, state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify({ ...state, updated_at: new Date().toISOString() }, null, 2), "utf-8");
}

function pad(value) {
  return String(value).padStart(8, "0");
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function awsDate(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function encodeKeyPath(value) {
  return String(value)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function cleanText(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function truncate(value, length = 2000) {
  const text = cleanText(value);
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
}

function safeYear(value) {
  const match = String(value || "").match(/-?\d{3,4}/);
  return match ? Math.abs(Number(match[0])) : 0;
}

function rightsFiltersForSource(source) {
  if (source === "europeana-cc0") return [{ qf: EUROPEANA_CC0, name: "CC0" }];
  if (source === "europeana-open") {
    return [
      { qf: EUROPEANA_PDM, name: "Public Domain Mark" },
      { qf: EUROPEANA_CC0, name: "CC0" },
    ];
  }
  return [{ qf: EUROPEANA_PDM, name: "Public Domain Mark" }];
}

async function fetchJson(url, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "VirtualGallery/1.0 remote artwork harvest" },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.json();
    } catch (error) {
      lastError = error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000 * attempt));
    }
  }
  throw lastError || new Error(`Failed to fetch ${url}`);
}

function normalizeEuropeana(item, rightsName) {
  const image = item.edmPreview?.[0] || item.edmIsShownBy?.[0] || "";
  const title = item.title?.[0] || item.dcTitleLangAware?.en?.[0] || "";
  if (!image || !title || !String(image).startsWith("http")) return null;

  const creator =
    item.dcCreatorLangAware?.en?.[0] ||
    item.dcCreator?.find((value) => !String(value).startsWith("#")) ||
    "Unknown";
  const provider = item.dataProvider?.[0] || item.provider?.[0] || "Europeana";
  const rawId = String(item.id || `${provider}-${title}`).replace(/[^\w-]+/g, "-");
  const description = truncate(item.dcDescriptionLangAware?.en?.[0] || item.dcDescription?.[0] || "");

  return {
    source_id: `europeana-${rawId}`,
    id: `europeana-${rawId}`,
    title: cleanText(title, "Untitled"),
    artist: cleanText(creator, "Unknown"),
    year: safeYear(item.year?.[0]),
    movement: item.edmConceptPrefLabelLangAware?.en?.[0] || "Europeana Public Domain",
    origin: item.country?.[0] || "",
    medium: item.type || "IMAGE",
    museum: cleanText(provider, "Europeana"),
    image_url: image,
    image_url_3d: image,
    image_url_hd: image,
    dimensions: "",
    description: description || `${cleanText(title, "Untitled")} by ${cleanText(creator, "Unknown")}.`,
    description_long: description,
    audio_narration: `${cleanText(title, "Untitled")} is attributed to ${cleanText(creator, "Unknown")}.`,
    tags: [],
    highlight: false,
    source_api: "europeana",
    compliance: {
      public_domain: true,
      reason: `Europeana ${rightsName}`,
      jurisdiction: "global",
      confidence: 0.95,
    },
  };
}

function freetextContent(items, fallback = "") {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  return cleanText(items[0]?.content || items[0]?.label || fallback, fallback);
}

function normalizeMet(item) {
  const image = item.primaryImageSmall || item.primaryImage || "";
  if (!image || !item.title || !item.isPublicDomain) return null;
  return {
    source_id: `met-${item.objectID}`,
    id: `met-${item.objectID}`,
    title: cleanText(item.title, "Untitled"),
    artist: cleanText(item.artistDisplayName, "Unknown"),
    year: safeYear(item.objectDate || item.objectBeginDate),
    movement: item.department || "Met Collection",
    origin: item.culture || item.artistNationality || "",
    medium: item.medium || "",
    museum: "Metropolitan Museum of Art",
    image_url: image,
    image_url_3d: image,
    image_url_hd: item.primaryImage || image,
    dimensions: item.dimensions || "",
    description: item.creditLine || `${cleanText(item.title, "Untitled")} from the Metropolitan Museum of Art.`,
    description_long: item.creditLine || "",
    audio_narration: `${cleanText(item.title, "Untitled")} is attributed to ${cleanText(item.artistDisplayName, "Unknown")}.`,
    tags: item.tags?.map((tag) => tag.term).filter(Boolean) || [],
    highlight: false,
    source_api: "met",
  };
}

function normalizeAic(item) {
  if (!item.image_id || !item.title) return null;
  const image = `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`;
  return {
    source_id: `aic-${item.id}`,
    id: `aic-${item.id}`,
    title: cleanText(item.title, "Untitled"),
    artist: cleanText(item.artist_display, "Unknown").split("\n")[0],
    year: safeYear(item.date_display),
    movement: item.department_title || item.classification_title || "Art Institute of Chicago",
    origin: item.place_of_origin || "",
    medium: item.medium_display || "",
    museum: "Art Institute of Chicago",
    image_url: image,
    image_url_3d: `https://www.artic.edu/iiif/2/${item.image_id}/full/1200,/0/default.jpg`,
    image_url_hd: `https://www.artic.edu/iiif/2/${item.image_id}/full/2000,/0/default.jpg`,
    dimensions: item.dimensions || "",
    description: item.thumbnail?.alt_text || item.credit_line || "",
    description_long: item.credit_line || item.thumbnail?.alt_text || "",
    audio_narration: `${cleanText(item.title, "Untitled")} is attributed to ${cleanText(item.artist_display, "Unknown").split("\n")[0]}.`,
    tags: Array.isArray(item.category_titles) ? item.category_titles : [],
    highlight: false,
    source_api: "aic",
  };
}

function normalizeCleveland(item) {
  const image = item.images?.web?.url || item.images?.print?.url || item.images?.full?.url || "";
  if (!image || !item.title) return null;
  return {
    source_id: `cleveland-${item.id}`,
    id: `cleveland-${item.id}`,
    title: cleanText(item.title, "Untitled"),
    artist: item.creators?.[0]?.description || "Unknown",
    year: safeYear(item.creation_date),
    movement: Array.isArray(item.culture) ? item.culture.join(", ") : item.culture || "",
    origin: item.creditline || item.current_location || "",
    medium: item.technique || "",
    museum: "Cleveland Museum of Art",
    image_url: image,
    image_url_3d: image,
    image_url_hd: image,
    dimensions: item.measurements || "",
    description: item.description || item.wall_description || "",
    description_long: item.description || item.wall_description || "",
    audio_narration: `${cleanText(item.title, "Untitled")} is attributed to ${item.creators?.[0]?.description || "Unknown"}.`,
    tags: item.collections || [],
    highlight: false,
    source_api: "cleveland",
  };
}

function normalizeVam(item) {
  const thumb = item._images?._primary_thumbnail || "";
  if (!thumb) return null;
  const title = item._primaryTitle || item.objectType || "Untitled";
  const maker = item._primaryMaker?.name || "Unknown";
  const image = thumb.replace("/!100,100/", "/!800,800/");
  return {
    source_id: `vam-${item.systemNumber}`,
    id: `vam-${item.systemNumber}`,
    title: cleanText(title, "Untitled"),
    artist: cleanText(maker, "Unknown"),
    year: safeYear(item._primaryDate),
    movement: item._primaryPlace || "Victoria and Albert Museum",
    origin: item._primaryPlace || "",
    medium: item.objectType || "",
    museum: "Victoria and Albert Museum",
    image_url: image,
    image_url_3d: image,
    image_url_hd: thumb.replace("/!100,100/", "/!1600,1600/"),
    dimensions: "",
    description: item.accessionNumber || "",
    description_long: item.accessionNumber || "",
    audio_narration: `${cleanText(title, "Untitled")} is attributed to ${cleanText(maker, "Unknown")}.`,
    tags: [],
    highlight: false,
    source_api: "vam",
  };
}

function normalizeSmithsonian(row) {
  const descriptive = row.content?.descriptiveNonRepeating || {};
  const indexed = row.content?.indexedStructured || {};
  const freetext = row.content?.freetext || {};
  const media = descriptive.online_media?.media?.find((entry) => entry.type === "Images" && entry.usage?.access === "CC0");
  const image = media?.content || media?.resources?.find((resource) => /screen|high/i.test(resource.label || ""))?.url || "";
  const title = descriptive.title?.content || row.title || "";
  if (!image || !title) return null;
  const artist =
    indexed.name?.[0] ||
    freetextContent(freetext.name) ||
    freetextContent(freetext.artist) ||
    "Unknown";
  return {
    source_id: `smithsonian-${row.id}`,
    id: `smithsonian-${row.id}`,
    title: cleanText(title, "Untitled"),
    artist: cleanText(artist, "Unknown"),
    year: safeYear(indexed.date?.[0] || freetextContent(freetext.date)),
    movement: indexed.object_type?.[0] || freetextContent(freetext.objectType) || "Smithsonian Open Access",
    origin: indexed.place?.[0] || freetextContent(freetext.place),
    medium: freetextContent(freetext.physicalDescription) || indexed.object_type?.[0] || "",
    museum: descriptive.data_source || freetextContent(freetext.dataSource, "Smithsonian Institution"),
    image_url: image,
    image_url_3d: image,
    image_url_hd: media?.resources?.find((resource) => /high-resolution/i.test(resource.label || ""))?.url || image,
    dimensions: freetextContent(freetext.physicalDescription),
    description: freetextContent(freetext.notes) || descriptive.record_link || "",
    description_long: freetextContent(freetext.notes) || descriptive.record_link || "",
    audio_narration: `${cleanText(title, "Untitled")} is from ${descriptive.data_source || "the Smithsonian Institution"}.`,
    tags: [...(indexed.topic || []), ...(indexed.object_type || [])].slice(0, 12),
    highlight: false,
    source_api: "smithsonian",
  };
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function csvRecord(headers, line) {
  const values = parseCsvLine(line);
  const record = {};
  headers.forEach((header, index) => {
    record[header] = values[index] || "";
  });
  return record;
}

function normalizeNga(object, image) {
  const imageBase = image.iiifurl || "";
  const thumb = image.iiifthumburl || "";
  if (!imageBase || !object.title) return null;
  const artist = object.attribution || object.attributioninverted || "Unknown";
  return {
    source_id: `nga-${object.objectid}`,
    id: `nga-${object.objectid}`,
    title: cleanText(object.title, "Untitled"),
    artist: cleanText(artist, "Unknown"),
    year: safeYear(object.displaydate || object.beginyear),
    movement: object.classification || object.departmentabbr || "National Gallery of Art",
    origin: object.departmentabbr || "",
    medium: object.medium || object.subclassification || "",
    museum: "National Gallery of Art",
    image_url: thumb || `${imageBase}/full/843,/0/default.jpg`,
    image_url_3d: `${imageBase}/full/1200,/0/default.jpg`,
    image_url_hd: `${imageBase}/full/2000,/0/default.jpg`,
    dimensions: object.dimensions || "",
    description: image.assistivetext || object.creditline || "",
    description_long: [image.assistivetext, object.provenancetext, object.creditline].filter(Boolean).join(" "),
    audio_narration: `${cleanText(object.title, "Untitled")} is attributed to ${cleanText(artist, "Unknown")}.`,
    tags: [object.classification, object.subclassification, object.departmentabbr].filter(Boolean),
    highlight: false,
    source_api: "nga",
  };
}

function bestImageUrl(urls) {
  const values = Array.isArray(urls) ? urls.filter(Boolean) : [urls].filter(Boolean);
  return values[values.length - 1] || "";
}

function normalizeLoc(item) {
  const image = bestImageUrl(item.image_url);
  if (!image || !item.title || item.unrestricted !== true) return null;
  const artist =
    item.creator?.[0] ||
    item.contributor_names?.[0] ||
    item.contributor?.[0] ||
    item.name?.[0] ||
    "Unknown";
  const tags = [
    ...(Array.isArray(item.subject) ? item.subject : []),
    ...(Array.isArray(item.original_format) ? item.original_format : []),
  ].filter(Boolean);

  return {
    source_id: `loc-${sha256Hex(item.id || item.url || item.title).slice(0, 24)}`,
    id: `loc-${sha256Hex(item.id || item.url || item.title).slice(0, 24)}`,
    title: cleanText(item.title, "Untitled"),
    artist: cleanText(artist, "Unknown"),
    year: safeYear(item.date || item.created_published || item.timestamp),
    movement: item.partof?.[0] || item.collection?.[0] || "Library of Congress",
    origin: Array.isArray(item.location) ? item.location.slice(0, 3).join(", ") : item.location || "",
    medium: item.original_format?.[0] || item.type?.[0] || "Image",
    museum: "Library of Congress",
    image_url: image,
    image_url_3d: image,
    image_url_hd: image,
    dimensions: "",
    description: item.description?.[0] || item.rights_advisory || item.url || "",
    description_long: [item.description?.[0], item.rights_advisory, item.url].filter(Boolean).join(" "),
    audio_narration: `${cleanText(item.title, "Untitled")} is from the Library of Congress.`,
    tags: tags.slice(0, 12),
    highlight: false,
    source_api: "loc",
  };
}

function applyPlacement(artwork, index) {
  const roomId = Math.floor(index / ART_PER_ROOM);
  const roomPos = index % ART_PER_ROOM;
  const isLeft = roomPos % 2 === 0;
  const localZ = (20 / (ART_PER_ROOM + 1)) * (roomPos + 1);
  const roomZ = roomId * (ROOM_DEPTH + ROOM_GAP);
  return {
    ...artwork,
    room_id: roomId,
    position_x: isLeft ? 2 : 28,
    position_y: 1.6,
    position_z: Number((roomZ + localZ).toFixed(2)),
    rotation_y: Number((isLeft ? Math.PI / 2 : -Math.PI / 2).toFixed(2)),
  };
}

function toDbRow(artwork) {
  return {
    source_id: artwork.source_id || artwork.id,
    title: artwork.title || "Untitled",
    artist: artwork.artist || "Unknown",
    year: Number(artwork.year) || 0,
    movement: artwork.movement || "",
    origin: artwork.origin || "",
    medium: artwork.medium || "",
    museum: artwork.museum || "",
    image_url: artwork.image_url || artwork.image_url_3d || artwork.image_url_hd || "",
    image_url_3d: artwork.image_url_3d || artwork.image_url || artwork.image_url_hd || "",
    image_url_hd: artwork.image_url_hd || artwork.image_url_3d || artwork.image_url || "",
    dimensions: artwork.dimensions || "",
    description: artwork.description || "",
    description_long: artwork.description_long || artwork.description || "",
    audio_narration: artwork.audio_narration || "",
    tags: Array.isArray(artwork.tags) ? artwork.tags : [],
    highlight: Boolean(artwork.highlight),
    position_x: artwork.position_x ?? null,
    position_y: artwork.position_y ?? 1.6,
    position_z: artwork.position_z ?? null,
    rotation_y: artwork.rotation_y ?? null,
    room_id: artwork.room_id ?? null,
    source_api: artwork.source_api || "",
  };
}

const DB_COLUMNS = [
  "source_id",
  "title",
  "artist",
  "year",
  "movement",
  "origin",
  "medium",
  "museum",
  "image_url",
  "image_url_3d",
  "image_url_hd",
  "dimensions",
  "description",
  "description_long",
  "audio_narration",
  "tags",
  "highlight",
  "position_x",
  "position_y",
  "position_z",
  "rotation_y",
  "room_id",
  "source_api",
];

function dbRowValues(row) {
  return DB_COLUMNS.map((column) => row[column]);
}

async function createPostgresClient() {
  const { connectionString } = getPostgresConfig();
  const host = new URL(connectionString).hostname;
  const isLocalHost = host === "127.0.0.1" || host === "localhost" || host === "::1";
  const client = new Client({
    connectionString,
    ssl: isLocalHost ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    query_timeout: 60000,
    statement_timeout: 60000,
  });
  await client.connect();
  return client;
}

async function ensurePostgresSchema(client, tableName) {
  const table = quoteIdentifier(tableName);
  const indexPrefix = tableName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
  await client.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_id TEXT UNIQUE,
      title TEXT NOT NULL,
      artist TEXT,
      year INT,
      movement TEXT,
      origin TEXT,
      medium TEXT,
      museum TEXT,
      image_url TEXT,
      image_url_3d TEXT,
      image_url_hd TEXT,
      dimensions TEXT,
      description TEXT,
      description_long TEXT,
      audio_narration TEXT,
      tags TEXT[] DEFAULT '{}',
      highlight BOOLEAN DEFAULT FALSE,
      source_api TEXT,
      position_x FLOAT,
      position_y FLOAT DEFAULT 1.6,
      position_z FLOAT,
      rotation_y FLOAT,
      room_id INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`idx_${indexPrefix}_source_id`)} ON ${table}(source_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`idx_${indexPrefix}_room_id`)} ON ${table}(room_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`idx_${indexPrefix}_museum`)} ON ${table}(museum)`);
  await client.query(`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`idx_${indexPrefix}_source_api`)} ON ${table}(source_api)`);
}

async function upsertPostgresBatch(client, rows, tableName) {
  if (rows.length === 0) return;
  const table = quoteIdentifier(tableName);
  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const base = rowIndex * DB_COLUMNS.length;
    values.push(...dbRowValues(row));
    return `(${DB_COLUMNS.map((_, columnIndex) => `$${base + columnIndex + 1}`).join(",")})`;
  });
  const updates = DB_COLUMNS.filter((column) => column !== "source_id" && column !== "title")
    .map((column) => `${column}=EXCLUDED.${column}`)
    .join(",");
  await client.query(
    `
      INSERT INTO ${table} (${DB_COLUMNS.map(quoteIdentifier).join(",")})
      VALUES ${placeholders.join(",")}
      ON CONFLICT (source_id) DO UPDATE SET
        title=EXCLUDED.title,
        ${updates}
    `,
    values
  );
}

function createSupabaseClient() {
  const { url, key, keyType } = getSupabaseConfig();
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL and a Supabase key");
  return {
    client: createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(30000) }) },
    }),
    url,
    keyType,
  };
}

function explainSupabaseError(error, url, keyType) {
  const host = new URL(url).host;
  const message = error?.message || String(error);
  const compact = message.replace(/\s+/g, " ").trim();
  if (/fetch failed|getaddrinfo|ENOTFOUND|Could not resolve|EAI_AGAIN/i.test(message)) {
    return `${message} (cannot reach ${host}; check DNS/network/VPN before retrying, key=${keyType})`;
  }
  if (/521|Web server is down|Cloudflare/i.test(message)) {
    return `Supabase host ${host} returned Cloudflare/server error while uploading. Retry later or check the Supabase project status.`;
  }
  if (/connection to the database timed out|database timed out|timeout/i.test(message)) {
    return `Supabase project ${host} timed out while handling the upload. Retry later; if it persists, check project health or use a service key/object storage.`;
  }
  if (keyType !== "service" && /row-level security|permission|policy|unauthorized|403|401/i.test(message)) {
    return `${message} (publishable key cannot bypass RLS; set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY for bulk writes)`;
  }
  return compact.length > 600 ? `${compact.slice(0, 600)}...` : compact;
}

async function createBucketIfNeeded(client, bucket) {
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) throw new Error(`Storage bucket list failed: ${listError.message}`);
  if (buckets?.some((item) => item.name === bucket)) return;
  const { error } = await client.storage.createBucket(bucket, {
    public: false,
    allowedMimeTypes: ["application/x-ndjson", "application/json"],
  });
  if (error) throw new Error(`Storage bucket create failed: ${error.message}`);
}

async function uploadStorageObject(client, bucket, objectPath, body, contentType) {
  const { error } = await client.storage.from(bucket).upload(objectPath, body, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed for ${objectPath}: ${error.message}`);
}

async function uploadStorageExport({ input, statePath, bucket, prefix, chunkMb, limitRows, resume, createBucket }) {
  const { client, url, keyType } = createSupabaseClient();
  console.log(`[upload] target=supabase-storage host=${new URL(url).host} key=${keyType} bucket=${bucket} prefix=${prefix}`);
  if (createBucket) {
    try {
      await createBucketIfNeeded(client, bucket);
    } catch (error) {
      throw new Error(explainSupabaseError(error, url, keyType));
    }
  }

  const state = resume ? loadState(statePath) : {};
  const uploadedChunks = new Set(state.uploadedChunks || []);
  const chunkLimit = Math.max(1, chunkMb) * 1024 * 1024;
  const manifest = {
    target: "supabase-storage",
    bucket,
    prefix,
    input,
    chunks: [],
    rows: 0,
    bytes: 0,
    generated_at: new Date().toISOString(),
  };

  let chunkIndex = 0;
  let rowsInChunk = 0;
  let bytesInChunk = 0;
  let rowsTotal = 0;
  let bytesTotal = 0;
  let parts = [];

  async function flushChunk() {
    if (parts.length === 0) return;
    const objectPath = `${prefix}/chunks/${pad(chunkIndex)}.ndjson`;
    const bytes = bytesInChunk;
    const rows = rowsInChunk;

    if (!uploadedChunks.has(chunkIndex)) {
      try {
        await uploadStorageObject(client, bucket, objectPath, Buffer.concat(parts, bytes), "application/x-ndjson");
      } catch (error) {
        throw new Error(explainSupabaseError(error, url, keyType));
      }
      uploadedChunks.add(chunkIndex);
      console.log(`[upload] uploaded chunk ${chunkIndex} rows=${rows} bytes=${bytes}`);
    } else {
      console.log(`[upload] skipped uploaded chunk ${chunkIndex}`);
    }

    manifest.chunks.push({ index: chunkIndex, path: objectPath, rows, bytes });
    saveState(statePath, {
      target: "supabase-storage",
      bucket,
      prefix,
      uploadedChunks: Array.from(uploadedChunks),
      rows: rowsTotal,
      bytes: bytesTotal,
      lastChunk: chunkIndex,
    });

    chunkIndex++;
    rowsInChunk = 0;
    bytesInChunk = 0;
    parts = [];
  }

  const rl = readline.createInterface({ input: createReadStream(input), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const payload = Buffer.from(`${line}\n`);
    parts.push(payload);
    rowsInChunk++;
    bytesInChunk += payload.length;
    rowsTotal++;
    bytesTotal += payload.length;
    manifest.rows = rowsTotal;
    manifest.bytes = bytesTotal;
    if (bytesInChunk >= chunkLimit) await flushChunk();
    if (limitRows && rowsTotal >= limitRows) break;
  }
  await flushChunk();

  const manifestPath = `${prefix}/manifest.json`;
  try {
    await uploadStorageObject(client, bucket, manifestPath, Buffer.from(JSON.stringify(manifest, null, 2)), "application/json");
  } catch (error) {
    throw new Error(explainSupabaseError(error, url, keyType));
  }
  saveState(statePath, { target: "supabase-storage", bucket, prefix, uploadedChunks: Array.from(uploadedChunks), rows: rowsTotal, bytes: bytesTotal, complete: true });
  console.log(`[upload] complete storage export rows=${rowsTotal} bytes=${bytesTotal} manifest=${manifestPath}`);
}

async function writeLocalChunkExport({ input, output, statePath, chunkMb, limitRows, reset }) {
  if (reset && existsSync(output)) rmSync(output, { recursive: true, force: true });
  mkdirSync(join(output, "chunks"), { recursive: true });

  const chunkLimit = Math.max(1, chunkMb) * 1024 * 1024;
  const manifest = {
    target: "local-volume",
    input,
    output,
    chunks: [],
    rows: 0,
    bytes: 0,
    generated_at: new Date().toISOString(),
  };

  let chunkIndex = 0;
  let rowsInChunk = 0;
  let bytesInChunk = 0;
  let rowsTotal = 0;
  let bytesTotal = 0;
  let parts = [];

  function flushChunk() {
    if (parts.length === 0) return;
    const name = `${pad(chunkIndex)}.ndjson`;
    const chunkPath = join(output, "chunks", name);
    const bytes = bytesInChunk;
    const rows = rowsInChunk;
    writeFileSync(chunkPath, Buffer.concat(parts, bytes));
    manifest.chunks.push({ index: chunkIndex, path: `chunks/${name}`, rows, bytes });
    saveState(statePath, { target: "local-volume", output, rows: rowsTotal, bytes: bytesTotal, lastChunk: chunkIndex });
    console.log(`[upload] wrote local chunk ${chunkIndex} rows=${rows} bytes=${bytes}`);
    chunkIndex++;
    rowsInChunk = 0;
    bytesInChunk = 0;
    parts = [];
  }

  const rl = readline.createInterface({ input: createReadStream(input), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const payload = Buffer.from(`${line}\n`);
    parts.push(payload);
    rowsInChunk++;
    bytesInChunk += payload.length;
    rowsTotal++;
    bytesTotal += payload.length;
    manifest.rows = rowsTotal;
    manifest.bytes = bytesTotal;
    if (bytesInChunk >= chunkLimit) flushChunk();
    if (limitRows && rowsTotal >= limitRows) break;
  }
  flushChunk();

  writeFileSync(join(output, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
  saveState(statePath, { target: "local-volume", output, rows: rowsTotal, bytes: bytesTotal, complete: true });
  console.log(`[upload] complete local export rows=${rowsTotal} bytes=${bytesTotal} output=${output}`);
}

async function uploadSupabaseTable({ input, statePath, batchSize, limitRows, resume }) {
  const { client, url, keyType } = createSupabaseClient();
  console.log(`[upload] target=supabase-table host=${new URL(url).host} key=${keyType} batch=${batchSize}`);
  const state = resume ? loadState(statePath) : {};
  const skipRows = Number(state.rows || 0);
  let rows = 0;
  let uploaded = skipRows;
  let batch = [];

  async function flush() {
    if (batch.length === 0) return;
    const { error } = await client.from("artworks").upsert(batch, { onConflict: "source_id" });
    if (error) throw new Error(`Supabase table upsert failed: ${explainSupabaseError(error, url, keyType)}`);
    uploaded += batch.length;
    batch = [];
    saveState(statePath, { target: "supabase-table", rows: uploaded });
    console.log(`[upload] table rows=${uploaded}`);
  }

  const rl = readline.createInterface({ input: createReadStream(input), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    rows++;
    if (rows <= skipRows) continue;
    batch.push(toDbRow(JSON.parse(line)));
    if (batch.length >= batchSize) await flush();
    if (limitRows && uploaded + batch.length >= limitRows) break;
  }
  await flush();
  saveState(statePath, { target: "supabase-table", rows: uploaded, complete: !limitRows || uploaded >= limitRows });
  console.log(`[upload] complete table upload rows=${uploaded}`);
}

async function uploadPostgresTable({ input, statePath, batchSize, limitRows, resume, ensureSchema, tableName }) {
  const client = await createPostgresClient();
  try {
    if (ensureSchema) await ensurePostgresSchema(client, tableName);
    const state = resume ? loadState(statePath) : {};
    if (resume && state.complete && state.target === "postgres-table" && state.table === tableName) {
      console.log(`[upload] postgres table=${tableName} already complete rows=${Number(state.rows || 0)}`);
      return;
    }
    const skipRows = Number(state.rows || 0);
    let rows = 0;
    let uploaded = skipRows;
    let batch = [];

    async function flush() {
      if (batch.length === 0) return;
      await upsertPostgresBatch(client, batch, tableName);
      uploaded += batch.length;
      batch = [];
      saveState(statePath, { target: "postgres-table", table: tableName, rows: uploaded });
      console.log(`[upload] postgres rows=${uploaded}`);
    }

    console.log(`[upload] target=postgres-table table=${tableName} batch=${batchSize} resumeRows=${skipRows}`);
    const rl = readline.createInterface({ input: createReadStream(input), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      rows++;
      if (rows <= skipRows) continue;
      batch.push(toDbRow(JSON.parse(line)));
      if (batch.length >= batchSize) await flush();
      if (limitRows && uploaded + batch.length >= limitRows) break;
    }
    await flush();
    saveState(statePath, { target: "postgres-table", table: tableName, rows: uploaded, complete: !limitRows || uploaded >= limitRows });
    console.log(`[upload] complete postgres table upload rows=${uploaded}`);
  } finally {
    await client.end();
  }
}

async function harvestEuropeanaToPostgres({ statePath, batchSize, limitRows, source, resume, ensureSchema, tableName }) {
  const client = await createPostgresClient();
  try {
    if (ensureSchema) await ensurePostgresSchema(client, tableName);
    const state = resume ? loadState(statePath) : {};
    if (resume && state.complete && state.target === "europeana-postgres" && state.table === tableName) {
      console.log(`[upload] europeana postgres table=${tableName} already complete rows=${Number(state.rows || 0)}`);
      return;
    }
    const rightsFilters = rightsFiltersForSource(source);
    let rightsIndex = Number.isFinite(state.rightsIndex) ? state.rightsIndex : 0;
    let cursor = state.cursor || "*";
    let rowsTotal = Number(state.rows || 0);
    let rowIndex = rowsTotal;
    let batch = [];

    async function flush(nextCursor = cursor, extra = {}) {
      if (batch.length === 0) {
        saveState(statePath, { target: "europeana-postgres", table: tableName, source, rightsIndex, cursor: nextCursor, rows: rowsTotal, ...extra });
        return;
      }
      await upsertPostgresBatch(client, batch, tableName);
      rowsTotal += batch.length;
      batch = [];
      cursor = nextCursor;
      saveState(statePath, { target: "europeana-postgres", table: tableName, source, rightsIndex, cursor, rows: rowsTotal, ...extra });
      console.log(`[upload] europeana postgres rows=${rowsTotal}`);
    }

    console.log(`[upload] target=europeana-postgres table=${tableName} source=${source} batch=${batchSize} resumeRows=${rowsTotal}`);
    for (; rightsIndex < rightsFilters.length; rightsIndex++) {
      const rights = rightsFilters[rightsIndex];
      if (!cursor) cursor = "*";
      let consecutiveFailures = 0;
      while (cursor) {
        if (limitRows && rowsTotal + batch.length >= limitRows) {
          await flush(cursor, { complete: true });
          console.log(`[upload] stopped at requested row limit ${limitRows}`);
          return;
        }

        const params = new URLSearchParams({
          wskey: process.env.EUROPEANA_API_KEY || "baramboa",
          query: "*:*",
          media: "true",
          thumbnail: "true",
          rows: "100",
          cursor,
        });
        params.append("qf", `RIGHTS:${rights.qf}`);
        params.append("qf", "TYPE:IMAGE");

        let data;
        try {
          data = await fetchJson(`https://api.europeana.eu/record/v2/search.json?${params.toString()}`);
          consecutiveFailures = 0;
        } catch (error) {
          consecutiveFailures++;
          await flush(cursor, { last_error: error.message, consecutiveFailures });
          if (consecutiveFailures >= 20) {
            console.warn(`[upload] stopping after ${consecutiveFailures} page failures: ${error.message}`);
            return;
          }
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 5000 * Math.min(consecutiveFailures, 6)));
          continue;
        }
        if (!data.items?.length) break;

        for (const item of data.items) {
          if (limitRows && rowsTotal + batch.length >= limitRows) break;
          const normalized = normalizeEuropeana(item, rights.name);
          if (!normalized) continue;
          batch.push(toDbRow(applyPlacement(normalized, rowIndex++)));
          if (batch.length >= batchSize) await flush(data.nextCursor || "");
        }
        cursor = data.nextCursor || "";
      }
      cursor = "*";
    }
    await flush("", { complete: true });
    console.log(`[upload] complete europeana postgres harvest rows=${rowsTotal}`);
  } finally {
    await client.end();
  }
}

const PUBLIC_POSTGRES_SOURCES = ["met", "aic", "cleveland", "vam", "smithsonian", "nga", "loc"];

function sourceStatePath(statePath, sourceName) {
  if (!statePath || statePath === DEFAULT_STATE) {
    return join(root, "public", "data", `artwork-harvest-public-${sourceName}-state.json`);
  }
  return statePath.replace(/\.json$/i, `-${sourceName}.json`);
}

async function harvestPublicSourceToPostgres({ sourceName, statePath, batchSize, limitRows, resume, ensureSchema, tableName }) {
  const client = await createPostgresClient();
  try {
    if (ensureSchema) await ensurePostgresSchema(client, tableName);
    const state = resume ? loadState(statePath) : {};
    if (resume && state.complete && state.target === "public-postgres" && state.table === tableName && state.source === sourceName) {
      console.log(`[upload] public postgres source=${sourceName} table=${tableName} already complete rows=${Number(state.rows || 0)}`);
      return;
    }

    let rowsTotal = Number(state.rows || 0);
    let rowIndex = Number(state.rowIndex || 0);
    let batch = [];

    async function flush(extra = {}) {
      if (batch.length > 0) {
        await upsertPostgresBatch(client, batch, tableName);
        rowsTotal += batch.length;
        batch = [];
      }
      saveState(statePath, {
        target: "public-postgres",
        table: tableName,
        source: sourceName,
        rows: rowsTotal,
        rowIndex,
        ...extra,
      });
      console.log(`[upload] public postgres source=${sourceName} rows=${rowsTotal}`);
    }

    async function addArtwork(artwork, extra = {}) {
      if (!artwork) return;
      if (limitRows && rowsTotal + batch.length >= limitRows) return;
      batch.push(toDbRow(applyPlacement(artwork, rowIndex++)));
      if (batch.length >= batchSize) await flush(extra);
    }

    console.log(`[upload] target=public-postgres source=${sourceName} table=${tableName} batch=${batchSize} resumeRows=${rowsTotal}`);

    if (sourceName === "met") {
      const search = await fetchJson(
        "https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isPublicDomain=true&q=*"
      );
      const ids = search.objectIDs || [];
      let index = Number(state.index || 0);
      for (; index < ids.length; index++) {
        if (limitRows && rowsTotal + batch.length >= limitRows) break;
        try {
          const item = await fetchJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${ids[index]}`, 2);
          await addArtwork(normalizeMet(item), { index: index + 1, total: ids.length });
        } catch (error) {
          await flush({ index, total: ids.length, last_error: error.message });
        }
      }
      await flush({ index, total: ids.length, complete: index >= ids.length || Boolean(limitRows && rowsTotal >= limitRows) });
      return;
    }

    if (sourceName === "aic") {
      let page = Number(state.page || 1);
      let totalPages = Number(state.totalPages || 0);
      let consecutiveFailures = Number(state.consecutiveFailures || 0);
      while (!totalPages || page <= totalPages) {
        if (limitRows && rowsTotal + batch.length >= limitRows) break;
        const params = new URLSearchParams({
          limit: "100",
          page: String(page),
          fields:
            "id,title,artist_display,image_id,date_display,medium_display,department_title,classification_title,dimensions,credit_line,place_of_origin,category_titles,thumbnail",
        });
        params.set("query[term][is_public_domain]", "true");
        let data;
        try {
          data = await fetchJson(`https://api.artic.edu/api/v1/artworks/search?${params}`);
          consecutiveFailures = 0;
        } catch (error) {
          consecutiveFailures++;
          await flush({ page, totalPages, last_error: error.message, consecutiveFailures });
          if (consecutiveFailures >= 20) return;
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 5000 * Math.min(consecutiveFailures, 6)));
          continue;
        }
        totalPages = data.pagination?.total_pages || totalPages;
        if (!data.data?.length) break;
        for (const item of data.data) await addArtwork(normalizeAic(item), { page, totalPages });
        page++;
        await flush({ page, totalPages, consecutiveFailures });
      }
      await flush({ page, totalPages, complete: Boolean(totalPages && page > totalPages) || Boolean(limitRows && rowsTotal >= limitRows) });
      return;
    }

    if (sourceName === "cleveland") {
      let skip = Number(state.skip || 0);
      let total = Number(state.total || 0);
      let consecutiveFailures = Number(state.consecutiveFailures || 0);
      while (!total || skip < total) {
        if (limitRows && rowsTotal + batch.length >= limitRows) break;
        let data;
        try {
          data = await fetchJson(`https://openaccess-api.clevelandart.org/api/artworks?has_image=1&limit=100&skip=${skip}`);
          consecutiveFailures = 0;
        } catch (error) {
          consecutiveFailures++;
          await flush({ skip, total, last_error: error.message, consecutiveFailures });
          if (consecutiveFailures >= 20) return;
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 5000 * Math.min(consecutiveFailures, 6)));
          continue;
        }
        total = data.info?.total || total;
        if (!data.data?.length) break;
        for (const item of data.data) await addArtwork(normalizeCleveland(item), { skip, total });
        skip += data.data.length;
        await flush({ skip, total, consecutiveFailures });
      }
      await flush({ skip, total, complete: Boolean(total && skip >= total) || Boolean(limitRows && rowsTotal >= limitRows) });
      return;
    }

    if (sourceName === "vam") {
      let page = Number(state.page || 1);
      let pages = Number(state.pages || 0);
      let consecutiveFailures = Number(state.consecutiveFailures || 0);
      while (!pages || page <= pages) {
        if (limitRows && rowsTotal + batch.length >= limitRows) break;
        let data;
        try {
          data = await fetchJson(`https://api.vam.ac.uk/v2/objects/search?images_exists=true&page_size=100&page=${page}`);
          consecutiveFailures = 0;
        } catch (error) {
          consecutiveFailures++;
          await flush({ page, pages, last_error: error.message, consecutiveFailures });
          if (consecutiveFailures >= 20) return;
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 5000 * Math.min(consecutiveFailures, 6)));
          continue;
        }
        pages = data.info?.pages || pages;
        if (!data.records?.length) break;
        for (const item of data.records) await addArtwork(normalizeVam(item), { page, pages });
        page++;
        await flush({ page, pages, consecutiveFailures });
      }
      await flush({ page, pages, complete: Boolean(pages && page > pages) || Boolean(limitRows && rowsTotal >= limitRows) });
      return;
    }

    if (sourceName === "smithsonian") {
      let start = Number(state.start || 0);
      let total = Number(state.total || 0);
      let consecutiveFailures = Number(state.consecutiveFailures || 0);
      while (!total || start < total) {
        if (limitRows && rowsTotal + batch.length >= limitRows) break;
        const params = new URLSearchParams({
          api_key: process.env.SMITHSONIAN_API_KEY || "DEMO_KEY",
          q: "online_media_type:Images AND media_usage:CC0",
          rows: "100",
          start: String(start),
        });
        let data;
        try {
          data = await fetchJson(`https://api.si.edu/openaccess/api/v1.0/search?${params}`);
          consecutiveFailures = 0;
        } catch (error) {
          consecutiveFailures++;
          await flush({ start, total, last_error: error.message, consecutiveFailures });
          if (consecutiveFailures >= 20) return;
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 5000 * Math.min(consecutiveFailures, 6)));
          continue;
        }
        total = data.response?.rowCount || total;
        const rows = data.response?.rows || [];
        if (!rows.length) break;
        for (const item of rows) await addArtwork(normalizeSmithsonian(item), { start, total });
        start += rows.length;
        await flush({ start, total, consecutiveFailures });
      }
      await flush({ start, total, complete: Boolean(total && start >= total) || Boolean(limitRows && rowsTotal >= limitRows) });
      return;
    }

    if (sourceName === "nga") {
      const objectsUrl = "https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/objects.csv";
      const imagesUrl = "https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/published_images.csv";
      const [objectsText, imagesText] = await Promise.all([
        fetch(objectsUrl, { signal: AbortSignal.timeout(120000) }).then((response) => {
          if (!response.ok) throw new Error(`NGA objects.csv failed: ${response.status} ${response.statusText}`);
          return response.text();
        }),
        fetch(imagesUrl, { signal: AbortSignal.timeout(120000) }).then((response) => {
          if (!response.ok) throw new Error(`NGA published_images.csv failed: ${response.status} ${response.statusText}`);
          return response.text();
        }),
      ]);

      const imageLines = imagesText.split(/\r?\n/).filter(Boolean);
      const imageHeaders = parseCsvLine(imageLines.shift() || "");
      const imagesByObjectId = new Map();
      for (const line of imageLines) {
        const image = csvRecord(imageHeaders, line);
        if (image.openaccess !== "1" || !image.depictstmsobjectid || !image.iiifurl) continue;
        const existing = imagesByObjectId.get(image.depictstmsobjectid);
        if (!existing || image.viewtype === "primary") imagesByObjectId.set(image.depictstmsobjectid, image);
      }

      const objectLines = objectsText.split(/\r?\n/).filter(Boolean);
      const objectHeaders = parseCsvLine(objectLines.shift() || "");
      let index = Number(state.index || 0);
      for (; index < objectLines.length; index++) {
        if (limitRows && rowsTotal + batch.length >= limitRows) break;
        const object = csvRecord(objectHeaders, objectLines[index]);
        const image = imagesByObjectId.get(object.objectid);
        if (!image) continue;
        await addArtwork(normalizeNga(object, image), { index: index + 1, total: objectLines.length });
      }
      await flush({ index, total: objectLines.length, complete: index >= objectLines.length || Boolean(limitRows && rowsTotal >= limitRows) });
      return;
    }

    if (sourceName === "loc") {
      let page = Number(state.page || 1);
      let total = Number(state.total || 0);
      let consecutiveFailures = Number(state.consecutiveFailures || 0);
      while (!total || (page - 1) * 100 < total) {
        if (limitRows && rowsTotal + batch.length >= limitRows) break;
        const params = new URLSearchParams({
          fo: "json",
          c: "100",
          sp: String(page),
          at: "results,pagination",
        });
        params.set("fa", "online-format:image|access-restricted:false|original-format:photo, print, drawing");

        let data;
        try {
          data = await fetchJson(`https://www.loc.gov/search/?${params}`);
          consecutiveFailures = 0;
        } catch (error) {
          consecutiveFailures++;
          await flush({ page, total, last_error: error.message, consecutiveFailures });
          if (consecutiveFailures >= 20) return;
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 5000 * Math.min(consecutiveFailures, 6)));
          continue;
        }

        total = data.pagination?.total || total;
        const results = data.results || [];
        if (!results.length) break;
        for (const item of results) await addArtwork(normalizeLoc(item), { page, total });
        page++;
        await flush({ page, total, consecutiveFailures });
      }
      await flush({ page, total, complete: Boolean(total && (page - 1) * 100 >= total) || Boolean(limitRows && rowsTotal >= limitRows) });
      return;
    }

    throw new Error(`Unsupported public source: ${sourceName}`);
  } finally {
    await client.end();
  }
}

async function harvestPublicDatabasesToPostgres({ source, statePath, batchSize, limitRows, resume, ensureSchema, tableName }) {
  const sources = source === "all" ? PUBLIC_POSTGRES_SOURCES : source.split(",").map((value) => value.trim()).filter(Boolean);
  for (const sourceName of sources) {
    if (!PUBLIC_POSTGRES_SOURCES.includes(sourceName)) {
      throw new Error(`Unsupported --source ${sourceName}. Supported public sources: ${PUBLIC_POSTGRES_SOURCES.join(", ")}`);
    }
    await harvestPublicSourceToPostgres({
      sourceName,
      statePath: sourceStatePath(statePath, sourceName),
      batchSize,
      limitRows,
      resume,
      ensureSchema,
      tableName,
    });
  }
}

function getS3Config() {
  loadDotEnv(join(root, ".env.local"));
  loadDotEnv(join(root, ".env"));
  const endpoint = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL || "";
  const bucket = process.env.S3_BUCKET || "";
  const accessKey =
    process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "";
  const secretKey =
    process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "";
  const sessionToken = process.env.S3_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN || "";
  const region = process.env.S3_REGION || process.env.AWS_REGION || "auto";
  const prefix = process.env.S3_PREFIX || "artworks/latest";
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "0";
  if (!endpoint || !bucket || !accessKey || !secretKey) {
    throw new Error(
      "Missing S3_ENDPOINT, S3_BUCKET, and S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY (or AWS_* equivalents)"
    );
  }
  return { endpoint, bucket, accessKey, secretKey, sessionToken, region, prefix, forcePathStyle };
}

async function putS3Object(config, key, body, contentType) {
  const endpoint = new URL(config.endpoint);
  const payloadHash = sha256Hex(body);
  const { amzDate, dateStamp } = awsDate();
  const service = "s3";
  const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
  const host = config.forcePathStyle ? endpoint.host : `${config.bucket}.${endpoint.host}`;
  const canonicalUri = config.forcePathStyle
    ? `/${encodeURIComponent(config.bucket)}/${encodeKeyPath(key)}`
    : `/${encodeKeyPath(key)}`;
  const url = `${endpoint.protocol}//${host}${canonicalUri}`;

  const headers = {
    host,
    "content-type": contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (config.sessionToken) headers["x-amz-security-token"] = config.sessionToken;

  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((name) => `${name}:${headers[name]}\n`)
    .join("");
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const kDate = hmac(`AWS4${config.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, config.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign, "hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: { ...headers, Authorization: authorization },
    body,
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`S3 upload failed for ${key}: ${response.status} ${text.slice(0, 500)}`);
  }
}

async function uploadS3Export({ exportDir, statePath, prefix, limitChunks, resume }) {
  const config = getS3Config();
  const resolvedPrefix = prefix || config.prefix;
  const manifestPath = join(exportDir, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`${manifestPath} does not exist; run export:artworks:chunks first`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const state = resume ? loadState(statePath) : {};
  const uploaded = new Set(state.uploadedKeys || []);

  console.log(
    `[upload] target=s3 endpoint=${config.endpoint} bucket=${config.bucket} prefix=${resolvedPrefix} chunks=${manifest.chunks.length}`
  );

  let uploadedChunks = 0;
  for (const chunk of manifest.chunks) {
    if (limitChunks && uploadedChunks >= limitChunks) break;
    const key = `${resolvedPrefix}/${chunk.path.replace(/\\/g, "/")}`;
    if (!uploaded.has(key)) {
      const body = readFileSync(join(exportDir, chunk.path));
      await putS3Object(config, key, body, "application/x-ndjson");
      uploaded.add(key);
      console.log(`[upload] s3 chunk ${chunk.index} ${key}`);
    } else {
      console.log(`[upload] skipped s3 chunk ${chunk.index}`);
    }
    uploadedChunks++;
    saveState(statePath, {
      target: "s3",
      endpoint: config.endpoint,
      bucket: config.bucket,
      prefix: resolvedPrefix,
      uploadedKeys: Array.from(uploaded),
      uploadedChunks,
    });
  }

  const manifestKey = `${resolvedPrefix}/manifest.json`;
  const remoteManifest = {
    ...manifest,
    target: "s3",
    bucket: config.bucket,
    prefix: resolvedPrefix,
    uploaded_at: new Date().toISOString(),
  };
  await putS3Object(config, manifestKey, Buffer.from(JSON.stringify(remoteManifest, null, 2)), "application/json");
  uploaded.add(manifestKey);
  saveState(statePath, {
    target: "s3",
    endpoint: config.endpoint,
    bucket: config.bucket,
    prefix: resolvedPrefix,
    uploadedKeys: Array.from(uploaded),
    uploadedChunks,
    complete: !limitChunks || uploadedChunks >= manifest.chunks.length,
  });
  console.log(`[upload] complete s3 export uploadedChunks=${uploadedChunks} manifest=${manifestKey}`);
}

async function harvestEuropeanaToSupabaseStorage({
  statePath,
  bucket,
  prefix,
  chunkMb,
  limitRows,
  source,
  resume,
  createBucket,
}) {
  const { client, url, keyType } = createSupabaseClient();
  console.log(
    `[upload] target=europeana-storage host=${new URL(url).host} key=${keyType} bucket=${bucket} prefix=${prefix} source=${source}`
  );
  if (createBucket) {
    try {
      await createBucketIfNeeded(client, bucket);
    } catch (error) {
      throw new Error(explainSupabaseError(error, url, keyType));
    }
  }

  const state = resume ? loadState(statePath) : {};
  const rightsFilters = rightsFiltersForSource(source);
  const chunkLimit = Math.max(1, chunkMb) * 1024 * 1024;
  const manifest = {
    target: "supabase-storage",
    source,
    bucket,
    prefix,
    chunks: state.chunks || [],
    rows: Number(state.rows || 0),
    bytes: Number(state.bytes || 0),
    generated_at: state.generated_at || new Date().toISOString(),
  };

  let rightsIndex = Number.isFinite(state.rightsIndex) ? state.rightsIndex : 0;
  let cursor = state.cursor || "*";
  let chunkIndex = Number(state.nextChunk || manifest.chunks.length || 0);
  let rowIndex = Number(state.rows || 0);
  let bytesTotal = Number(state.bytes || 0);
  let rowsTotal = Number(state.rows || 0);
  let parts = [];
  let rowsInChunk = 0;
  let bytesInChunk = 0;

  async function uploadRemoteState(extra = {}) {
    const remoteState = {
      target: "europeana-storage",
      source,
      bucket,
      prefix,
      rightsIndex,
      cursor,
      rows: rowsTotal,
      bytes: bytesTotal,
      nextChunk: chunkIndex,
      chunks: manifest.chunks,
      ...extra,
      updated_at: new Date().toISOString(),
    };
    saveState(statePath, remoteState);
    try {
      await uploadStorageObject(
        client,
        bucket,
        `${prefix}/remote-state.json`,
        Buffer.from(JSON.stringify(remoteState, null, 2)),
        "application/json"
      );
    } catch (error) {
      throw new Error(explainSupabaseError(error, url, keyType));
    }
  }

  async function flushChunk(nextCursorForState) {
    if (parts.length === 0) return;
    const objectPath = `${prefix}/chunks/${pad(chunkIndex)}.ndjson`;
    const bytes = bytesInChunk;
    const rows = rowsInChunk;
    try {
      await uploadStorageObject(client, bucket, objectPath, Buffer.concat(parts, bytes), "application/x-ndjson");
    } catch (error) {
      throw new Error(explainSupabaseError(error, url, keyType));
    }
    manifest.chunks.push({ index: chunkIndex, path: objectPath, rows, bytes });
    bytesTotal += bytes;
    rowsTotal += rows;
    cursor = nextCursorForState || cursor;
    console.log(`[upload] europeana chunk ${chunkIndex} rows=${rows} total=${rowsTotal}`);
    chunkIndex++;
    parts = [];
    rowsInChunk = 0;
    bytesInChunk = 0;
    await uploadRemoteState();
  }

  for (; rightsIndex < rightsFilters.length; rightsIndex++) {
    const rights = rightsFilters[rightsIndex];
    if (!cursor) cursor = "*";
    let consecutiveFailures = 0;
    while (cursor) {
      if (limitRows && rowsTotal + rowsInChunk >= limitRows) {
        await flushChunk(cursor);
        await uploadRemoteState({ complete: true });
        console.log(`[upload] stopped at requested row limit ${limitRows}`);
        return;
      }

      const pageCursor = cursor;
      const params = new URLSearchParams({
        wskey: process.env.EUROPEANA_API_KEY || "baramboa",
        query: "*:*",
        media: "true",
        thumbnail: "true",
        rows: "100",
        cursor,
      });
      params.append("qf", `RIGHTS:${rights.qf}`);
      params.append("qf", "TYPE:IMAGE");

      let data;
      try {
        data = await fetchJson(`https://api.europeana.eu/record/v2/search.json?${params.toString()}`);
        consecutiveFailures = 0;
      } catch (error) {
        consecutiveFailures++;
        await uploadRemoteState({ last_error: error.message, consecutiveFailures });
        if (consecutiveFailures >= 20) {
          console.warn(`[upload] stopping after ${consecutiveFailures} page failures: ${error.message}`);
          return;
        }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 5000 * Math.min(consecutiveFailures, 6)));
        continue;
      }
      if (!data.items?.length) break;

      for (const item of data.items) {
        if (limitRows && rowsTotal + rowsInChunk >= limitRows) break;
        const normalized = normalizeEuropeana(item, rights.name);
        if (!normalized) continue;
        const placed = applyPlacement(normalized, rowIndex++);
        const payload = Buffer.from(`${JSON.stringify(placed)}\n`);
        parts.push(payload);
        rowsInChunk++;
        bytesInChunk += payload.length;
      }

      cursor = data.nextCursor || "";
      if (bytesInChunk >= chunkLimit) await flushChunk(cursor);
    }
    cursor = "*";
  }

  await flushChunk("");
  manifest.rows = rowsTotal;
  manifest.bytes = bytesTotal;
  manifest.completed_at = new Date().toISOString();
  try {
    await uploadStorageObject(
      client,
      bucket,
      `${prefix}/manifest.json`,
      Buffer.from(JSON.stringify(manifest, null, 2)),
      "application/json"
    );
  } catch (error) {
    throw new Error(explainSupabaseError(error, url, keyType));
  }
  await uploadRemoteState({ complete: true });
  console.log(`[upload] complete europeana storage harvest rows=${rowsTotal} chunks=${manifest.chunks.length}`);
}

async function main() {
  const target = getArg("target", "supabase-storage");
  const input = resolveProjectPath(getArg("input"), DEFAULT_INPUT);
  const statePath = resolveProjectPath(getArg("state"), DEFAULT_STATE);
  const output = resolveProjectPath(getArg("output"), DEFAULT_LOCAL_OUTPUT);
  const exportDir = resolveProjectPath(getArg("export-dir"), DEFAULT_LOCAL_EXPORT);
  const bucket = getArg("bucket", process.env.ARTWORK_EXPORT_BUCKET || "artwork-exports");
  const prefix = getArg("prefix", process.env.ARTWORK_EXPORT_PREFIX || "artworks/latest");
  const source = getArg("source", "europeana-open");
  const tableName = getArg("table", "artworks");
  const chunkMb = Math.max(1, Number(getArg("chunk-mb", "5")));
  const batchSize = Math.max(1, Number(getArg("batch-size", "500")));
  const limitRows = Math.max(0, Number(getArg("limit-rows", "0")));
  const limitChunks = Math.max(0, Number(getArg("limit-chunks", "0")));

  if (!existsSync(input)) throw new Error(`${input} does not exist`);

  if (target === "supabase-storage") {
    await uploadStorageExport({
      input,
      statePath,
      bucket,
      prefix,
      chunkMb,
      limitRows,
      resume: hasFlag("resume"),
      createBucket: hasFlag("create-bucket"),
    });
    return;
  }

  if (target === "supabase-table") {
    await uploadSupabaseTable({ input, statePath, batchSize, limitRows, resume: hasFlag("resume") });
    return;
  }

  if (target === "postgres-table") {
    await uploadPostgresTable({
      input,
      statePath,
      batchSize,
      limitRows,
      resume: hasFlag("resume"),
      ensureSchema: hasFlag("ensure-schema"),
      tableName,
    });
    return;
  }

  if (target === "local-volume") {
    await writeLocalChunkExport({ input, output, statePath, chunkMb, limitRows, reset: hasFlag("reset") });
    return;
  }

  if (target === "s3") {
    await uploadS3Export({ exportDir, statePath, prefix, limitChunks, resume: hasFlag("resume") });
    return;
  }

  if (target === "europeana-storage") {
    await harvestEuropeanaToSupabaseStorage({
      statePath,
      bucket,
      prefix,
      chunkMb,
      limitRows,
      source,
      resume: hasFlag("resume"),
      createBucket: hasFlag("create-bucket"),
    });
    return;
  }

  if (target === "europeana-postgres") {
    await harvestEuropeanaToPostgres({
      statePath,
      batchSize,
      limitRows,
      source,
      resume: hasFlag("resume"),
      ensureSchema: hasFlag("ensure-schema"),
      tableName,
    });
    return;
  }

  if (target === "public-postgres") {
    await harvestPublicDatabasesToPostgres({
      source,
      statePath,
      batchSize,
      limitRows,
      resume: hasFlag("resume"),
      ensureSchema: hasFlag("ensure-schema"),
      tableName,
    });
    return;
  }

  throw new Error(`Unsupported --target ${target}`);
}

main().catch((error) => {
  console.error(`[upload] ${error.message}`);
  process.exitCode = 1;
});
