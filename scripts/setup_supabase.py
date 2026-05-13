#!/usr/bin/env python3
"""
Setup script: Creates Supabase tables and uploads artwork data.
Usage:
  1. Create a Supabase PAT at https://supabase.com/dashboard/account/tokens
  2. Set SUPABASE_ACCESS_TOKEN environment variable
  3. Run: python scripts/setup_supabase.py
"""

import os
import sys
import json
import urllib.request
import urllib.parse

PROJECT_REF = "pkxfxuhrbosqloblttnr"
SUPABASE_URL = f"https://{PROJECT_REF}.supabase.co"

token = os.environ.get("SUPABASE_ACCESS_TOKEN") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
if not token:
    print("ERROR: Set SUPABASE_ACCESS_TOKEN (PAT) or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    sys.exit(1)

is_pat = token.startswith("sbp_")

# Read migration SQL
sql_path = os.path.join(os.path.dirname(__file__), "..", "supabase", "migrations", "001_create_artworks.sql")
if not os.path.exists(sql_path):
    print(f"ERROR: Migration file not found at {sql_path}")
    sys.exit(1)

with open(sql_path) as f:
    sql = f.read()

print(f"Running migration on project {PROJECT_REF}...")

if is_pat:
    # Use Management API
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    body = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        data=body,
        headers=headers,
        method="POST",
    )
else:
    # Use SQL endpoint directly (for anon key - less secure)
    headers = {
        "apikey": token,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    body = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/rpc/",
        data=body,
        headers=headers,
        method="POST",
    )

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = resp.read().decode()
        print(f"Migration result: {result[:200]}")
        print("Migration completed successfully!")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"HTTP {e.code}: {body[:300]}")
    
    if e.code == 401:
        print("\nAuthentication failed. Generate a PAT at:")
        print("  https://supabase.com/dashboard/account/tokens")
        print("Then run: $env:SUPABASE_ACCESS_TOKEN='sbp_...'; python scripts/setup_supabase.py")

# Upload artworks if JSON file exists
json_path = os.path.join(os.path.dirname(__file__), "..", "public", "data", "artworks.json")
if os.path.exists(json_path):
    print("\nUploading artworks to Supabase...")
    # Use upload_to_supabase.py for this part
    exec(open(os.path.join(os.path.dirname(__file__), "upload_to_supabase.py")).read())
else:
    print("\nNo artworks.json found. Run python agents/orchestrator.py first.")
