import sqlite3
import os

db_path = os.path.expanduser("~/.local/share/opencode/opencode.db")
if not os.path.exists(db_path):
    print("DB not found at", db_path)
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# List tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()
print("Tables:", [t[0] for t in tables])

# Look for MCP-related tables
for table in [t[0] for t in tables]:
    cur.execute(f"PRAGMA table_info('{table}')")
    cols = cur.fetchall()
    col_names = [c[1] for c in cols]
    if any(k in str(col_names).lower() for k in ['mcp', 'token', 'credential', 'oauth']):
        print(f"\nTable: {table}")
        print(f"Columns: {col_names}")
        cur.execute(f"SELECT * FROM '{table}' LIMIT 5")
        for row in cur.fetchall():
            for i, col in enumerate(col_names):
                val = str(row[i])[:200] if row[i] else "NULL"
                print(f"  {col}: {val}")
            print("---")

conn.close()
