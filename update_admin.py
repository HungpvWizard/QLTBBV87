import sqlite3

hash_val = '$2a$11$6E0v7wtxv9EXWmmU7JmfK.Vxk7lfx6U0pXhG2flKy07jtGUGShE22'
conn = sqlite3.connect('assetmanagement.db')
cursor = conn.cursor()
cursor.execute("UPDATE Users SET PasswordHash = ? WHERE Username = 'admin'", (hash_val,))
conn.commit()
print("Updated admin hash correctly")
