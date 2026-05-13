import sqlite3, os

db_path = os.path.expanduser("~/.local/share/opencode/opencode.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# The MCP credentials might be stored in a JSON blob in one of the text fields
# Let me search for 'sbp_' in all string fields across all tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()

for table in tables:
    t = table[0]
    try:
        cur.execute(f"PRAGMA table_info('{t}')")
        cols = cur.fetchall()
        for col in cols:
            cname = col[1]
            ctype = col[2]
            if 'TEXT' in ctype or 'BLOB' in ctype or 'JSON' in ctype:
                try:
                    cur.execute(f"SELECT {cname} FROM '{t}' WHERE {cname} LIKE '%sbp_%' LIMIT 5")
                    for row in cur.fetchall():
                        val = row[0]
                        if val:
                            val_str = str(val)
                            # Find the sbp_ token
                            import re
                            match = re.search(r'sbp_[a-zA-Z0-9_]+', val_str)
                            if match:
                                print(f"[{t}.{cname}] TOKEN: {match.group()}")
                                # Full context
                                ctx = val_str[max(0, match.start()-20):match.end()+80]
                                print(f"  Context: ...{ctx}...")
                except:
                    pass
    except:
        pass

conn.close()
