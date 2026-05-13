import asyncio
import logging
import re
from typing import Any

import httpx

logger = logging.getLogger("ArchivistAgent")

MET_SEARCH = "https://collectionapi.metmuseum.org/public/collection/v1/search"
MET_OBJECT = "https://collectionapi.metmuseum.org/public/collection/v1/objects"
AIC_SEARCH = "https://api.artic.edu/api/v1/artworks/search"


class ArchivistAgent:
    def __init__(self):
        self.sem = asyncio.Semaphore(5)

    async def fetch_artworks(self, limit: int = 200) -> list[dict]:
        all_artworks: list[dict] = []
        logger.info(f"Archivist fetching up to {limit} artworks from museum APIs")

        met_limit = limit // 2
        aic_limit = limit - met_limit

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                met_results = await self._fetch_met(client, met_limit)
                all_artworks.extend(met_results)
                logger.info(f"Met Museum returned {len(met_results)} artworks")
            except Exception as e:
                logger.error(f"Met Museum API failed: {e}")

            try:
                aic_results = await self._fetch_aic(client, aic_limit)
                all_artworks.extend(aic_results)
                logger.info(f"Art Institute Chicago returned {len(aic_results)} artworks")
            except Exception as e:
                logger.error(f"AIC API failed: {e}")

        return all_artworks

    async def _fetch_met(self, client: httpx.AsyncClient, limit: int) -> list[dict]:
        async with self.sem:
            resp = await client.get(
                MET_SEARCH,
                params={"q": "painting", "hasImages": True, "isPublicDomain": True},
            )
            resp.raise_for_status()
            data = resp.json()
            object_ids = data.get("objectIDs", [])[:limit]

        tasks = [self._fetch_met_object(client, oid) for oid in object_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [r for r in results if isinstance(r, dict)]

    async def _fetch_met_object(self, client: httpx.AsyncClient, object_id: int) -> dict | None:
        async with self.sem:
            try:
                resp = await client.get(f"{MET_OBJECT}/{object_id}")
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

    async def _fetch_aic(self, client: httpx.AsyncClient, limit: int) -> list[dict]:
        all_artworks = []
        page = 1
        per_page = min(limit, 100)

        while len(all_artworks) < limit:
            async with self.sem:
                try:
                    resp = await client.get(
                        AIC_SEARCH,
                        params={
                            "q": "painting",
                            "query[term][is_public_domain]": True,
                            "limit": per_page,
                            "page": page,
                            "fields": "id,title,artist_display,image_id,date_display,medium_display,department_title,dimensions,credit_line,place_of_origin",
                        },
                    )
                    resp.raise_for_status()
                    data = resp.json()
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

                image_small = f"https://www.artic.edu/iiif/2/{image_id}/full/400,/0/default.jpg"
                image_hd = f"https://www.artic.edu/iiif/2/{image_id}/full/800,/0/default.jpg"

                year_str = item.get("date_display", "")
                year = 0
                if year_str:
                    match = re.search(r"\d{3,4}", year_str)
                    if match:
                        year = int(match.group())

                all_artworks.append({
                    "id": f"aic-{item['id']}",
                    "title": title,
                    "artist": artist.split("\n")[0].strip() if "\n" in artist else artist,
                    "year": year,
                    "movement": item.get("department_title", "Unknown"),
                    "origin": item.get("place_of_origin", ""),
                    "medium": item.get("medium_display", ""),
                    "museum": "Art Institute of Chicago",
                    "image_url": image_small,
                    "image_url_3d": image_small,
                    "image_url_hd": image_hd,
                    "dimensions": item.get("dimensions", ""),
                    "description": "",
                    "description_long": item.get("credit_line", ""),
                    "audio_narration": "",
                    "tags": [],
                    "highlight": False,
                })

            page += 1

        return all_artworks
