---
name: gallery-orchestration
description: "Orchestrate the full Virtual Gallery development and deployment lifecycle with multi-agent coordination, token budgeting, and memory management. Use when: running gallery data pipelines, managing deployments, performing security audits, coordinating multi-stage workflows, optimizing token usage, accessing shared memory across agents."
---

# Gallery Orchestration Skill

Master skill for orchestrating the complete Virtual Gallery project lifecycle with multi-agent coordination, hybrid memory management, and intelligent token usage optimization.

## When to Use

✅ **Running the gallery data pipeline** (artwork curation, compliance, enrichment, categorization, 3D design)
✅ **Preparing for production deployment** (build validation, security checks, database migrations)
✅ **Auditing security and compliance** (RLS policies, vulnerability scanning, licensing verification)
✅ **Coordinating multi-stage workflows** (dev → security → deployment)
✅ **Monitoring token usage and budget** (Claude API + museum API calls)
✅ **Accessing shared memory** (local cache + Supabase sync)

❌ **NOT for**: Single file creation, simple code questions, local development tasks

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  VS Code Copilot Chat (Interactive)                 │
│                                                     │
│  Gallery Orchestrator Agent (coordinator)           │
│  ├─ Data Pipeline Agent (artwork curation)         │
│  ├─ Deployment Agent (build + Supabase)            │
│  └─ Security Agent (audits + compliance)           │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   CLI Orchestrator   Hybrid Memory
   (interactive)      (local + Supabase)
        │                 │
        └────────┬────────┘
                 ▼
      ┌──────────────────────┐
      │  Python Agents       │
      │  • Orchestrator.py   │
      │  • Museum APIs       │
      │  • Token Tracking    │
      └──────────────────────┘
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
  Supabase           Public Data
  (schema)           (artworks.json)
```

## Key Components

### 1. CLI Orchestrator (`agents/cli_orchestrator.py`)

Interactive command-line tool for running orchestration stages.

**Features**:
- Menu-driven stage selection (data pipeline, deployment, security, development)
- Real-time token usage tracking (30k Claude / 100k API budget)
- Batch memory syncing to Supabase
- Production deployment safeguards (requires "DEPLOY" confirmation)

**Usage**:
```bash
cd agents
python cli_orchestrator.py
```

**Stages**:
- `[1] Gallery Data Pipeline` - Curator → Compliance → Content → Categorizer → Designer
- `[2] Deployment & Build` - Build validation, security checks, database migrations
- `[3] Security & Compliance` - RLS audit, vulnerability scanning, license verification
- `[4] Development` - Tests, linting, schema validation
- `[5] Full Lifecycle` - Run all stages in sequence

### 2. Hybrid Memory Manager (`agents/utils/hybrid_memory.py`)

Unified memory access for all agents (Python + VS Code).

**Features**:
- **Local cache**: Fast JSON file access in `agents/memory/`
- **Supabase sync**: Persistent cloud storage, shared across agents
- **Batch syncing**: Sync at stage completion (not continuous)
- **Conflict resolution**: Latest-write-wins strategy

**Key methods**:
```python
# Get memory manager
memory = get_memory_manager()

# Set/get values
await memory.set("my_key", {"data": "value"})
value = await memory.get("my_key")

# Agent-specific operations
await memory.set_agent_status(
    agent_name="data_pipeline",
    stage="compliance",
    status="completed"
)

await memory.add_recommendation(
    agent_name="security_audit",
    category="performance",
    severity="high",
    title="Recommendation title",
    action_items=["Action 1", "Action 2"]
)

# Batch sync to Supabase
await memory.batch_sync_to_supabase()
```

### 3. Token Counter (`agents/utils/token_counter.py`)

Budget-aware token tracking for Claude API + museum APIs.

**Budgets**:
- **Claude**: 30,000 tokens per orchestration run
- **Museum APIs**: 100,000 calls per orchestration run

**Methods**:
```python
counter = get_token_counter()

# Track usage
counter.add_claude_tokens(input_tokens=150, output_tokens=200)
counter.add_api_call("museums", count=5)

# Check budget
if counter.can_use_claude(estimated_tokens=100):
    # Call Claude API
    pass

# Get summary
summary = counter.get_usage_summary()
print(f"Tokens used: {summary['claude_tokens_used']}")
print(f"Remaining: {summary['claude_tokens_remaining']}")
```

### 4. Credentials Manager (`agents/utils/credentials.py`)

Secure server-side credential management (never exposed to frontend).

**Loaded from** `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SECRET_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
CLAUDE_API_KEY=sk-...
MUSEUM_API_KEYS={"met": "...", "aic": "..."}
```

**Usage**:
```python
from credentials import get_supabase_credentials, validate_credentials

# Validate all credentials present
if validate_credentials():
    url, key = get_supabase_credentials()
