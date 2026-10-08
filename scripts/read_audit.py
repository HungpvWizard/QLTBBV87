import sqlite3
conn = sqlite3.connect('backend/AssetManagement.WebAPI/assetmanagement.db')
c = conn.cursor()
c.execute("SELECT Action, Username, Details, Timestamp FROM SecurityAuditLogs ORDER BY Id DESC LIMIT 10")
for r in c.fetchall():
    print(r)
