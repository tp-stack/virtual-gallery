import sqlite3, os

db_path = os.path.expanduser("~/.local/share/opencode/opencode.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Get all accounts/credentials with tokens
cur.execute("SELECT id, email, url, substr(access_token,1,80) as token_preview, token_expiry FROM account")
for row in cur.fetchall():
    print(f"ID: {row[0]}, Email: {row[1]}, URL: {row[2]}")
    print(f"  Token (first 80 chars): {row[3]}")
    print(f"  Expiry: {row[4]}")

# Also check for any supabase MCP credentials
cur.execute("SELECT * FROM data_migration LIMIT 5")
rows = cur.fetchall()
if rows:
    print("\ndata_migration sample:", rows[0] if rows else "empty")

conn.close()
