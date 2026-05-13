import logging
from collections import defaultdict
from typing import Any
import math

logger = logging.getLogger("DesignerAgent")

ROOM_DIMENSIONS = {"width": 30, "height": 5, "depth": 20}

class DesignerAgent:
    async def arrange(self, artworks: list[dict]) -> dict:
        rooms_dict = defaultdict(list)
        for art in artworks:
            movement = art.get("movement", "Other")
            rooms_dict[movement].append(art)

        gallery_rooms = []
        artwork_positions = {}

        for i, (movement, arts) in enumerate(rooms_dict.items()):
            room_z = i * ROOM_DIMENSIONS["depth"]

            wall_spacing = ROOM_DIMENSIONS["depth"] / (len(arts) + 1)

            for j, art in enumerate(arts):
                is_left_wall = j % 2 == 0
                x = 2 if is_left_wall else ROOM_DIMENSIONS["width"] - 2
                z = room_z + (wall_spacing * (j + 1))
                rot_y = math.pi / 2 if is_left_wall else -math.pi / 2

                artwork_positions[art["id"]] = {
                    "x": round(x, 2), "y": 1.6, "z": round(z, 2), "rotY": round(rot_y, 2),
                }

            gallery_rooms.append({
                "id": f"room-{i+1}",
                "name": f"The {movement} Wing",
                "movement": movement,
                "artwork_ids": [art["id"] for art in arts],
                "position": {"x": 0, "y": 0, "z": room_z},
                "doorway_z": room_z + ROOM_DIMENSIONS["depth"],
            })

        return {
            "name": "The Public Domain Masterpiece Gallery",
            "rooms": gallery_rooms,
            "artwork_positions": artwork_positions,
            "dimensions": ROOM_DIMENSIONS,
        }
