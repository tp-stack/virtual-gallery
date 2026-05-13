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
        logger.info(f"Curator selected {len(raw_artworks)} artworks")

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
        logger.info(f"{len(verified)} artworks passed compliance and enriched")

        gallery = await self.designer.arrange(verified)
        self._log_step("designer_arrange", gallery["rooms"])

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
