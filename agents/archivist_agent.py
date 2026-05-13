import asyncio
import json
import logging
import math
import os
import re
import sys
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import httpx

logger = logging.getLogger("ArchivistAgent")

MET_SEARCH = "https://collectionapi.metmuseum.org/public/collection/v1/search"
MET_OBJECT = "https://collectionapi.metmuseum.org/public/collection/v1/objects"
AIC_SEARCH = "https://api.artic.edu/api/v1/artworks/search"

ROOM_WIDTH = 30
ROOM_DEPTH = 20
MAX_PER_ROOM = 10

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
FETCH_LIMIT = int(os.environ.get("FETCH_LIMIT", "0") or "0")

BATCH_SIZE = 500


def _load_dotenv():
    env_path = os.path.join(os.path.dirname(__file__), ".python.env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())


_load_dotenv()


def _compute_position(artwork_index: int) -> tuple:
    room_id = artwork_index // MAX_PER_ROOM
    pos_in_room = artwork_index % MAX_PER_ROOM
    grid_row = room_id // 3
    grid_col = room_id % 3
    z_pos = grid_row * (ROOM_DEPTH + 2)
    x_pos = grid_col * ROOM_WIDTH
    is_left = pos_in_room % 2 == 0
    wall_spacing = ROOM_DEPTH / (MAX_PER_ROOM + 1)
    px = x_pos + (2 if is_left else ROOM_WIDTH - 2)
    pz = z_pos + wall_spacing * (pos_in_room + 1)
    rot_y = math.pi / 2 if is_left else -math.pi / 2
    return round(px, 2), 1.6, round(pz, 2), round(rot_y, 2), room_id


class ArchivistAgent:
    def __init__(self):
        self.sem = asyncio.Semaphore(10)
        self.total_inserted = 0

    def _supabase_headers(self) -> dict:
        return {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

    async def _insert_batch(self, rows: list[dict]):
        if not rows:
            return
        async with httpx.AsyncClient() as client:
            url = f"{SUPABASE_URL}/rest/v1/artworks"
            resp = await client.post(url, headers=self._supabase_headers(), json=rows)
            if resp.status_code not in (200, 201):
                logger.error(f"Supabase insert error {resp.status_code}: {resp.text[:200]}")

    async def fetch_and_store(self, limit: int = 50000):
        logger.info(f"Archivist: fetching up to {limit} artworks and storing in Supabase")

        total_needed = limit
        existing_count = await self._count_existing()
        if existing_count >= total_needed:
            logger.info(f"Already have {existing_count} artworks, skipping API fetch")
            return existing_count

        need = total_needed - existing_count
        met_need = need // 2
        aic_need = need - met_need

        core_rows = self._core_artworks()
        self.total_inserted += len(core_rows)

        api_tasks = []
        if met_need > 0:
            api_tasks.append(self._fetch_met(met_need))
        if aic_need > 0:
            api_tasks.append(self._fetch_aic(aic_need))

        if api_tasks:
            results = await asyncio.gather(*api_tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, list):
                    await self._insert_batch(r)
                    self.total_inserted += len(r)

        await self._insert_batch(core_rows)

        final_count = await self._count_existing()
        logger.info(f"Pipeline complete. Total artworks in DB: {final_count}")
        return final_count

    async def _count_existing(self) -> int:
        try:
            async with httpx.AsyncClient() as client:
                url = f"{SUPABASE_URL}/rest/v1/artworks?select=count&limit=0"
                resp = await client.get(url, headers=self._supabase_headers())
                if resp.status_code == 200:
                    return int(resp.json()[0]["count"])
        except Exception:
            pass
        return 0

    def _core_artworks(self) -> list[dict]:
        cores = [
            {"source_id": "core-mona-lisa", "title": "Mona Lisa (La Gioconda)", "artist": "Leonardo da Vinci", "year": 1503, "movement": "Renaissance", "origin": "Italy", "medium": "Oil on poplar panel", "museum": "Louvre, Paris",
             "image_url_3d": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
             "image_url_hd": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
             "dimensions": "77 cm x 53 cm", "source_api": "core", "highlight": True},
            {"source_id": "core-starry-night", "title": "The Starry Night", "artist": "Vincent van Gogh", "year": 1889, "movement": "Post-Impressionism", "origin": "France", "medium": "Oil on canvas", "museum": "MoMA, New York",
             "image_url_3d": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/400px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
             "image_url_hd": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
             "dimensions": "73.7 cm x 92.1 cm", "source_api": "core", "highlight": True},
            {"source_id": "core-girl-pearl", "title": "Girl with a Pearl Earring", "artist": "Johannes Vermeer", "year": 1665, "movement": "Baroque", "origin": "Netherlands", "medium": "Oil on canvas", "museum": "Mauritshuis, The Hague",
             "image_url_3d": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg/400px-Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg",
             "image_url_hd": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg/800px-Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg",
             "dimensions": "44.5 cm x 39 cm", "source_api": "core", "highlight": True},
            {"source_id": "core-great-wave", "title": "The Great Wave off Kanagawa", "artist": "Katsushika Hokusai", "year": 1831, "movement": "Ukiyo-e", "origin": "Japan", "medium": "Woodblock print", "museum": "Met Museum, New York",
             "image_url_3d": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/400px-Tsunami_by_hokusai_19th_century.jpg",
             "image_url_hd": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg",
             "dimensions": "25.7 cm x 37.8 cm", "source_api": "core", "highlight": True},
        ]
        for i, art in enumerate(cores):
            px, py, pz, rot, rid = _compute_position(i)
            art["position_x"] = px
            art["position_y"] = py
            art["position_z"] = pz
            art["rotation_y"] = rot
            art["room_id"] = rid
        return cores

    async def _fetch_met(self, limit: int) -> list[dict]:
        logger.info(f"Fetching up to {limit} from Met Museum")
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.get(MET_SEARCH, params={"q": "painting", "hasImages": True, "isPublicDomain": True})
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.warning(f"Met search failed: {e}")
                return []

            object_ids = data.get("objectIDs", [])[:limit]
            tasks = [self._fetch_met_object(client, oid) for oid in object_ids]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            rows = [r for r in results if isinstance(r, dict)]
            logger.info(f"Met: {len(rows)} valid artworks")
            return rows

    async def _fetch_met_object(self, client: httpx.AsyncClient, oid: int) -> dict | None:
        async with self.sem:
            try:
                resp = await client.get(f"{MET_OBJECT}/{oid}")
                resp.raise_for_status()
                obj = resp.json()
            except Exception:
                return None

        title = (obj.get("title") or "").strip()
        artist = (obj.get("artistDisplayName") or "").strip()
        if not title or not artist:
            return None

        year_str = obj.get("objectDate", "")
        year = 0
        if year_str:
            match = re.search(r"\d{3,4}", year_str)
            if match:
                year = int(match.group())

        img_small = obj.get("primaryImageSmall", "") or obj.get("primaryImage", "")
        img_hd = obj.get("primaryImage", "")

        row = {
            "source_id": f"met-{oid}",
            "title": title,
            "artist": artist,
            "year": year,
            "movement": obj.get("department", "Unknown"),
            "origin": obj.get("artistNationality", ""),
            "medium": obj.get("medium", ""),
            "museum": "Metropolitan Museum of Art",
            "image_url_3d": img_small,
            "image_url_hd": img_hd,
            "dimensions": obj.get("dimensions", ""),
            "description": "",
            "description_long": obj.get("creditLine", ""),
            "source_api": "met",
            "highlight": False,
        }
        return row

    async def _fetch_aic(self, limit: int) -> list[dict]:
        logger.info(f"Fetching up to {limit} from Art Institute Chicago")
        all_rows = []
        page = 1
        per_page = 100

        async with httpx.AsyncClient(timeout=30.0) as client:
            while len(all_rows) < limit:
                async with self.sem:
                    try:
                        resp = await client.get(AIC_SEARCH, params={
                            "q": "painting", "query[term][is_public_domain]": True,
                            "limit": per_page, "page": page,
                            "fields": "id,title,artist_display,image_id,date_display,medium_display,department_title,dimensions,credit_line,place_of_origin",
                        })
                        resp.raise_for_status()
                        data = resp.json()
                    except Exception:
                        break

                results = data.get("data", [])
                if not results:
                    break

                for item in results:
                    if len(all_rows) >= limit:
                        break
                    title = (item.get("title") or "").strip()
                    artist = (item.get("artist_display") or "").strip()
                    if not title or not artist:
                        continue
                    image_id = item.get("image_id")
                    if not image_id:
                        continue

                    year_str = item.get("date_display", "")
                    year = 0
                    if year_str:
                        match = re.search(r"\d{3,4}", year_str)
                        if match:
                            year = int(match.group())

                    all_rows.append({
                        "source_id": f"aic-{item['id']}",
                        "title": title,
                        "artist": artist.split("\n")[0].strip(),
                        "year": year,
                        "movement": item.get("department_title", "Unknown"),
                        "origin": item.get("place_of_origin", ""),
                        "medium": item.get("medium_display", ""),
                        "museum": "Art Institute of Chicago",
                        "image_url_3d": f"https://www.artic.edu/iiif/2/{image_id}/full/400,/0/default.jpg",
                        "image_url_hd": f"https://www.artic.edu/iiif/2/{image_id}/full/800,/0/default.jpg",
                        "dimensions": item.get("dimensions", ""),
                        "description": "",
                        "description_long": item.get("credit_line", ""),
                        "source_api": "aic",
                        "highlight": False,
                    })
                page += 1

        logger.info(f"AIC: {len(all_rows)} artworks")
        return all_rows
