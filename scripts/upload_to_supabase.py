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

with open(DATA_PATH, encoding="utf-8") as f:
    data = json.load(f)

artworks = data.get("artworks", [])
positions = data.get("gallery", {}).get("artwork_positions", {})

print(f"Uploading {len(artworks)} artworks to Supabase...")

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

client = httpx.Client(timeout=30.0)

# Step 1: Delete all existing rows
print("Clearing existing data...")
try:
    dh = {k: v for k, v in headers.items() if k != "Prefer"}
    dr = client.delete(f"{SUPABASE_URL}/rest/v1/artworks?source_id=neq.none", headers=dh)
    print(f"  Delete: {dr.status_code}")
except Exception as e:
    print(f"  Delete failed: {e}")

# Step 2: Build deduplicated rows
seen = set()
all_rows = []
for art in artworks:
    aid = art.get("source_id") or art.get("id")
    if aid in seen:
        continue
    seen.add(aid)
    pos = positions.get(aid, {})
    z = pos.get("z")
    all_rows.append({
        "source_id": aid,
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
        "position_z": z,
        "rotation_y": pos.get("rotY"),
        "room_id": int(z / 22) if z is not None else None,
        "source_api": art.get("source_api", ""),
    })

# Step 3: Upload in batches
BATCH = 500
for i in range(0, len(all_rows), BATCH):
    batch = all_rows[i : i + BATCH]
    resp = client.post(f"{SUPABASE_URL}/rest/v1/artworks", headers=headers, json=batch)
    if resp.status_code in (200, 201):
        print(f"  Batch {i//BATCH + 1}: +{len(batch)} artworks")
    elif resp.status_code == 409:
        print(f"  Batch {i//BATCH + 1}: {len(batch)} rows (duplicate conflict, retrying individually)")
        for row in batch:
            r2 = client.post(f"{SUPABASE_URL}/rest/v1/artworks", headers=headers, json=[row])
            if r2.status_code in (200, 201):
                pass
    else:
        print(f"  Batch {i//BATCH + 1}: ERROR {resp.status_code} - {resp.text[:200]}")

client.close()
print(f"Done. {len(all_rows)} artworks uploaded (deduplicated from {len(artworks)}).")
