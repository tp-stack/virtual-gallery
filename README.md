# 🎨 Virtual Gallery - Multi-Agent AI Orchestration System

> Intelligent artwork curation, compliance verification, 3D gallery design, and production deployment through coordinated multi-agent AI orchestration.

## 🌟 Features

- **4 VS Code Custom Agents** - Gallery Orchestrator, Data Pipeline, Deployment, Security & Compliance
- **Interactive CLI** - Menu-driven stage selection with real-time token tracking
- **Hybrid Memory** - Local cache + Supabase sync for persistence and speed
- **Token Budgeting** - 30,000 Claude tokens + 100,000 API calls per run
- **Production Safe** - Explicit "DEPLOY" confirmation for deployment stages
- **Full Automation** - GitHub Actions CI/CD for continuous deployment
- **Comprehensive Docs** - Setup guides, troubleshooting, and architecture reference

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/tp-stack/virtual-gallery.git
cd virtual-gallery
```

### 2. Configure Credentials
Create `.env.local` with:
```env
NEXT_PUBLIC_SUPABASE_URL=https://pkxfxuhrbosqloblttnr.supabase.co
SUPABASE_SECRET_KEY=<your-service-role-key>
SUPABASE_SERVICE_KEY=<same-as-above>
CLAUDE_API_KEY=sk-ant-<your-api-key>
```

**Get credentials from:**
- **Supabase**: https://app.supabase.com/project/pkxfxuhrbosqloblttnr/settings/api
- **Claude**: https://console.anthropic.com/

### 3. Deploy Supabase Migration
```bash
supabase link --project-ref pkxfxuhrbosqloblttnr
supabase migration up
```

### 4. Install Dependencies
```bash
cd agents
pip install -r requirements.txt
pip install supabase python-dotenv pytest pytest-asyncio aiohttp pydantic
```

### 5. Verify Setup
```bash
python setup_deployment.py
```

### 6. Launch Orchestrator
```bash
python cli_orchestrator.py
```

Select from menu:
- `[1]` Gallery Data Pipeline (2-5 min)
- `[2]` Deployment & Build (5-10 min)
- `[3]` Security & Compliance Audit (1-2 min)
- `[4]` Development (1-2 min)
- `[5]` Full Lifecycle (10-20 min) ⭐

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [DEPLOYMENT_READY.md](DEPLOYMENT_READY.md) | **START HERE** - Overview & quick start |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Step-by-step phase-by-phase setup |
| [ORCHESTRATION_SETUP.md](ORCHESTRATION_SETUP.md) | Complete reference manual (60+ sections) |
| [ENV_LOCAL_SETUP.md](ENV_LOCAL_SETUP.md) | Credential configuration guide |
| [ORCHESTRATION_IMPLEMENTATION.md](ORCHESTRATION_IMPLEMENTATION.md) | What was built & architecture |
| [.github/skills/gallery-orchestration/SKILL.md](.github/skills/gallery-orchestration/SKILL.md) | Master skill reference |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│  VS Code Copilot Chat (Interactive)             │
│  /gallery-orchestrator | /data-pipeline         │
│  /deployment | /security-compliance             │
└─────────────────┬───────────────────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
    CLI Menu          Hybrid Memory
    (interactive)     (local + Supabase)
         │                 │
         └────────┬────────┘
                  ▼
         Python Agent Pipeline
         • Curator → Archivist
         • Compliance checker
         • Content enricher
         • Categorizer
         • Designer (3D layout)
                  │
         ┌────────┴─────────┐
         ▼                  ▼
      Supabase          artworks.json
      (6 tables)        (frontend)
```

## 🎯 Orchestration Stages

### Stage 1: Gallery Data Pipeline
Curator → Compliance → Content → Categorizer → Designer
- Fetches artwork from 15+ museum APIs
- Verifies public domain status
- Enriches with descriptions & metadata
- Classifies art movements
- Generates 3D gallery layout

**Output**: `public/data/artworks.json`, Supabase `artworks` table

### Stage 2: Development
TypeScript validation, linting, schema checks
**Output**: Build validation report

### Stage 3: Security & Compliance
RLS policy audit, vulnerability scanning, license verification
**Output**: Security recommendations

### Stage 4: Deployment
Build validation, Vercel deployment, database migrations
**Output**: Production deployment

## 📊 Token Management

### Budget (Per Run)
| Resource | Limit | Use |
|----------|-------|-----|
| Claude | 30,000 tokens | Content generation, categorization |
| Museum APIs | 100,000 calls | Artwork fetching |
| Supabase | Unlimited | Database operations |

### Monitor Usage
```bash
# During execution (shown live in CLI)
# After execution
cat agents/memory/token_usage.json | python -m json.tool
```

## 🔒 Security

✅ **Credentials Isolated** - All secrets in `.env.local` (never in code)
✅ **RLS Policies** - Supabase tables require authentication
✅ **Audit Trail** - All operations logged to `pipeline_logs`
✅ **Production Safe** - Requires "DEPLOY" confirmation
✅ **No Frontend Exposure** - Python agents server-side only

## 📁 Project Structure

