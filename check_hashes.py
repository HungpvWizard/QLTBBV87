import sqlite3

conn = sqlite3.connect('assetmanagement.db')
cursor = conn.cursor()
cursor.execute("SELECT Username, PasswordHash FROM Users")
rows = cursor.fetchall()
for r in rows:
    print(r)
