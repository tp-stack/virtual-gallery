# Virtual Gallery Agent Orchestration System - Setup Guide

Complete setup and deployment guide for the multi-agent orchestration system.

**Status**: ✅ Ready for Deployment  
**Version**: 1.0  
**Last Updated**: May 25, 2026

---

## 📋 Quick Start

### 1. Prerequisites
```bash
✓ Python 3.11+
✓ Node.js 18+ (for Next.js)
✓ Supabase project (cloud.supabase.com)
✓ Vercel account (vercel.com)
✓ Claude API key
```

### 2. Environment Setup

**Step 1**: Create `.env.local` in project root
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=eyJhbGc...  # Service role key (server-side)
SUPABASE_SERVICE_KEY=eyJhbGc...  # Same as above for agents

# Claude API
CLAUDE_API_KEY=sk-...

# Optional: Museum API keys
MUSEUM_API_KEYS={"met": "your-key", "aic": "your-key"}
```

**Step 2**: Apply Supabase migrations
```bash
# Connect to your Supabase project
supabase link --project-ref your-project-ref

# Apply migrations
supabase migration up
```

This creates tables:
- `agent_memory` - Shared state for all agents
- `agent_status` - Execution tracking
- `orchestration_runs` - Session records
- `token_usage` - Budget tracking
- `pipeline_logs` - Event logging
- `agent_recommendations` - Feedback

**Step 3**: Install Python dependencies
```bash
cd agents
pip install -r requirements.txt
pip install supabase python-dotenv pytest pytest-asyncio
```

### 3. Verify Installation

```bash
# Test credentials
python -c "from utils.credentials import validate_credentials; print(validate_credentials())"

# Test memory manager
python -c "from utils.hybrid_memory import get_memory_manager; m = get_memory_manager(); print('✓ Memory OK')"

# Run tests
pytest test_orchestration.py -v
```

---

## 🚀 Usage

### Interactive CLI (Recommended)

```bash
cd agents
python cli_orchestrator.py
```

**Menu Options**:
```
[1] Gallery Data Pipeline       Curator → Compliance → Content → Categorizer → Designer
[2] Deployment & Build          Build validation, security checks, migrations
[3] Security & Compliance Audit RLS policies, vulnerabilities, licenses
[4] Development                 Tests, linting, schema validation
[5] Full Lifecycle              Run all stages in sequence
[6] View Memory & Stats         Current state and recommendations
[7] Execute Selected            Run previously selected stages
[0] Exit
```

### Example Workflows

**Run Gallery Data Pipeline Only**:
```bash
python cli_orchestrator.py
→ Select [1]
→ Wait for completion
→ Check agents/memory/ for results
```

**Full Production Deployment**:
```bash
python cli_orchestrator.py
→ Select [5] Full Lifecycle
→ Type "DEPLOY" when prompted
→ Agent runs: Gallery → Development → Security → Deployment
→ Deployment to Vercel + Supabase
```

**Security Audit (Non-Destructive)**:
```bash
python cli_orchestrator.py
→ Select [3] Security & Compliance
→ Agent reviews RLS, vulnerabilities, licensing
→ Saves recommendations to memory (no changes made)
```

---

## 📊 Token Budget & Optimization

### Budget Limits (Per Run)

| Resource | Limit | Typical Use |
|----------|-------|------------|
| Claude Input | 30,000 tokens | Content generation, categorization |
| Museum APIs | 100,000 calls | Artwork fetching, metadata |
| Supabase Queries | Unlimited | Database operations |

### Real-Time Monitoring

During execution, the CLI displays:
```
🔗 Token Usage:
  Claude tokens used: 4,250 / 30,000
  API calls made: 15,230 / 100,000
  Remaining: 25,750 tokens, 84,770 API calls
```

### Optimization Tips

**1. Cache Results**
```python
# Memory manager auto-caches descriptions
await memory.set("artwork_description_cache", {"id": "desc"})
# Reuse on next run
```

**2. Batch API Calls**
```python
# Use semaphores for rate limiting
semaphore = asyncio.Semaphore(20)  # Max 20 concurrent requests
async with semaphore:
    result = await fetch_from_api(url)
