import sqlite3, os, json

db_path = os.path.expanduser("~/.local/share/opencode/opencode.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Check project table - MCP credentials might be here
cur.execute("SELECT * FROM project")
rows = cur.fetchall()
print(f"Projects: {len(rows)}")
for row in rows:
    print(f"  Row: {list(row)[:2]}")  # Just show first 2 fields

# Check if there's a session_share or other table with MCP data
cur.execute("PRAGMA table_info('session_share')")
cols = cur.fetchall()
if cols:
    print("Session share columns:", [(c[1], c[2]) for c in cols])

# Try to find MCP credentials in data JSON fields
cur.execute("SELECT id, data FROM project")
rows = cur.fetchall()
for row in rows:
    data = json.loads(row[1])
    mcp = data.get('mcp', data.get('MCP'))
    if mcp:
        print(f"\nProject {row[0]} has MCP config:")
        print(json.dumps(mcp, indent=2)[:500])

conn.close()
