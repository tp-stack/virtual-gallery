import asyncio
import json
import logging
import re
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from typing import Any

logger = logging.getLogger("ArchivistAgent")

MET_SEARCH = "https://collectionapi.metmuseum.org/public/collection/v1/search"
MET_OBJECT = "https://collectionapi.metmuseum.org/public/collection/v1/objects"
AIC_SEARCH = "https://api.artic.edu/api/v1/artworks/search"

executor = ThreadPoolExecutor(max_workers=10)


def _fetch_json(url: str, timeout: int = 15) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "VirtualGallery/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


class ArchivistAgent:
    def __init__(self):
        self.sem = asyncio.Semaphore(5)

    async def fetch_artworks(self, limit: int = 200) -> list[dict]:
        all_artworks: list[dict] = []
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

        return all_artworks

    async def _fetch_met(self, limit: int) -> list[dict]:
        search_url = f"{MET_SEARCH}?q=painting&hasImages=true&isPublicDomain=true"
        try:
            data = await asyncio.get_event_loop().run_in_executor(executor, _fetch_json, search_url)
        except Exception as e:
            logger.warning(f"Met search failed: {e}")
            return []

        object_ids = data.get("objectIDs", [])[:limit]
        tasks = [self._fetch_met_object(oid) for oid in object_ids]
        return [r for r in await asyncio.gather(*tasks) if r is not None]

    async def _fetch_met_object(self, object_id: int) -> dict | None:
        async with self.sem:
            try:
                url = f"{MET_OBJECT}/{object_id}"
                obj = await asyncio.get_event_loop().run_in_executor(executor, _fetch_json, url)
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

        image_small = obj.get("primaryImageSmall", "")
        image_hd = obj.get("primaryImage", "")
        if not image_small:
            image_small = image_hd

        return {
            "id": f"met-{object_id}",
            "title": title,
            "artist": artist,
            "year": year,
            "movement": obj.get("department", "Unknown"),
            "origin": obj.get("artistNationality", ""),
            "medium": obj.get("medium", ""),
            "museum": "Metropolitan Museum of Art",
            "image_url": image_small,
            "image_url_3d": image_small,
            "image_url_hd": image_hd,
            "dimensions": obj.get("dimensions", ""),
            "description": "",
            "description_long": obj.get("creditLine", ""),
            "audio_narration": "",
            "tags": [],
            "highlight": False,
        }

    async def _fetch_aic(self, limit: int) -> list[dict]:
        all_artworks = []
        page = 1
        per_page = min(limit, 100)

        while len(all_artworks) < limit:
            params = urllib.parse.urlencode({
                "q": "painting",
                "query[term][is_public_domain]": True,
                "limit": per_page,
                "page": page,
                "fields": "id,title,artist_display,image_id,date_display,medium_display,department_title,dimensions,credit_line,place_of_origin",
            })
            url = f"{AIC_SEARCH}?{params}"

            async with self.sem:
                try:
                    data = await asyncio.get_event_loop().run_in_executor(executor, _fetch_json, url)
                except Exception:
                    break

            results = data.get("data", [])
            if not results:
                break

            for item in results:
                if len(all_artworks) >= limit:
                    break
                title = (item.get("title") or "").strip()
                artist = (item.get("artist_display") or "").strip()
                if not title or not artist:
                    continue
                image_id = item.get("image_id")
                if not image_id:
                    continue

                all_artworks.append({
                    "id": f"aic-{item['id']}",
                    "title": title,
                    "artist": artist.split("\n")[0].strip() if "\n" in artist else artist,
                    "year": int(re.search(r"\d{3,4}", item.get("date_display", "")).group()) if re.search(r"\d{3,4}", item.get("date_display", "")) else 0,
                    "movement": item.get("department_title", "Unknown"),
                    "origin": item.get("place_of_origin", ""),
                    "medium": item.get("medium_display", ""),
                    "museum": "Art Institute of Chicago",
                    "image_url": f"https://www.artic.edu/iiif/2/{image_id}/full/400,/0/default.jpg",
                    "image_url_3d": f"https://www.artic.edu/iiif/2/{image_id}/full/400,/0/default.jpg",
                    "image_url_hd": f"https://www.artic.edu/iiif/2/{image_id}/full/800,/0/default.jpg",
                    "dimensions": item.get("dimensions", ""),
                    "description": "",
                    "description_long": item.get("credit_line", ""),
                    "audio_narration": "",
                    "tags": [],
                    "highlight": False,
                })
            page += 1

        return all_artworks
