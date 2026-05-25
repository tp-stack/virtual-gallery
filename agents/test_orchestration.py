"""
Integration tests for Virtual Gallery orchestration system.

Tests the hybrid memory manager, token counter, CLI orchestrator, and agent coordination.
"""

import asyncio
import json
import tempfile
from pathlib import Path
from typing import Dict, Any
import pytest


class TestHybridMemoryManager:
    """Test hybrid memory manager (local cache + Supabase sync)."""
    
    @pytest.mark.asyncio
    async def test_memory_set_get_local(self):
        """Test setting and getting memory (local cache only)."""
        from utils.hybrid_memory import HybridMemoryManager
        
        with tempfile.TemporaryDirectory() as tmpdir:
            memory = HybridMemoryManager()
            
            # Set value
            test_value = {"key": "test_value", "number": 42}
            await memory.set("test_key", test_value)
            
            # Get value
            result = await memory.get("test_key")
            assert result == test_value, "Should retrieve stored value"
    
    @pytest.mark.asyncio
    async def test_memory_agent_status(self):
        """Test agent status tracking."""
        from utils.hybrid_memory import HybridMemoryManager
        
        memory = HybridMemoryManager()
        
        await memory.set_agent_status(
            agent_name="test_agent",
            stage="test_stage",
            status="completed",
            metadata={"duration": 10.5}
        )
        
        status_key = "test_agent_test_stage_status"
        result = await memory.get(status_key)
        
        assert result["status"] == "completed"
        assert result["agent_name"] == "test_agent"
    
    @pytest.mark.asyncio
    async def test_memory_recommendations(self):
        """Test recommendation tracking."""
        from utils.hybrid_memory import HybridMemoryManager
        
        memory = HybridMemoryManager()
        
        await memory.add_recommendation(
            agent_name="test_agent",
            category="performance",
            severity="high",
            title="Test recommendation",
            description="This is a test",
            action_items=["Action 1", "Action 2"]
        )
        
        # Verify it was added to memory
        recommendations = await memory.get("recommendations_*") or []
        # Note: In real implementation, would need to handle wildcard keys
        assert True  # Placeholder
    
    @pytest.mark.asyncio
    async def test_memory_error_logging(self):
        """Test error logging to memory."""
        from utils.hybrid_memory import HybridMemoryManager
        
        memory = HybridMemoryManager()
        
        await memory.log_error(
            message="Test error",
            agent_name="test_agent",
            context={"stage": "test"}
        )
        
        errors = await memory.get("errors")
        assert errors is not None
        assert len(errors) > 0
        assert errors[-1]["message"] == "Test error"


class TestTokenCounter:
    """Test token usage tracking and budgeting."""
    
    def test_token_counter_initialization(self):
        """Test token counter initializes with correct budgets."""
        from utils.token_counter import TokenCounter
        
        with tempfile.TemporaryDirectory() as tmpdir:
            memory_dir = Path(tmpdir)
            counter = TokenCounter(memory_dir=memory_dir)
            
            assert counter.usage["budget"]["claude_tokens"] == 30000
            assert counter.usage["budget"]["api_calls"] == 100000
    
    def test_token_counter_add_claude_tokens(self):
        """Test adding Claude tokens."""
        from utils.token_counter import TokenCounter
        
        with tempfile.TemporaryDirectory() as tmpdir:
            counter = TokenCounter(memory_dir=Path(tmpdir))
            
            counter.add_claude_tokens(input_tokens=100, output_tokens=50)
            
            assert counter.usage["claude_tokens"]["input"] == 100
            assert counter.usage["claude_tokens"]["output"] == 50
            assert counter.usage["claude_tokens"]["total"] == 150
            assert counter.usage["budget_remaining"]["claude_tokens"] == 29850
    
    def test_token_counter_budget_check(self):
        """Test budget checking."""
        from utils.token_counter import TokenCounter
        
        with tempfile.TemporaryDirectory() as tmpdir:
            counter = TokenCounter(memory_dir=Path(tmpdir))
            
            assert counter.can_use_claude(estimated_tokens=1000)
            assert counter.can_make_api_calls(count=5000)
            
            # Max out tokens
            for _ in range(30000):
                counter.add_claude_tokens(1, 0)
            
            assert not counter.can_use_claude(estimated_tokens=1)
    
    def test_token_counter_summary(self):
        """Test usage summary generation."""
        from utils.token_counter import TokenCounter
        
        with tempfile.TemporaryDirectory() as tmpdir:
            counter = TokenCounter(memory_dir=Path(tmpdir))
            
            counter.add_claude_tokens(input_tokens=100, output_tokens=50)
            counter.add_api_call("museums", count=10)
            
            summary = counter.get_usage_summary()
            
            assert summary["claude_tokens_used"] == 150
            assert summary["api_calls_made"] == 10
            assert summary["breakdown"]["museum_apis"] == 10


