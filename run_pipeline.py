#!/usr/bin/env python3
"""
One-command pipeline: fetch artworks from APIs and upload to Supabase.
Usage: python run_pipeline.py
"""

import subprocess
import sys
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

print("=" * 60)
print("STEP 1/2: Fetching artworks from museum APIs...")
print("=" * 60)
r1 = subprocess.run([sys.executable, "agents/orchestrator.py"])
if r1.returncode != 0:
    print("WARNING: orchestrator had issues, continuing...")

print()
print("=" * 60)
print("STEP 2/2: Uploading to Supabase...")
print("=" * 60)
r2 = subprocess.run([sys.executable, "scripts/upload_to_supabase.py"])
if r2.returncode != 0:
    print("Upload failed. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
    sys.exit(1)

print()
print("Done! Artworks are live on https://virtual-gallery-rho.vercel.app")