```

**3. Monitor with Supabase**
```sql
-- Check token usage
SELECT api_type, SUM(tokens_used) as total
FROM token_usage
WHERE orchestration_run_id = 'run-uuid'
GROUP BY api_type;
```

---

## 🔒 Security Configuration

### 1. Credentials Management

**✅ DO**:
- Store secrets in `.env.local`
- Use `SUPABASE_SERVICE_KEY` for agent operations
- Rotate API keys regularly
- Keep `.env.local` in `.gitignore`

**❌ DON'T**:
- Commit `.env.local` to Git
- Log credentials or API keys
- Hardcode secrets in Python files
- Use frontend keys for agents

### 2. Supabase RLS Policies

All agent tables have Row Level Security:

```sql
-- Agents can read/write their own data
CREATE POLICY agent_memory_rls ON agent_memory
  FOR ALL
  USING (auth.role() = 'service_role');
```

Verify with:
```bash
# Query Supabase
supabase db pull

# Check policies in supabase/migrations/
```

### 3. Database Migration Safety

**Before production deployment**:
```bash
# 1. Test in staging
supabase link --project-ref staging-ref
supabase migration up

# 2. Verify data integrity
SELECT COUNT(*) FROM artworks;  -- Should match expected

# 3. Check for errors
SELECT * FROM pipeline_logs WHERE log_level = 'error';

# 4. Deploy to production
supabase link --project-ref prod-ref
supabase migration up
```

---

## 📁 Project Structure

```
virtual-gallery/
├── .github/
│   ├── agents/                           # VS Code custom agents
│   │   ├── gallery-orchestrator.agent.md
│   │   ├── data-pipeline.agent.md
│   │   ├── deployment.agent.md
│   │   └── security-compliance.agent.md
│   └── skills/
│       └── gallery-orchestration/
│           └── SKILL.md                  # Master skill reference
│
├── agents/                               # Python orchestration
│   ├── cli_orchestrator.py               # Interactive CLI
│   ├── orchestrator.py                   # Legacy (data pipeline)
│   ├── orchestrator_enhanced.py          # Legacy (enhanced)
│   ├── orchestrator_db.py                # Database population
│   │
│   ├── utils/
│   │   ├── hybrid_memory.py              # Local + Supabase sync
│   │   ├── credentials.py                # Secure credential management
│   │   ├── token_counter.py              # Budget tracking
│   │   ├── memory_manager.py             # Legacy memory
│   │   ├── logging_helper.py             # Logging utilities
│   │   └── __init__.py
│   │
│   ├── memory/                           # Local cache
│   │   ├── state.json                    # Current state
│   │   ├── agent_status.json             # Agent status
│   │   ├── token_usage.json              # Token tracking
│   │   ├── errors.json                   # Error log
│   │   └── recommendations.json          # Feedback
│   │
│   ├── logs/                             # Orchestration logs
│   │   └── orchestration_*.jsonl
│   │
│   ├── test_orchestration.py             # Integration tests
│   ├── requirements.txt
│   └── README.md
│
├── supabase/
│   └── migrations/
│       ├── 001_create_artworks.sql       # Original artworks table
│       └── 002_agent_orchestration.sql   # Agent infrastructure
│
├── public/
│   └── data/
│       └── artworks.json                 # Generated gallery data
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/                          # API routes
│   ├── lib/
│   │   ├── supabase.ts                   # Client SDK
│   │   └── data.ts                       # Data utilities
│   └── components/
│       ├── GalleryWorld.tsx
│       ├── ArtworkDetail.tsx
│       └── ...
│
├── next.config.mjs                       # Next.js config
├── tsconfig.json                         # TypeScript config
├── package.json
├── .env.local                            # Secrets (local development)
└── .env.production                       # Secrets (Vercel)
```

---

## 🔄 Workflow Stages

### Stage 1: Gallery Data Pipeline

**Executed by**: Data Pipeline Agent  
**Duration**: 2-5 minutes (depends on museum API response times)  
**Steps**:

1. **Curator** - Selects 4 core masterpieces + fetches from museum APIs
2. **Compliance** - Verifies public domain status (date-based or whitelist)
3. **Content** - Enriches descriptions, audio narration, cultural metadata
4. **Categorizer** - Classifies art movements (20 periods), style tags
5. **Designer** - Arranges into 3D gallery rooms, calculates positions

**Outputs**:
- `public/data/artworks.json` - Complete gallery layout
- Supabase `artworks` table populated
- Token usage: ~6-8k Claude tokens

**Memory**:
```json
{
  "stage": "data_pipeline",
  "status": "completed",
  "artworks_count": 847,
  "duration_seconds": 240,
  "token_usage": { ... }
}
```

### Stage 2: Development

**Executed by**: Orchestrator  
**Duration**: 1-2 minutes  
**Checks**:
- TypeScript compilation
- Linting and code quality
- Schema validation
- Unit tests

### Stage 3: Security & Compliance Audit

**Executed by**: Security Agent  
**Duration**: 1-2 minutes  
**Audits**:
- Supabase RLS policies
- Secret management
- Dependency vulnerabilities (npm audit)
- Artwork licensing compliance

### Stage 4: Deployment

**Executed by**: Deployment Agent  
**Duration**: 5-10 minutes  
**Steps**:
1. Build validation (npm run build)
2. Database migrations (supabase migration up)
3. Environment verification
4. Vercel deployment trigger
5. Post-deployment verification

---

## 🐛 Troubleshooting

### Problem: "Supabase connection failed"

**Cause**: Missing or incorrect `SUPABASE_SERVICE_KEY`

**Solution**:
```bash
# Get your service key from Supabase dashboard
# Settings → API → Project API Keys → service_role

