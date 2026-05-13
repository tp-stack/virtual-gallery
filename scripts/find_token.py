import sqlite3, os, json

db_path = os.path.expanduser("~/.local/share/opencode/opencode.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Look for MCP credential data - might be in the message or part tables
# Search for 'supabase' in message content
cur.execute("SELECT id, role, content FROM message WHERE content LIKE '%supabase%' LIMIT 10")
rows = cur.fetchall()
print(f"Found {len(rows)} messages mentioning supabase")
for row in rows:
    c = str(row[2])
    # Look for token patterns
    import re
    tokens = re.findall(r'sbp_oauth_[a-zA-Z0-9_]+', c)
    if tokens:
        print(f"  Message {row[0]} ({row[1]}): TOKENS FOUND: {tokens}")
    else:
        print(f"  Message {row[0]} ({row[1]}): {c[:100]}")

conn.close()
