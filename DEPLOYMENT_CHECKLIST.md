# Agent Deployment Checklist - Step by Step

## Phase 1: Create Supabase Project (5 minutes)

### Step 1.1: Create Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Organization**: Create or select existing
   - **Project Name**: `virtual-gallery` (or your choice)
   - **Database Password**: Save this securely
   - **Region**: Pick closest to your location (e.g., us-east-1)
4. Click "Create new project" and wait 2-3 minutes

### Step 1.2: Get Credentials
Once project is ready:
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxx.supabase.co`) → `NEXT_PUBLIC_SUPABASE_URL`
   - **Service Role Key** (under "Project API keys") → `SUPABASE_SECRET_KEY` and `SUPABASE_SERVICE_KEY`
   - **Anon Public Key** → Save for later (frontend)

### Step 1.3: Enable Realtime (Optional)
1. Go to **Settings** → **Realtime**
2. Enable if you want real-time updates for orchestration logs

---

## Phase 2: Configure Environment (5 minutes)

### Step 2.1: Create .env.local
In project root, create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=eyJhbGc...  # Service role key (64+ chars)
SUPABASE_SERVICE_KEY=eyJhbGc...  # Same as above

# Claude API (get from anthropic.com)
CLAUDE_API_KEY=sk-ant-...

# Optional: Museum API keys (JSON format)
MUSEUM_API_KEYS={"met": "your-key", "aic": "your-key"}
```

**Important**: Never commit `.env.local` to Git!

### Step 2.2: Add to .gitignore
```bash
echo ".env.local" >> .gitignore
echo "agents/memory/" >> .gitignore
```

---

## Phase 3: Deploy Supabase Schema (3 minutes)

### Step 3.1: Install Supabase CLI
```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows
choco install supabase-cli
# OR download from https://github.com/supabase/cli/releases
```

### Step 3.2: Link Project
```bash
supabase link --project-ref your-project-ref

# When prompted, paste your database password
```

### Step 3.3: Apply Migrations
```bash
# Push all migrations to Supabase
supabase migration push

# Or manually apply via Supabase SQL editor:
# 1. Go to SQL Editor in Supabase dashboard
# 2. Click "New Query"
# 3. Copy content from: supabase/migrations/001_create_artworks.sql
# 4. Copy content from: supabase/migrations/002_agent_orchestration.sql
# 5. Click "Run"
```

### Step 3.4: Verify Tables
```bash
# List tables
supabase db list

# Should see:
# - public.artworks
# - public.agent_memory
# - public.agent_status
# - public.orchestration_runs
# - public.token_usage
# - public.pipeline_logs
# - public.agent_recommendations
```

---

## Phase 4: Verify Python Environment (5 minutes)

### Step 4.1: Check Python Version
```bash
python --version  # Should be 3.11+
```

### Step 4.2: Install Dependencies
```bash
cd agents
pip install -r requirements.txt
pip install supabase python-dotenv pytest pytest-asyncio aiohttp pydantic
```

### Step 4.3: Verify Credentials
```bash
# Test that credentials load correctly
python -c "from utils.credentials import validate_credentials; print('✅ OK' if validate_credentials() else '❌ FAILED')"
```

Expected output:
```
✅ OK
```

If it fails:
- Check `.env.local` has all required keys
- Verify values don't have quotes (should be `KEY=value` not `KEY="value"`)
- Check file permissions

### Step 4.4: Test Memory Manager
```bash
python << 'EOF'
import asyncio
from utils.hybrid_memory import get_memory_manager

async def test():
    memory = get_memory_manager()
    await memory.set("test", {"key": "value"})
    result = await memory.get("test")
    print("✅ Memory OK" if result == {"key": "value"} else "❌ Memory Failed")

asyncio.run(test())
EOF
```

---

## Phase 5: Run Integration Tests (3 minutes)

```bash
cd agents
pytest test_orchestration.py -v

# Expected output:
# test_memory_set_get_local PASSED
# test_token_counter_initialization PASSED
# test_credentials_get_supabase PASSED
# ... etc
```

All tests should **PASS** ✅

---

## Phase 6: Deploy Agents (2 minutes)

### Step 6.1: Start CLI Orchestrator
```bash
cd agents
python cli_orchestrator.py
```

You should see:
```
🚀 Virtual Gallery Orchestrator
============================================================
📋 Validating credentials...
✓ Credentials validated
✓ Orchestration run ID: <uuid>

📚 Available Stages:

  [1] Gallery Data Pipeline
      └─ Curator → Compliance → Content → Categorizer → Designer
  [2] Deployment & Build
      └─ Validate build, security checks, prepare deployment
  [3] Security & Compliance Audit
      └─ Scan vulnerabilities, check RLS, audit policies
  [4] Development Workflow
      └─ Run tests, linting, schema validation
  [5] 🔄 Full Lifecycle
      └─ Run all stages in sequence
  [6] 📊 View Memory & Stats
      └─ Show current state and recommendations
  [7] 🚀 Execute Selected
      └─ Run previously selected stages
  [0] ❌ Exit

👉 Select option:
```

