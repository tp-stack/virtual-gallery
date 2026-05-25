---
name: "🚀 Deploy Agent Orchestration"
about: "Deploy agents to specific environment"
labels: deployment, agents
---

## Deployment Checklist

- [ ] Credentials configured in `.env.local`
- [ ] Supabase migration applied
- [ ] Dependencies installed
- [ ] Local tests passing
- [ ] Ready for production

## Environment
- [ ] Local development
- [ ] Staging
- [ ] Production

## Steps
1. Run `python bootstrap_deploy.py`
2. Follow interactive prompts
3. Verify all checks pass
4. Launch orchestrator

## Notes
