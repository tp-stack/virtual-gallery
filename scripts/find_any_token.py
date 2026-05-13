import sqlite3, os, re, json

db_path = os.path.expanduser("~/.local/share/opencode/opencode.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Search all text content in the database for Supabase-related data
# Look in message data, part data, and session data
for table in ['message', 'part', 'session', 'session_message']:
    try:
        cur.execute(f"SELECT data FROM '{table}' WHERE data IS NOT NULL LIMIT 100")
        for row in cur.fetchall():
            txt = str(row[0])
            if 'supabase' in txt.lower() or 'sbp_' in txt:
                # Extract anything that looks like a token
                for match in re.finditer(r'sbp_[a-zA-Z0-9_]+', txt):
                    print(f"[{table}] Found token: {match.group()}")
                for match in re.finditer(r'eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+', txt):
                    print(f"[{table}] Found JWT: {match.group()[:60]}...")
    except:
        pass

conn.close()
