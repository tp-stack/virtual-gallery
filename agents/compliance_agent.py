import logging
from datetime import datetime
from typing import Any

logger = logging.getLogger("ComplianceAgent")

PD_WHITELIST = {
    "mona-lisa", "starry-night", "girl-pearl-earring", "great-wave",
    "night-watch", "birth-venus", "liberty-leading", "wanderer-fog",
    "american-gothic", "sunday-la-grande-jatte", "nighthawks",
    "kiss-klimt", "persistence-memory", "milkmaid",
    "sistine-chapel", "water-lilies", "scream", "luncheon-boating",
}

OPEN_ACCESS_MUSEUMS = {
    "aic", "met", "cleveland", "vam", "core", "europeana", "wellcome", "finna", "wikimedia",
}


class ComplianceAgent:
    async def verify(self, artwork: dict) -> dict:
        art_id = artwork.get("id", "unknown")
        year = artwork.get("year")
        source_api = artwork.get("source_api", "")

        if art_id in PD_WHITELIST:
            return {"public_domain": True, "reason": "Whitelisted", "jurisdiction": "global", "confidence": 1.0}

        # Museum open access APIs guarantee public domain for their collections
        if source_api in OPEN_ACCESS_MUSEUMS:
            return {"public_domain": True, "reason": f"Open access via {source_api}", "jurisdiction": "global", "confidence": 0.95}

        current_year = datetime.now().year
        if year and year <= 1928:
            return {"public_domain": True, "reason": f"Created {year}; {current_year - year} years ago PD in US/EU", "jurisdiction": "US/EU", "confidence": 0.95}

        return {"public_domain": False, "reason": f"Created {year} may still be under copyright", "jurisdiction": "US", "confidence": 0.9}
