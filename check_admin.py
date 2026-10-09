import sqlite3
conn = sqlite3.connect('assetmanagement.db')
cursor = conn.cursor()
cursor.execute("SELECT Id, Username, IsActive, PasswordHash FROM Users WHERE Username = 'admin'")
print(cursor.fetchall())
