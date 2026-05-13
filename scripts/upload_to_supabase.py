import json
import os
import sys
import httpx
from pathlib import Path

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("ERROR: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set")
    sys.exit(1)

DATA_PATH = Path(__file__).parent.parent / "public" / "data" / "artworks.json"

if not DATA_PATH.exists():
    print(f"ERROR: {DATA_PATH} not found. Run orchestrator.py first.")
    sys.exit(1)

with open(DATA_PATH) as f:
    data = json.load(f)

artworks = data.get("artworks", [])
gallery = data.get("gallery", {})
positions = gallery.get("artwork_positions", {})

print(f"Uploading {len(artworks)} artworks to Supabase...")

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

BATCH_SIZE = 500
client = httpx.Client(timeout=30.0)

for i in range(0, len(artworks), BATCH_SIZE):
    batch = artworks[i : i + BATCH_SIZE]
    rows = []
    for art in batch:
        pos = positions.get(art.get("source_id") or art.get("id"), {})
        row = {
            "source_id": art.get("source_id") or art.get("id"),
            "title": art.get("title", ""),
            "artist": art.get("artist", ""),
            "year": art.get("year", 0),
            "movement": art.get("movement", ""),
            "origin": art.get("origin", ""),
            "medium": art.get("medium", ""),
            "museum": art.get("museum", ""),
            "image_url_3d": art.get("image_url_3d", ""),
            "image_url_hd": art.get("image_url_hd", ""),
            "dimensions": art.get("dimensions", ""),
            "description": art.get("description", ""),
            "description_long": art.get("description_long", ""),
            "audio_narration": art.get("audio_narration", ""),
            "tags": art.get("tags", []),
            "highlight": art.get("highlight", False),
            "position_x": pos.get("x"),
            "position_y": pos.get("y", 1.6),
            "position_z": pos.get("z"),
            "rotation_y": pos.get("rotY"),
            "room_id": art.get("room_id"),
            "source_api": art.get("source_api", ""),
        }
        rows.append(row)

    url = f"{SUPABASE_URL}/rest/v1/artworks"
    resp = client.post(url, headers=headers, json=rows)
    if resp.status_code in (200, 201):
        print(f"  Batch {i//BATCH_SIZE + 1}: {len(rows)} rows inserted")
    else:
        print(f"  Batch {i//BATCH_SIZE + 1}: ERROR {resp.status_code} - {resp.text[:200]}")

client.close()
print(f"Done. {len(artworks)} artworks uploaded.")