```
.github/
  agents/                               # VS Code custom agents
    ├── gallery-orchestrator.agent.md
    ├── data-pipeline.agent.md
    ├── deployment.agent.md
    └── security-compliance.agent.md
  skills/
    └── gallery-orchestration/SKILL.md
  workflows/
    └── deploy-agents.yml              # GitHub Actions CI/CD

agents/
  ├── cli_orchestrator.py               # Interactive CLI
  ├── test_orchestration.py             # Integration tests
  ├── setup_deployment.py               # Setup verification
  ├── utils/
  │   ├── hybrid_memory.py              # Local + Supabase sync
  │   ├── credentials.py                # Credential management
  │   ├── token_counter.py              # Token budgeting
  │   └── logging_helper.py
  ├── memory/                           # Local cache
  ├── logs/                             # Execution logs
  └── orchestrator.py                   # Legacy

supabase/
  migrations/
    ├── 001_create_artworks.sql         # Artworks table
    └── 002_agent_orchestration.sql     # Agent infrastructure

src/
  ├── app/
  │   ├── layout.tsx
  │   ├── page.tsx
  │   └── api/
  └── components/
```

## 🔧 Configuration

### GitHub Secrets (for CI/CD)
Set in Settings → Secrets and variables → Actions:

```
SUPABASE_URL
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_KEY
SUPABASE_PROJECT_REF
SUPABASE_ACCESS_TOKEN
CLAUDE_API_KEY
```

### Vercel Environment Variables
Set in Vercel dashboard:

```
NEXT_PUBLIC_SUPABASE_URL (public)
SUPABASE_SECRET_KEY (secret)
CLAUDE_API_KEY (secret)
```

## 🧪 Testing

```bash
# Run all tests
cd agents
pytest test_orchestration.py -v

# Run specific test class
pytest test_orchestration.py::TestHybridMemoryManager -v

# Run with coverage
pytest test_orchestration.py --cov=utils --cov-report=html
```

## 🚨 Troubleshooting

### "Credential validation failed"
→ Check `.env.local` has all required keys without quotes
→ See [ENV_LOCAL_SETUP.md](ENV_LOCAL_SETUP.md)

### "Supabase connection failed"
→ Verify migration applied: `supabase migration list`
→ Check credentials in `.env.local`

### "Token budget exceeded"
→ Wait for next run or reset: `python -c "from utils.token_counter import get_token_counter; get_token_counter().reset_for_new_run()"`

### Full Troubleshooting
See [ORCHESTRATION_SETUP.md#Troubleshooting](ORCHESTRATION_SETUP.md#troubleshooting)

## 📞 Support

1. Check documentation links above
2. Review logs: `tail -f agents/logs/orchestration_*.jsonl`
3. Query Supabase: `SELECT * FROM pipeline_logs WHERE log_level = 'error'`
4. Run tests: `pytest agents/test_orchestration.py -v`

## 🔄 CI/CD Pipeline

GitHub Actions automatically:
- ✅ Runs tests on push
- ✅ Verifies Supabase migrations
- ✅ Deploys to staging
- ✅ Reports status

**Workflow**: `.github/workflows/deploy-agents.yml`

## 🎓 Learning Resources

- **Supabase Docs**: https://supabase.com/docs
- **Claude API**: https://anthropic.com/docs/api
- **Vercel**: https://vercel.com/docs
- **GitHub Actions**: https://docs.github.com/en/actions

## 📈 Performance

**Typical Execution Times:**
- Full Gallery Pipeline: 2-5 minutes (500-1000 artworks)
- Development Stage: 1 minute
- Security Audit: 1-2 minutes
- Deployment: 5-10 minutes
- **Full Lifecycle**: 10-20 minutes

**Token Usage:**
- Gallery Pipeline: ~6-8k Claude tokens
- Security Audit: ~2-3k Claude tokens
- Deployment Checks: ~1-2k Claude tokens

## 🚀 Deployment Status

| Component | Status | Location |
|-----------|--------|----------|
| VS Code Agents (4) | ✅ Ready | `.github/agents/` |
| CLI Orchestrator | ✅ Ready | `agents/cli_orchestrator.py` |
| Hybrid Memory | ✅ Ready | `agents/utils/hybrid_memory.py` |
| Token Budgeting | ✅ Ready | 30k Claude / 100k API |
| Supabase Migration | ✅ Ready | `supabase/migrations/002_agent_orchestration.sql` |
| GitHub Actions | ✅ Ready | `.github/workflows/deploy-agents.yml` |
| Documentation | ✅ Complete | See links above |

## 🎯 Next Steps

1. ✅ Configure `.env.local` with credentials
2. ✅ Deploy Supabase migration
3. ✅ Run `python agents/setup_deployment.py`
4. ✅ Launch `python agents/cli_orchestrator.py`
5. ✅ Select workflow stage
6. ✅ Monitor progress & review results

---

**Created**: May 25, 2026  
**Status**: ✅ Production Ready  
**License**: MIT

For detailed setup: See [DEPLOYMENT_READY.md](DEPLOYMENT_READY.md)
