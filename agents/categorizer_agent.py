import logging
import re
from typing import Any

logger = logging.getLogger("CategorizerAgent")

PERIOD_MAP = [
    (1400, 1520, "Renaissance"),
    (1520, 1600, "Mannerism"),
    (1600, 1750, "Baroque"),
    (1720, 1770, "Rococo"),
    (1750, 1830, "Neoclassicism"),
    (1790, 1880, "Romanticism"),
    (1830, 1870, "Realism"),
    (1860, 1890, "Impressionism"),
    (1880, 1910, "Post-Impressionism"),
    (1890, 1910, "Art Nouveau"),
    (1905, 1915, "Expressionism"),
    (1908, 1920, "Cubism"),
    (1910, 1935, "Futurism"),
    (1916, 1924, "Dada"),
    (1920, 1940, "Surrealism"),
    (1925, 1955, "Art Deco"),
    (1930, 1960, "Abstract Expressionism"),
    (1955, 1970, "Pop Art"),
    (1960, 1975, "Minimalism"),
    (1965, 1985, "Conceptual Art"),
]

MOVEMENT_KEYWORDS = {
    "renaissance": "Renaissance",
    "baroque": "Baroque",
    "rococo": "Rococo",
    "neoclassical": "Neoclassicism",
    "romantic": "Romanticism",
    "realism": "Realism",
    "impressionis": "Impressionism",
    "post-impressionis": "Post-Impressionism",
    "art nouveau": "Art Nouveau",
    "expressionis": "Expressionism",
    "cubis": "Cubism",
    "futuris": "Futurism",
    "dada": "Dada",
    "surrealis": "Surrealism",
    "art deco": "Art Deco",
    "abstract expressionis": "Abstract Expressionism",
    "pop art": "Pop Art",
    "minimalis": "Minimalism",
    "conceptual": "Conceptual Art",
    "modern": "Modern",
    "contemporary": "Contemporary",
    "ukiyo": "Ukiyo-e",
    "japanese": "Ukiyo-e",
}

STYLES = ["portrait", "landscape", "still life", "abstract", "religious", "mythological",
          "historical", "genre", "marina", "cityscape", "nude", "animal", "floral"]


class CategorizerAgent:
    async def categorize(self, artwork: dict) -> dict:
        title = (artwork.get("title") or "").lower()
        artist = (artwork.get("artist") or "").lower()
        medium = (artwork.get("medium") or "").lower()
        desc = (artwork.get("description_long") or "").lower()
        movement = artwork.get("movement") or ""
        year = artwork.get("year") or 0
        combined = f"{title} {artist} {medium} {desc} {movement}"

        # 1. Detect movement from text
        detected_movement = ""
        if not movement or movement in ("Unknown", "Arts of the Americas"):
            for keyword, result in MOVEMENT_KEYWORDS.items():
                if keyword in combined:
                    detected_movement = result
                    break

        # 2. Fall back to year-based period
        if not detected_movement and year:
            for start, end, period in PERIOD_MAP:
                if start <= year <= end:
                    detected_movement = period
                    break
            if not detected_movement and year < 1400:
                detected_movement = "Pre-Renaissance"
            elif not detected_movement and year > 1985:
                detected_movement = "Contemporary"

        final_movement = movement if movement and movement not in (
            "Unknown", "Arts of the Americas") else detected_movement

        # 3. Detect tags/styles
        tags = set(artwork.get("tags") or [])
        for style in STYLES:
            if style in combined:
                tags.add(style)
        tags.discard("")

        # 4. Generate description if missing
        desc_long = artwork.get("description_long") or artwork.get("description") or ""
        if not desc_long:
            desc_long = f"{artwork.get('title', 'Untitled')}, created by {artwork.get('artist', 'Unknown')} in {artwork.get('year', 'unknown')}. "
            if final_movement:
                desc_long += f"This work is associated with the {final_movement} movement. "
            if artwork.get("medium"):
                desc_long += f"Medium: {artwork['medium']}. "
            if artwork.get("museum"):
                desc_long += f"Collection: {artwork['museum']}."

        # 5. Set highlight for well-known artworks
        highlight = artwork.get("highlight", False)
        if not highlight and artist and year:
            famous = ["mona lisa", "starry night", "the scream", "girl with a pearl earring",
                      "great wave", "night watch", "birth of venus", "persistence of memory"]
            if any(f in title for f in famous):
                highlight = True

        artwork["movement"] = final_movement or "Unknown"
        artwork["tags"] = sorted(tags)
        artwork["description"] = artwork.get("description") or (desc_long[:100] + "...")
        artwork["description_long"] = desc_long
        artwork["highlight"] = highlight

        return artwork