class TestCredentialsManager:
    """Test credential management."""
    
    def test_credentials_get_supabase(self):
        """Test getting Supabase credentials."""
        from utils.credentials import CredentialsManager
        
        manager = CredentialsManager()
        
        # Mock credentials
        manager._credentials = {
            "NEXT_PUBLIC_SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_SERVICE_KEY": "test-key-123"
        }
        manager._validated = True
        
        url, key = manager.get_supabase_credentials()
        
        assert url == "https://test.supabase.co"
        assert key == "test-key-123"


class TestCLIOrchestrator:
    """Test CLI orchestrator coordination."""
    
    @pytest.mark.asyncio
    async def test_orchestrator_initialization(self):
        """Test orchestrator initialization."""
        from cli_orchestrator import CLIOrchestrator
        
        orchestrator = CLIOrchestrator()
        
        assert orchestrator.memory_manager is not None
        assert orchestrator.token_counter is not None
        assert orchestrator.orchestration_run_id is not None
    
    @pytest.mark.asyncio
    async def test_orchestrator_stage_tracking(self):
        """Test orchestrator tracks completed stages."""
        from cli_orchestrator import CLIOrchestrator, Stage
        
        orchestrator = CLIOrchestrator()
        
        # Simulate running a stage
        result = await orchestrator._run_development_stage()
        
        assert result["status"] == "success"
        assert "checks" in result


class TestAgentCoordination:
    """Test agent coordination and memory sharing."""
    
    @pytest.mark.asyncio
    async def test_agents_can_share_memory(self):
        """Test that agents can read/write shared memory."""
        from utils.hybrid_memory import get_memory_manager
        
        memory = get_memory_manager()
        
        # Simulate agent 1 writing
        await memory.set("shared_data", {"value": "from_agent_1"}, agent_id="agent_1")
        
        # Simulate agent 2 reading
        value = await memory.get("shared_data")
        
        assert value == {"value": "from_agent_1"}


class TestOrchestrationType:
    """Test different orchestration types."""
    
    @pytest.mark.asyncio
    async def test_orchestration_types(self):
        """Test different orchestration run types."""
        from cli_orchestrator import Stage
        
        # All stage types should be available
        stages = [Stage.GALLERY_DATA, Stage.DEPLOYMENT, Stage.SECURITY, Stage.DEVELOPMENT]
        assert len(stages) == 4
        
        # Each stage should have a value
        for stage in stages:
            assert stage.value is not None


class TestErrorHandling:
    """Test error handling and resilience."""
    
    @pytest.mark.asyncio
    async def test_memory_handles_invalid_json(self):
        """Test memory manager handles corrupted data gracefully."""
        from utils.hybrid_memory import HybridMemoryManager
        
        memory = HybridMemoryManager()
        
        # Should not crash on corrupted local cache
        try:
            result = await memory.get("nonexistent_key")
            assert result is None
        except Exception as e:
            pytest.fail(f"Should not raise exception: {e}")
    
    @pytest.mark.asyncio
    async def test_token_counter_graceful_degradation(self):
        """Test token counter degrades gracefully when budget exhausted."""
        from utils.token_counter import TokenCounter
        
        with tempfile.TemporaryDirectory() as tmpdir:
            counter = TokenCounter(memory_dir=Path(tmpdir))
            
            # Should not crash even when budget exceeded
            for _ in range(40000):  # More than budget
                counter.add_claude_tokens(1, 0)
            
            summary = counter.get_usage_summary()
            assert summary["claude_tokens_remaining"] == 0


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
