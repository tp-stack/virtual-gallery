import asyncio
import json
import logging
import math
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger("ArchivistAgent")

MET_SEARCH = "https://collectionapi.metmuseum.org/public/collection/v1/search"
MET_OBJECT = "https://collectionapi.metmuseum.org/public/collection/v1/objects"
AIC_SEARCH = "https://api.artic.edu/api/v1/artworks/search"

ROOM_WIDTH = 30
ROOM_DEPTH = 20
MAX_PER_ROOM = 10

executor = ThreadPoolExecutor(max_workers=10)


def _compute_position(artwork_index: int) -> tuple:
    room_id = artwork_index // MAX_PER_ROOM
    pos_in_room = artwork_index % MAX_PER_ROOM
    z_pos = room_id * (ROOM_DEPTH + 2)
    is_left = pos_in_room % 2 == 0
    wall_spacing = ROOM_DEPTH / (MAX_PER_ROOM + 1)
    px = 2 if is_left else ROOM_WIDTH - 2
    pz = z_pos + wall_spacing * (pos_in_room + 1)
    rot_y = math.pi / 2 if is_left else -math.pi / 2
    return round(px, 2), 1.6, round(pz, 2), round(rot_y, 2), room_id


def _fetch_json(url: str, timeout: int = 15) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "VirtualGallery/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


