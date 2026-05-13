import logging
from collections import defaultdict
from typing import Any

logger = logging.getLogger("DesignerAgent")

ROOM_STYLES = {
    "Renaissance": {"wall_color": "#F5F0E8", "floor": "marble", "lighting": "warm", "ambience": "classical"},
    "Baroque": {"wall_color": "#2C1810", "floor": "dark_wood", "lighting": "dramatic", "ambience": "theatrical"},
    "Impressionism": {"wall_color": "#E8E0D0", "floor": "light_oak", "lighting": "natural", "ambience": "airy"},
    "Post-Impressionism": {"wall_color": "#D4C5A9", "floor": "stone", "lighting": "warm", "ambience": "contemplative"},
    "Romanticism": {"wall_color": "#3A2D2D", "floor": "dark_wood", "lighting": "moody", "ambience": "dramatic"},
    "Expressionism": {"wall_color": "#1A1A2E", "floor": "concrete", "lighting": "spotlit", "ambience": "intense"},
    "Surrealism": {"wall_color": "#0F0F1A", "floor": "black_mirror", "lighting": "neon", "ambience": "dreamlike"},
    "Ukiyo-e": {"wall_color": "#1A2634", "floor": "tatami", "lighting": "soft_paper", "ambience": "zen"},
    "Art Nouveau": {"wall_color": "#2D3B2D", "floor": "parquet", "lighting": "golden", "ambience": "opulent"},
    "American Realism": {"wall_color": "#2B2B2B", "floor": "concrete", "lighting": "diner_fluorescent", "ambience": "noir"},
    "Regionalism": {"wall_color": "#C4B89D", "floor": "pine", "lighting": "midwestern", "ambience": "pastoral"},
}
DEFAULT_STYLE = {"wall_color": "#E8E0D0", "floor": "concrete", "lighting": "neutral", "ambience": "modern"}

class DesignerAgent:
    async def arrange(self, artworks: list[dict]) -> dict:
        rooms: dict[str, list] = defaultdict(list)
        for art in artworks:
            rooms[art.get("movement", "Other")].append(art["id"])

        gallery_rooms = []
        for i, (movement, art_ids) in enumerate(rooms.items()):
            style = ROOM_STYLES.get(movement, DEFAULT_STYLE)
            gallery_rooms.append({
                "id": f"room-{i+1}",
                "name": f"The {movement} Wing",
                "movement": movement,
                "artwork_ids": art_ids,
                "style": style,
            })

        featured = next((a for a in artworks if a.get("highlight")), artworks[0])
        gallery = {
            "name": "The Public Domain Masterpiece Gallery",
            "rooms": len(gallery_rooms),
            "layout": gallery_rooms,
            "featured_artwork": featured["id"],
        }
        logger.info(f"Gallery arranged: {len(gallery_rooms)} rooms")
        return gallery
