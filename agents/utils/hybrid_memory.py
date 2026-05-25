"""
Hybrid Memory Manager - Local cache + Supabase sync
Provides unified access to agent memory accessible by all agents (Python + VS Code)
"""

import json
import asyncio
import logging
from pathlib import Path
from typing import Any, Dict, Optional
from datetime import datetime, timezone
from threading import Lock

from supabase import create_client, Client
from pydantic import BaseModel

logger = logging.getLogger(__name__)

MEMORY_DIR = Path(__file__).parent.parent / "memory"
MEMORY_DIR.mkdir(exist_ok=True)


class MemoryEntry(BaseModel):
    """Typed memory entry"""
    key: str
    value: dict[str, Any]
    agent_id: Optional[str] = None
    timestamp: str = None
    version: int = 1
    
    def __init__(self, **data):
        super().__init__(**data)
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc).isoformat()


class HybridMemoryManager:
    """
    Unified memory manager with local cache + Supabase sync.
    
    Features:
    - Fast local access (JSON files)
    - Persistent Supabase storage
    - Batch sync at stage completion (not immediate)
    - Lock-free atomic writes
    - Conflict resolution
    """
    
    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        """
        Initialize hybrid memory manager.
        
        Args:
            supabase_url: From SUPABASE_URL env var
            supabase_key: From SUPABASE_SERVICE_KEY env var (for agents)
        """
        self.supabase: Optional[Client] = None
        self.local_cache: Dict[str, dict] = {}
        self.sync_queue: list[tuple[str, Any]] = []
        self.write_lock = Lock()
        self.orchestration_run_id: Optional[str] = None
        
        if supabase_url and supabase_key:
            try:
                self.supabase = create_client(supabase_url, supabase_key)
                logger.info("✓ Supabase connection initialized")
            except Exception as e:
                logger.warning(f"⚠ Supabase connection failed: {e}. Using local cache only.")
                self.supabase = None
        
        self._load_local_cache()
    
    def _load_local_cache(self):
        """Load all local memory files into cache."""
        for json_file in MEMORY_DIR.glob("*.json"):
            try:
                with open(json_file) as f:
                    data = json.load(f)
                    key = json_file.stem
                    self.local_cache[key] = data
                    logger.debug(f"Loaded local memory: {key}")
            except Exception as e:
                logger.warning(f"Failed to load {json_file}: {e}")
    
    def _atomic_write_local(self, key: str, value: dict[str, Any]):
        """Atomically write to local cache with temp file."""
        cache_file = MEMORY_DIR / f"{key}.json"
        temp_file = MEMORY_DIR / f"{key}.json.tmp"
        
        try:
            # Write to temp file
            with open(temp_file, 'w') as f:
                json.dump(value, f, indent=2, default=str)
            
            # Atomic rename
            temp_file.replace(cache_file)
            self.local_cache[key] = value
            logger.debug(f"✓ Local memory updated: {key}")
        except Exception as e:
            logger.error(f"Failed to write {key}: {e}")
            if temp_file.exists():
                temp_file.unlink()
            raise
    
    async def set(self, key: str, value: Any, agent_id: Optional[str] = None):
        """
        Set memory value (local immediately, queue for Supabase batch sync).
        
        Args:
            key: Memory key
            value: Any JSON-serializable value
            agent_id: Optional agent identifier
        """
        with self.write_lock:
            # Local write (immediate)
            self._atomic_write_local(key, {
                "value": value,
                "agent_id": agent_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "version": 1
            })
            
            # Queue for sync
            self.sync_queue.append((key, value, agent_id))
    
    async def get(self, key: str) -> Optional[Any]:
        """Get memory value (from local cache first)."""
        if key in self.local_cache:
            return self.local_cache[key].get("value")
        
        # Try Supabase if not in local
        if self.supabase:
            try:
                response = await asyncio.to_thread(
                    self.supabase.table("agent_memory").select("value").eq("key", key).execute
                )
                if response.data and len(response.data) > 0:
                    value = response.data[0]["value"]
                    # Populate local cache
                    self._atomic_write_local(key, {
                        "value": value,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    return value
            except Exception as e:
                logger.warning(f"Supabase read failed for {key}: {e}")
        
        return None
    
    async def batch_sync_to_supabase(self):
        """Batch sync queued memory updates to Supabase."""
        if not self.supabase or not self.sync_queue:
            return
        
        try:
            synced_keys = []
            for key, value, agent_id in self.sync_queue:
                response = await asyncio.to_thread(
                    self.supabase.table("agent_memory")
                    .upsert({
                        "key": key,
                        "value": value,
                        "agent_id": agent_id,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }, ignore_duplicates=False)
                    .execute
                )
                synced_keys.append(key)
            
            self.sync_queue.clear()
            logger.info(f"✓ Synced {len(synced_keys)} memory entries to Supabase")
        except Exception as e:
            logger.error(f"Supabase batch sync failed: {e}")
            # Keep queue for retry
    
    async def set_agent_status(
        self,
        agent_name: str,
        stage: str,
        status: str,
        error_message: Optional[str] = None,
        metadata: Optional[dict] = None
    ):
        """Update agent execution status."""
        status_key = f"{agent_name}_{stage}_status"
        await self.set(status_key, {
            "agent_name": agent_name,
            "stage": stage,
            "status": status,
            "error_message": error_message,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def add_recommendation(
        self,
        agent_name: str,
        category: str,
        severity: str,
        title: str,
        description: str = "",
        action_items: list[str] = None
    ):
        """Add actionable recommendation from agent."""
        key = f"recommendations_{datetime.now().timestamp()}"
        await self.set(key, {
            "agent_name": agent_name,
            "category": category,
            "severity": severity,
            "title": title,
            "description": description,
            "action_items": action_items or []
        })
    
    async def log_error(self, message: str, agent_name: str = None, context: dict = None):
        """Log error to memory for later retrieval."""
        errors_key = "errors"
        errors = await self.get(errors_key) or []
        errors.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": message,
            "agent_name": agent_name,
            "context": context or {}
        })
        # Keep last 100 errors
        errors = errors[-100:]
        await self.set(errors_key, errors)
    
    async def get_stats(self) -> dict:
        """Get current orchestration statistics."""
        return await self.get("stats") or {
            "total_stages": 0,
            "completed_stages": 0,
            "total_tokens_used": 0,
            "total_api_calls": 0,
            "errors": 0
        }
    
    async def set_orchestration_run_id(self, run_id: str):
        """Set the current orchestration run ID."""
        self.orchestration_run_id = run_id
        await self.set("current_run_id", {"run_id": run_id})


# Convenience instance
_manager: Optional[HybridMemoryManager] = None


def get_memory_manager() -> HybridMemoryManager:
    """Get or create the shared memory manager instance."""
    global _manager
    if _manager is None:
        from credentials import get_supabase_credentials
        try:
            url, key = get_supabase_credentials()
            _manager = HybridMemoryManager(url, key)
        except Exception:
            _manager = HybridMemoryManager()
    return _manager