```

## VS Code Custom Agents

Four specialized agents coordinate different aspects:

### Gallery Orchestrator (`gallery-orchestrator.agent.md`)
**Master coordinator** - Decides which agents to invoke, tracks progress, monitors token budget

### Data Pipeline (`data-pipeline.agent.md`)
**Artwork specialist** - Manages museum API integration, compliance verification, content enrichment

### Deployment (`deployment.agent.md`)
**Ops specialist** - Handles build validation, database migrations, security configuration

### Security & Compliance (`security-compliance.agent.md`)
**Security specialist** - Audits RLS policies, scans vulnerabilities, verifies artwork licensing

## Supabase Tables

Created by migration `supabase/migrations/002_agent_orchestration.sql`:

| Table | Purpose |
|-------|---------|
| `agent_memory` | Shared key-value store for all agents |
| `agent_status` | Tracks execution status of each agent |
| `orchestration_runs` | Main orchestration session records |
| `token_usage` | Claude + API token tracking |
| `pipeline_logs` | Timestamped event log |
| `agent_recommendations` | Actionable feedback from agents |

All tables have RLS policies allowing authenticated users and service role access.

## Common Workflows

### 1. Run Full Gallery Pipeline

```bash
python agents/cli_orchestrator.py
→ Select [5] Full Lifecycle
→ Confirm with "DEPLOY" when prompted
→ Wait for all stages to complete
→ Check reports in agents/memory/
```

**Output**:
- `agents/memory/state.json` - Final orchestration state
- `agents/memory/token_usage.json` - Token consumption report
- `agents/memory/recommendations.json` - Actionable feedback
- `public/data/artworks.json` - Generated gallery data
- Supabase tables populated with metadata

### 2. Run Data Pipeline Only

```bash
python agents/cli_orchestrator.py
→ Select [1] Gallery Data Pipeline
→ View token usage after completion
→ Check agents/memory/ for results
```

### 3. Prepare for Production Deployment

```bash
python agents/cli_orchestrator.py
→ Select [5] Full Lifecycle
  (includes security audit before deployment)
→ Or select [2] Deployment & Build for build-only
→ Type "DEPLOY" to confirm production changes
→ Deployment Agent handles Vercel + Supabase
```

### 4. Security Audit (No Changes)

```bash
python agents/cli_orchestrator.py
→ Select [3] Security & Compliance Audit
→ Review findings in agents/memory/recommendations.json
→ Agent reports vulnerabilities + fixes (read-only)
```

## Token Budget Management

**Real-time tracking**:
- CLI shows token usage after each stage
- Memory manager syncs to Supabase for cross-agent visibility
- Graceful degradation when budget approaches limits

**Budget allocation** (per run):
- Gallery pipeline: ~6-8k Claude tokens
- Security audit: ~2-3k Claude tokens
- Deployment checks: ~1-2k Claude tokens
- Museum APIs: ~10-50k calls (depends on data size)

**Optimization tips**:
- Cache descriptions to avoid regeneration
- Batch museum API calls with semaphores
- Reuse categorization results
- Monitor with `agents/memory/token_usage.json`

## Memory System

**Local cache** (`agents/memory/`):
```json
// state.json - Current orchestration state
// token_usage.json - Token tracking
// agent_status.json - Each agent's status
// errors.json - Error log
// recommendations.json - Actionable feedback
```

**Supabase sync**:
- Batch syncs at end of each stage
- Conflict resolution: latest-write-wins
- Available to all agents for cross-coordination

**Access from code**:
```python
from hybrid_memory import get_memory_manager

memory = get_memory_manager()
await memory.set("key", value)  # Local cache immediately
# Syncs to Supabase at batch_sync_to_supabase()
```

## Security Considerations

✅ **Credentials isolated**: All secrets in `.env.local` (never in code)  
✅ **RLS policies**: Supabase tables require authentication  
✅ **No frontend access**: Python agents server-side only  
✅ **Audit trail**: All operations logged to `pipeline_logs` table  
✅ **Production safeguards**: Deployment requires explicit "DEPLOY" confirmation  
✅ **Gradual rollout**: Can test in staging before production  

## Troubleshooting

### Issue: "Supabase connection failed"
**Cause**: Missing `SUPABASE_SERVICE_KEY` in `.env.local`  
**Fix**: Add `SUPABASE_SERVICE_KEY=<your-key>` to `.env.local`

### Issue: Token budget exceeded
**Symptom**: CLI shows "Budget exceeded" message  
**Action**: Wait for next orchestration run or increase limits in `token_counter.py`

### Issue: Memory sync conflicts
**Symptom**: Conflicting values in Supabase  
**Resolution**: Latest-write-wins strategy; check `updated_at` timestamp in `agent_memory` table

### Issue: Museum API rate limits hit
**Symptom**: API calls failing with 429 errors  
**Action**: Reduce concurrent requests (lower semaphore in `archivist_agent.py`)

## Next Steps

1. **Deploy Supabase migration**: Apply `002_agent_orchestration.sql`
2. **Configure `.env.local`**: Add `SUPABASE_SERVICE_KEY`
3. **Run CLI**: `python agents/cli_orchestrator.py`
4. **Select stages**: Start with [1] data pipeline or [5] full lifecycle
5. **Monitor progress**: Watch memory files and token usage
6. **Review reports**: Check `agents/memory/recommendations.json`

## Resources

- **Agent reference**: See `.github/agents/` directory
- **Python utilities**: `agents/utils/` (memory, tokens, credentials)
- **Database schema**: `supabase/migrations/002_agent_orchestration.sql`
- **Data flow**: `agents/orchestrator.py` and `orchestrator_enhanced.py`