class ArchivistAgent:
    def __init__(self):
        self.sem = asyncio.Semaphore(10)

    async def fetch_artworks(self, limit: int = 200) -> list[dict]:
        all_artworks = self._core_artworks()
        logger.info(f"Archivist fetching up to {limit} artworks")

        met_limit = limit // 2
        aic_limit = limit - met_limit

        try:
            met_results = await self._fetch_met(met_limit)
            all_artworks.extend(met_results)
            logger.info(f"Met Museum: {len(met_results)} artworks")
        except Exception as e:
            logger.error(f"Met API failed: {e}")

        try:
            aic_results = await self._fetch_aic(aic_limit)
            all_artworks.extend(aic_results)
            logger.info(f"AIC: {len(aic_results)} artworks")
        except Exception as e:
            logger.error(f"AIC API failed: {e}")

        now = datetime.now(timezone.utc).isoformat()
        for i, art in enumerate(all_artworks):
            px, py, pz, rot, rid = _compute_position(i)
            art["position_x"] = px
            art["position_y"] = py
            art["position_z"] = pz
            art["rotation_y"] = rot
            art["room_id"] = rid
            art["created_at"] = now

        return all_artworks

    def _core_artworks(self) -> list[dict]:
        return [
            {"source_id": "core-mona-lisa", "id": "mona-lisa", "title": "Mona Lisa (La Gioconda)", "artist": "Leonardo da Vinci", "year": 1503, "movement": "Renaissance", "origin": "Italy", "medium": "Oil on poplar panel", "museum": "Louvre, Paris",
             "image_url": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
             "image_url_3d": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
             "image_url_hd": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
             "dimensions": "77 cm x 53 cm", "description": "", "description_long": "", "audio_narration": "", "tags": [], "highlight": True, "source_api": "core"},
            {"source_id": "core-starry-night", "id": "starry-night", "title": "The Starry Night", "artist": "Vincent van Gogh", "year": 1889, "movement": "Post-Impressionism", "origin": "France", "medium": "Oil on canvas", "museum": "MoMA, New York",
             "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
             "image_url_3d": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/400px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
             "image_url_hd": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
             "dimensions": "73.7 cm x 92.1 cm", "description": "", "description_long": "", "audio_narration": "", "tags": [], "highlight": True, "source_api": "core"},
            {"source_id": "core-girl-pearl", "id": "girl-pearl-earring", "title": "Girl with a Pearl Earring", "artist": "Johannes Vermeer", "year": 1665, "movement": "Baroque", "origin": "Netherlands", "medium": "Oil on canvas", "museum": "Mauritshuis, The Hague",
             "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg/800px-Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg",
             "image_url_3d": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg/400px-Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg",
             "image_url_hd": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg/800px-Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg",
             "dimensions": "44.5 cm x 39 cm", "description": "", "description_long": "", "audio_narration": "", "tags": [], "highlight": True, "source_api": "core"},
            {"source_id": "core-great-wave", "id": "great-wave", "title": "The Great Wave off Kanagawa", "artist": "Katsushika Hokusai", "year": 1831, "movement": "Ukiyo-e", "origin": "Japan", "medium": "Woodblock print", "museum": "Met Museum, New York",
             "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg",
             "image_url_3d": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/400px-Tsunami_by_hokusai_19th_century.jpg",
             "image_url_hd": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg",
             "dimensions": "25.7 cm x 37.8 cm", "description": "", "description_long": "", "audio_narration": "", "tags": [], "highlight": True, "source_api": "core"},
        ]

    async def _fetch_met(self, limit: int) -> list[dict]:
        logger.info(f"Fetching up to {limit} from Met Museum")
        search_url = f"{MET_SEARCH}?q=painting&hasImages=true&isPublicDomain=true"
        loop = asyncio.get_event_loop()
        try:
            data = await loop.run_in_executor(executor, _fetch_json, search_url)
        except Exception as e:
            logger.warning(f"Met search failed: {e}")
            return []

        object_ids = data.get("objectIDs", [])[:limit]
        tasks = [self._fetch_met_object(oid, loop) for oid in object_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [r for r in results if isinstance(r, dict)]

    async def _fetch_met_object(self, oid: int, loop) -> dict | None:
        async with self.sem:
            url = f"{MET_OBJECT}/{oid}"
            try:
                obj = await loop.run_in_executor(executor, _fetch_json, url)
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

        return {
            "source_id": f"met-{oid}",
            "id": f"met-{oid}",
            "title": title, "artist": artist, "year": year,
            "movement": obj.get("department", "Unknown"), "origin": obj.get("artistNationality", ""),
            "medium": obj.get("medium", ""), "museum": "Metropolitan Museum of Art",
            "image_url": img_small, "image_url_3d": img_small, "image_url_hd": img_hd,
            "dimensions": obj.get("dimensions", ""), "description": "", "description_long": obj.get("creditLine", ""),
            "audio_narration": "", "tags": [], "highlight": False, "source_api": "met",
        }

    async def _fetch_aic(self, limit: int) -> list[dict]:
        logger.info(f"Fetching up to {limit} from Art Institute Chicago")
        all_rows = []
        page = 1
        per_page = 100
        loop = asyncio.get_event_loop()

        while len(all_rows) < limit:
            params = urllib.parse.urlencode({
                "q": "painting", "query[term][is_public_domain]": True,
                "limit": per_page, "page": page,
                "fields": "id,title,artist_display,image_id,date_display,medium_display,department_title,dimensions,credit_line,place_of_origin",
            })
            url = f"{AIC_SEARCH}?{params}"

            async with self.sem:
                try:
                    data = await loop.run_in_executor(executor, _fetch_json, url)
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
                    "source_id": f"aic-{item['id']}", "id": f"aic-{item['id']}", "title": title,
                    "artist": artist.split("\n")[0].strip(), "year": year,
                    "movement": item.get("department_title", "Unknown"), "origin": item.get("place_of_origin", ""),
                    "medium": item.get("medium_display", ""), "museum": "Art Institute of Chicago",
                    "image_url": f"https://www.artic.edu/iiif/2/{image_id}/full/400,/0/default.jpg",
                    "image_url_3d": f"https://www.artic.edu/iiif/2/{image_id}/full/400,/0/default.jpg",
                    "image_url_hd": f"https://www.artic.edu/iiif/2/{image_id}/full/800,/0/default.jpg",
                    "dimensions": item.get("dimensions", ""), "description": "", "description_long": item.get("credit_line", ""),
                    "audio_narration": "", "tags": [], "highlight": False, "source_api": "aic",
                })
            page += 1

        return all_rows
