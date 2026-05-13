import sqlite3, os

db_path = os.path.expanduser("~/.local/share/opencode/opencode.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# List all tables and their row counts
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
for table in cur.fetchall():
    t = table[0]
    try:
        cnt = conn.execute(f"SELECT COUNT(*) FROM '{t}'").fetchone()[0]
        print(f"{t}: {cnt} rows")
    except:
        print(f"{t}: error")

# Show some credential data regardless
cur.execute("SELECT * FROM account")
rows = cur.fetchall()
print(f"\nAccount rows: {len(rows)}")
for row in rows:
    print(f"  id={row[0]}, url={row[2]}, token={str(row[3])[:50] if row[3] else 'NULL'}...")

cur.execute("SELECT * FROM control_account")
rows = cur.fetchall()
print(f"\nControl account rows: {len(rows)}")
for row in rows:
    print(f"  email={row[0]}, url={row[1]}, token={str(row[2])[:50] if row[2] else 'NULL'}...")

conn.close()
