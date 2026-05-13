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

ROOM_WIDTH = 30
ROOM_DEPTH = 20
ROOM_HEIGHT = 5
DOORWAY_WIDTH = 4
DOORWAY_HEIGHT = 3.5
WALL_THICKNESS = 0.3

class DesignerAgent:
    async def arrange(self, artworks: list[dict]) -> dict:
        rooms: dict[str, list] = defaultdict(list)
        for art in artworks:
            rooms[art.get("movement", "Other")].append(art)

        gallery_rooms = []
        for i, (movement, arts) in enumerate(rooms.items()):
            style = ROOM_STYLES.get(movement, DEFAULT_STYLE)
            z_pos = i * ROOM_DEPTH

            art_placements = []
            count = len(arts)
            spacing = ROOM_WIDTH * 0.7 / max(count, 1)

            for j, art in enumerate(arts):
                side = "left" if j % 2 == 0 else "right"
                offset = ((j // 2) + 0.5) * spacing - ROOM_WIDTH * 0.35
                x = offset if side == "left" else offset
                z = z_pos + ROOM_DEPTH * 0.3
                rot_y = 0 if side == "left" else 0

                art_placements.append({
                    "artwork_id": art["id"],
                    "position": {"x": round(x, 2), "y": 1.6, "z": round(z, 2)},
                    "rotationY": round(rot_y, 2),
                    "side": side,
                })

            gallery_rooms.append({
                "id": f"room-{i+1}",
                "name": f"The {movement} Wing",
                "movement": movement,
                "artwork_ids": [a["id"] for a in arts],
                "artwork_placements": art_placements,
                "style": style,
                "dimensions": {"width": ROOM_WIDTH, "height": ROOM_HEIGHT, "depth": ROOM_DEPTH},
                "doorway": {"width": DOORWAY_WIDTH, "height": DOORWAY_HEIGHT},
                "position": {"x": 0, "y": 0, "z": z_pos},
            })

        foyer = {
            "id": "room-0",
            "name": "Grand Entrance",
            "movement": "Foyer",
            "artwork_ids": [],
            "artwork_placements": [],
            "style": {"wall_color": "#1A1A1A", "floor": "polished_concrete", "lighting": "warm", "ambience": "grand"},
            "dimensions": {"width": ROOM_WIDTH, "height": ROOM_HEIGHT, "depth": 10},
            "doorway": {"width": DOORWAY_WIDTH, "height": DOORWAY_HEIGHT},
            "position": {"x": 0, "y": 0, "z": -10},
        }
        gallery_rooms.insert(0, foyer)

        featured = next((a for a in artworks if a.get("highlight")), artworks[0])
        gallery = {
            "name": "The Public Domain Masterpiece Gallery",
            "rooms": len(gallery_rooms),
            "layout": gallery_rooms,
            "featured_artwork": featured["id"],
        }
        logger.info(f"Gallery arranged: {len(gallery_rooms)} rooms")
        return gallery
