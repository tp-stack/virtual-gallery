import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from curator_agent import CuratorAgent
from content_agent import ContentAgent
from compliance_agent import ComplianceAgent
from designer_agent import DesignerAgent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("Orchestrator")

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

class Orchestrator:
    def __init__(self, output_path: str = "../public/data"):
        self.output_path = Path(output_path)
        self.output_path.mkdir(parents=True, exist_ok=True)
        self.curator = CuratorAgent()
        self.content = ContentAgent()
        self.compliance = ComplianceAgent()
        self.designer = DesignerAgent()
        self.pipeline_log: list[dict] = []

    async def run(self):
        logger.info("Starting Virtual Gallery Agent Pipeline")

        raw_artworks = await self.curator.select_artworks()
        self._log_step("curator_select", len(raw_artworks))

        async def verify_and_enrich(artwork: dict) -> dict | None:
            result = await self.compliance.verify(artwork)
            if not result["public_domain"]:
                logger.warning(f"Rejected: {artwork['title']} — {result['reason']}")
                return None
            enriched = await self.content.enrich(artwork)
            enriched["compliance"] = result
            return enriched

        tasks = [verify_and_enrich(art) for art in raw_artworks]
        results = await asyncio.gather(*tasks)
        verified = [r for r in results if r is not None]
        self._log_step("compliance_and_enrich", len(verified))

        gallery_design = await self.designer.arrange(verified)
        self._log_step("designer_arrange", len(gallery_design["rooms"]))

        # Build backward-compatible layout for 2D pages
        layout = []
        for room in gallery_design["rooms"]:
            style = ROOM_STYLES.get(room["movement"], DEFAULT_STYLE)
            layout.append({
                "id": room["id"],
                "name": room["name"],
                "movement": room["movement"],
                "artwork_ids": room["artwork_ids"],
                "artwork_placements": [],
                "style": style,
                "dimensions": {"width": 30, "height": 5, "depth": 20},
                "doorway": {"width": 4, "height": 3.5},
                "position": room["position"],
            })

        # Build artwork_placements from artwork_positions for each room
        for room in layout:
            for art_id in room["artwork_ids"]:
                pos = gallery_design["artwork_positions"].get(art_id)
                if pos:
                    room["artwork_placements"].append({
                        "artwork_id": art_id,
                        "position": {"x": pos["x"], "y": pos["y"], "z": pos["z"]},
                        "rotationY": pos["rotY"],
                        "side": "left" if pos["rotY"] > 0 else "right",
                    })

        gallery = {
            "name": gallery_design["name"],
            "rooms": len(layout),
            "layout": layout,
            "featured_artwork": verified[0]["id"] if verified else "",
            "artwork_positions": gallery_design["artwork_positions"],
            "dimensions": gallery_design["dimensions"],
        }

        final = {
            "gallery": gallery,
            "artworks": verified,
            "pipeline_log": self.pipeline_log,
            "generated_at": datetime.utcnow().isoformat(),
        }

        out_file = self.output_path / "artworks.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(final, f, indent=2, ensure_ascii=False)

        logger.info(f"Pipeline complete — {len(verified)} artworks saved to {out_file}")
        return final

    def _log_step(self, step: str, detail: Any):
        self.pipeline_log.append({"step": step, "detail": detail, "timestamp": datetime.utcnow().isoformat()})

if __name__ == "__main__":
    orch = Orchestrator()
    asyncio.run(orch.run())