### Step 6.2: Test with Development Stage
```
Select: 4
```

Wait for completion. You should see:
```
🧪 Starting development stage...
  Checking TypeScript...
  Checking linting...
  Validating schema...
✓ development completed in 3.2s
```

### Step 6.3: Run Full Lifecycle (Production)
```
Select: 5
```

When prompted:
```
⚠️  This will prepare for PRODUCTION DEPLOYMENT. Type 'DEPLOY' to confirm:
```

Type: `DEPLOY`

Agent will execute all stages:
1. 📸 Gallery Data Pipeline (2-5 min)
2. 🧪 Development (1 min)
3. 🔒 Security Audit (1 min)
4. 🚀 Deployment (2-5 min)

---

## Phase 7: Verify Deployment

### Step 7.1: Check Memory Files
```bash
ls -la agents/memory/
# Should show:
# - state.json
# - token_usage.json
# - agent_status.json
# - recommendations.json
```

### Step 7.2: View Results
```bash
# Token usage
cat agents/memory/token_usage.json | python -m json.tool

# Recommendations
cat agents/memory/recommendations.json | python -m json.tool

# Status
cat agents/memory/state.json | python -m json.tool
```

### Step 7.3: Query Supabase
```bash
# Via Supabase dashboard → SQL Editor:

-- Check token usage
SELECT * FROM token_usage 
ORDER BY created_at DESC 
LIMIT 5;

-- Check orchestration runs
SELECT * FROM orchestration_runs 
ORDER BY started_at DESC 
LIMIT 5;

-- Check recommendations
SELECT * FROM agent_recommendations 
WHERE status = 'open'
ORDER BY severity DESC;
```

---

## Phase 8: Deploy to Vercel (Optional)

### Step 8.1: Connect to Vercel
```bash
vercel link
# Follow prompts to connect to Vercel
```

### Step 8.2: Set Production Secrets
In Vercel dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` (public)
   - `SUPABASE_SECRET_KEY` (secret)
   - `CLAUDE_API_KEY` (secret)

### Step 8.3: Deploy
```bash
vercel deploy --prod
```

---

## Troubleshooting

### Issue: "Supabase connection failed"
```
❌ Credential validation failed
```

**Fix**:
1. Verify `.env.local` exists and has correct values
2. Check `SUPABASE_SERVICE_KEY` is the full service role key (not shortened)
3. Check there are no trailing spaces or quotes in `.env.local`

### Issue: "Token budget exceeded"
```
Budget exceeded: 30000 / 30000 tokens used
```

**Fix**:
1. Wait for next run cycle
2. Reset token counter:
```bash
python -c "from utils.token_counter import get_token_counter; get_token_counter().reset_for_new_run()"
```
3. Or increase budget in `utils/token_counter.py`

### Issue: Database migrations failed
```
ERROR: relation "agent_memory" does not exist
```

**Fix**:
1. Check migrations were applied:
```bash
supabase migration list
```
2. Manually apply via SQL editor if needed
3. Verify RLS policies were created

### Issue: Tests failing
```
pytest test_orchestration.py
FAILED test_memory_set_get_local
```

**Fix**:
1. Ensure all dependencies installed: `pip install -r requirements.txt`
2. Check Python version: `python --version` (need 3.11+)
3. Run verbose: `pytest test_orchestration.py -vv`

---

## Next Steps After Deployment

1. ✅ **Monitor orchestration runs**
```sql
SELECT * FROM orchestration_runs ORDER BY started_at DESC;
```

2. ✅ **Review recommendations**
```bash
cat agents/memory/recommendations.json | python -m json.tool
```

3. ✅ **Set up scheduled runs** (optional)
- Use GitHub Actions or cron to run CLI periodically
- See `.github/workflows/` for examples

4. ✅ **Use VS Code agents**
- Agents automatically detect this project
- Type `/` in Copilot chat to invoke:
  - `/gallery-orchestrator` - Master coordinator
  - `/data-pipeline` - Artwork curation
  - `/deployment` - Production deployment
  - `/security-compliance` - Security audit

---

## Success Indicators ✅

After full deployment, you should see:

```
✅ Supabase tables created (6 tables)
✅ Python environment ready (all tests pass)
✅ CLI orchestrator running (menu displays)
✅ All stages complete (4 stages)
✅ Memory synced to Supabase (data visible in SQL)
✅ Token usage tracked (summary displayed)
✅ Gallery data generated (public/data/artworks.json)
✅ Vercel deployment ready (for Next.js frontend)
```

---

## Support

For issues:
1. Check **Troubleshooting** above
2. Review logs: `tail -f agents/logs/orchestration_*.jsonl`
3. Query Supabase: Check `pipeline_logs` table
4. Run tests: `pytest agents/test_orchestration.py -vv`

---

**Ready to Deploy!** 🚀

Start with Phase 1 above and proceed step-by-step.
