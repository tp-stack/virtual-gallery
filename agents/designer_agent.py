import logging
import math
from collections import defaultdict
from typing import Any

logger = logging.getLogger("DesignerAgent")

ROOM_WIDTH = 30
ROOM_DEPTH = 20
ROOM_HEIGHT = 5
MAX_PER_ROOM = 10


class DesignerAgent:
    async def arrange(self, artworks: list[dict]) -> dict:
        rooms = []
        artwork_positions = {}

        total = len(artworks)
        num_rooms = max(1, math.ceil(total / MAX_PER_ROOM))

        for room_idx in range(num_rooms):
            start = room_idx * MAX_PER_ROOM
            end = min(start + MAX_PER_ROOM, total)
            room_arts = artworks[start:end]

            z_pos = room_idx * ROOM_DEPTH + room_idx * 2
            wall_spacing = ROOM_DEPTH / (len(room_arts) + 1)

            for j, art in enumerate(room_arts):
                is_left = j % 2 == 0
                px = 2 if is_left else ROOM_WIDTH - 2
                pz = z_pos + wall_spacing * (j + 1)
                rot_y = math.pi / 2 if is_left else -math.pi / 2

                artwork_positions[art["id"]] = {
                    "x": round(px, 2),
                    "y": 1.6,
                    "z": round(pz, 2),
                    "rotY": round(rot_y, 2),
                }

            rooms.append({
                "id": f"room-{room_idx + 1}",
                "name": f"Gallery {room_idx + 1}",
                "movement": "",
                "artwork_ids": [a["id"] for a in room_arts],
                "position": {"x": 0, "y": 0, "z": z_pos},
                "width": ROOM_WIDTH,
                "depth": ROOM_DEPTH,
            })

        logger.info(f"Gallery arranged: {num_rooms} rooms in a line for {total} artworks")
        return {
            "name": "The Public Domain Masterpiece Gallery",
            "rooms": rooms,
            "artwork_positions": artwork_positions,
            "dimensions": {"width": ROOM_WIDTH, "height": ROOM_HEIGHT, "depth": ROOM_DEPTH},
        }
