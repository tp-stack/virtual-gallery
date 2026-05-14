import logging
from typing import Any

from archivist_agent import ArchivistAgent

logger = logging.getLogger("CuratorAgent")

CORE_MASTERPIECES: list[dict[str, Any]] = [
    {
        "id": "mona-lisa",
        "title": "Mona Lisa (La Gioconda)",
        "artist": "Leonardo da Vinci",
        "year": 1503,
        "movement": "Renaissance",
        "origin": "Italy",
        "medium": "Oil on poplar panel",
        "museum": "Louvre, Paris",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
        "image_url_3d": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
        "image_url_hd": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
        "dimensions": "77 cm x 53 cm",
        "description": "",
        "description_long": "",
        "audio_narration": "",
        "tags": [],
        "highlight": True,
    },
    {
        "id": "starry-night",
        "title": "The Starry Night",
        "artist": "Vincent van Gogh",
        "year": 1889,
        "movement": "Post-Impressionism",
        "origin": "France",
        "medium": "Oil on canvas",
        "museum": "MoMA, New York",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
        "image_url_3d": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
        "image_url_hd": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
        "dimensions": "73.7 cm x 92.1 cm",
        "description": "",
        "description_long": "",
        "audio_narration": "",
        "tags": [],
        "highlight": True,
    },
    {
        "id": "girl-pearl-earring",
        "title": "Girl with a Pearl Earring",
        "artist": "Johannes Vermeer",
        "year": 1665,
        "movement": "Baroque",
        "origin": "Netherlands",
        "medium": "Oil on canvas",
        "museum": "Mauritshuis, The Hague",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg/800px-Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg",
        "image_url_3d": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg/800px-Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg",
        "image_url_hd": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg/800px-Vermeer%2C_Johannes_-_Girl_with_a_Pearl_Earring.jpg",
        "dimensions": "44.5 cm x 39 cm",
        "description": "",
        "description_long": "",
        "audio_narration": "",
        "tags": [],
        "highlight": True,
    },
    {
        "id": "great-wave",
        "title": "The Great Wave off Kanagawa",
        "artist": "Katsushika Hokusai",
        "year": 1831,
        "movement": "Ukiyo-e",
        "origin": "Japan",
        "medium": "Woodblock print",
        "museum": "Met Museum, New York",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg",
        "image_url_3d": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg",
        "image_url_hd": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg",
        "dimensions": "25.7 cm x 37.8 cm",
        "description": "",
        "description_long": "",
        "audio_narration": "",
        "tags": [],
        "highlight": True,
    },
]


class CuratorAgent:
    def __init__(self):
        self.archivist = ArchivistAgent()

    async def select_artworks(self, api_limit: int = 2000) -> list[dict]:
        logger.info(f"Curator: archivist fetching {api_limit} artworks from APIs")
        api_works = await self.archivist.fetch_artworks(limit=api_limit)
        combined = CORE_MASTERPIECES.copy() + api_works
        logger.info(f"Curator: {len(CORE_MASTERPIECES)} core + {len(api_works)} API = {len(combined)} total")
        return combined
