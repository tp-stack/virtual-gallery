# UPDATE .env.local - Add Missing Credentials

Add these lines to your `.env.local` file (keep existing lines):

```env
# Existing (keep these):
NEXT_PUBLIC_SUPABASE_URL=https://pkxfxuhrbosqloblttnr.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_5Lk92uN1k_bTM7nuUkg6eA_SqVz10ru

# ADD THESE (server-side agent credentials):
SUPABASE_SECRET_KEY=<your-service-role-key>
SUPABASE_SERVICE_KEY=<same-as-above>
CLAUDE_API_KEY=sk-ant-<your-claude-key>
```

## How to Get Missing Credentials

### 1. Supabase Service Key
- Go to: https://app.supabase.com/project/pkxfxuhrbosqloblttnr/settings/api
- Under "Project API keys"
- Copy **Service role** key (not "anon")
- Paste as both SUPABASE_SECRET_KEY and SUPABASE_SERVICE_KEY

### 2. Claude API Key
- Go to: https://console.anthropic.com/
- Create API key or copy existing
- Paste as CLAUDE_API_KEY

After updating .env.local, save and run deployment tests.
