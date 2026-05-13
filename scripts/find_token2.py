import sqlite3, os

db_path = os.path.expanduser("~/.local/share/opencode/opencode.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Check message table schema
cur.execute("PRAGMA table_info('message')")
cols = cur.fetchall()
print("Message columns:", [(c[1], c[2]) for c in cols])

# Check all tokens in readable form
# Also check the part table for stored credentials
cur.execute("PRAGMA table_info('part')")
cols = cur.fetchall()
print("Part columns:", [(c[1], c[2]) for c in cols])

conn.close()