# Add to .env.local
SUPABASE_SERVICE_KEY=eyJhbGc...
```

### Problem: Token budget exceeded

**Cause**: Running large pipelines repeatedly

**Solutions**:
```bash
# Option 1: Increase token budget
# Edit agents/utils/token_counter.py
self.usage["budget"]["claude_tokens"] = 50000  # Up from 30k

# Option 2: Reset for new run
python -c "from utils.token_counter import get_token_counter; get_token_counter().reset_for_new_run()"

# Option 3: Check usage
cat agents/memory/token_usage.json | python -m json.tool
```

### Problem: Memory sync conflicts

**Cause**: Multiple agents writing to same key

**Resolution**:
```bash
# Check Supabase for conflicts
SELECT * FROM agent_memory WHERE key='my_key' ORDER BY updated_at DESC;

# Latest write wins - check timestamp
# Delete stale entries manually if needed

DELETE FROM agent_memory 
WHERE key='my_key' AND updated_at < '2026-05-25T10:00:00Z';
```

### Problem: Museum API rate limits

**Cause**: Too many concurrent requests

**Solution**:
```python
# Reduce concurrency in archivist_agent.py
CONCURRENT_REQUESTS = 10  # Down from 20

# Or add retry backoff
async with aiohttp.ClientSession() as session:
    async with asyncio.Semaphore(5):
        result = await fetch(session, url)
```

---

## 📈 Monitoring & Logging

### Real-Time Status

Check status file:
```bash
cat agents/memory/state.json | python -m json.tool
```

### Logs

```bash
# View orchestration logs
tail -f agents/logs/orchestration_*.jsonl

# Query Supabase logs
SELECT * FROM pipeline_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Metrics

```sql
-- Token usage per stage
SELECT stage, SUM(tokens_used) as total
FROM token_usage
WHERE orchestration_run_id = 'run-uuid'
GROUP BY stage;

-- Error rate
SELECT COUNT(*) as error_count
FROM pipeline_logs
WHERE log_level = 'error' AND created_at > NOW() - INTERVAL '24 hours';

-- Recommendation priorities
SELECT severity, COUNT(*) as count
FROM agent_recommendations
WHERE status = 'open'
GROUP BY severity;
```

---

## 🎯 Next Steps

1. ✅ **Deploy Supabase migration**
   ```bash
   supabase migration up
   ```

2. ✅ **Configure `.env.local`**
   ```bash
   # Add all required keys
   ```

3. ✅ **Run verification**
   ```bash
   pytest agents/test_orchestration.py -v
   ```

4. ✅ **Start CLI orchestrator**
   ```bash
   python agents/cli_orchestrator.py
   ```

5. ✅ **Select Full Lifecycle**
   ```
   → [5] Full Lifecycle
   → Type "DEPLOY" when ready
   ```

6. ✅ **Monitor progress**
   ```bash
   watch cat agents/memory/token_usage.json
   ```

7. ✅ **Review results**
   ```bash
   cat agents/memory/recommendations.json | python -m json.tool
   ```

---

## 📚 Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **Claude API**: https://anthropic.com/docs/api
- **Vercel Deployment**: https://vercel.com/docs
- **Project README**: See [../START_HERE.md](../START_HERE.md)
- **Agent Reference**: See [../.github/agents/](../.github/agents/)
- **Skills Reference**: See [../.github/skills/gallery-orchestration/SKILL.md](../.github/skills/gallery-orchestration/SKILL.md)

---

## 📞 Support

For issues or questions:

1. Check **Troubleshooting** section above
2. Review agent logs: `agents/logs/orchestration_*.jsonl`
3. Query Supabase: `SELECT * FROM pipeline_logs WHERE log_level = 'error'`
4. Run integration tests: `pytest agents/test_orchestration.py -v`

---

**Setup Guide Complete** ✅
