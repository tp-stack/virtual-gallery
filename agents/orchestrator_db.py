import asyncio
import logging
import os
import sys

from archivist_agent import ArchivistAgent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("Orchestrator")


async def run():
    logger.info("Starting Virtual Gallery DB Population Pipeline")

    limit_str = os.environ.get("FETCH_LIMIT", "50000")
    limit = int(limit_str) if limit_str else 50000

    agent = ArchivistAgent()
    total = await agent.fetch_and_store(limit=limit)

    logger.info(f"Pipeline complete. Database has {total} artworks.")
    return total


if __name__ == "__main__":
    asyncio.run(run())
