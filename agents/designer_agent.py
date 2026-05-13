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
        movement_groups: dict[str, list[dict]] = defaultdict(list)
        for art in artworks:
            m = art.get("movement", "Other")
            movement_groups[m].append(art)

        gallery_rooms = []
        artwork_positions = {}
        room_index = 0

        movements_sorted = sorted(movement_groups.keys())

        for movement in movements_sorted:
            arts = movement_groups[movement]
            num_rooms = max(1, math.ceil(len(arts) / MAX_PER_ROOM))

            for room_num in range(num_rooms):
                start = room_num * MAX_PER_ROOM
                end = min(start + MAX_PER_ROOM, len(arts))
                room_arts = arts[start:end]

                grid_row = room_index // 3
                grid_col = room_index % 3

                z_pos = grid_row * ROOM_DEPTH + grid_row * 2
                x_pos = grid_col * ROOM_WIDTH

                wall_spacing = ROOM_DEPTH / (len(room_arts) + 1)

                for j, art in enumerate(room_arts):
                    is_left = j % 2 == 0
                    px = x_pos + (2 if is_left else ROOM_WIDTH - 2)
                    pz = z_pos + wall_spacing * (j + 1)
                    rot_y = math.pi / 2 if is_left else -math.pi / 2

                    artwork_positions[art["id"]] = {
                        "x": round(px, 2),
                        "y": 1.6,
                        "z": round(pz, 2),
                        "rotY": round(rot_y, 2),
                    }

                gallery_rooms.append({
                    "id": f"room-{room_index + 1}",
                    "name": f"The {movement} Wing" if num_rooms == 1 else f"The {movement} Wing #{room_num + 1}",
                    "movement": movement,
                    "artwork_ids": [a["id"] for a in room_arts],
                    "position": {"x": x_pos, "y": 0, "z": z_pos},
                    "width": ROOM_WIDTH,
                    "depth": ROOM_DEPTH,
                    "has_back_wall": room_index == 0,
                    "has_front_wall": True,
                })

                room_index += 1

        total_rooms = len(gallery_rooms)
        logger.info(f"Gallery arranged: {total_rooms} rooms for {len(artworks)} artworks")

        return {
            "name": "The Public Domain Masterpiece Gallery",
            "rooms": gallery_rooms,
            "artwork_positions": artwork_positions,
            "dimensions": {"width": ROOM_WIDTH, "height": ROOM_HEIGHT, "depth": ROOM_DEPTH},
        }
