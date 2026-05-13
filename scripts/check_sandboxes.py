import sqlite3, os, json

db_path = os.path.expanduser("~/.local/share/opencode/opencode.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Check the virtual-gallery project's sandboxes
cur.execute("SELECT id, sandboxes FROM project WHERE worktree LIKE '%virtual-gallery%'")
rows = cur.fetchall()
for row in rows:
    print(f"Project: {row[0]}")
    s = json.loads(row[1]) if row[1] else []
    print(f"Sandboxes: {json.dumps(s, indent=2)[:500]}")

conn.close()
