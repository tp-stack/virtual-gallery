import sqlite3, os, json

db_path = os.path.expanduser("~/.local/share/opencode/opencode.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# List all tables and columns
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
for t in cur.fetchall():
    table = t[0]
    cur.execute(f"PRAGMA table_info('{table}')")
    cols = cur.fetchall()
    col_info = [(c[1], c[2]) for c in cols]
    cnt = conn.execute(f"SELECT COUNT(*) FROM '{table}'").fetchone()[0]
    if cnt > 0:
        print(f"\n{table} ({cnt} rows): {col_info}")
        cur.execute(f"SELECT * FROM '{table}' LIMIT 1")
        sample = cur.fetchone()
        for i, c in enumerate(col_info):
            val = str(sample[i])[:100] if sample[i] is not None else "NULL"
            print(f"  {c[0]}: {val}")

conn.close()
