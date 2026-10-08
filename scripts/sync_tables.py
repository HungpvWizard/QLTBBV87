import sqlite3

root_conn = sqlite3.connect('assetmanagement.db')
api_conn = sqlite3.connect('backend/AssetManagement.WebAPI/assetmanagement.db')

rc = root_conn.cursor()
rc.execute("SELECT sql FROM sqlite_master WHERE name='DeviceUsageLogs'")
row = rc.fetchone()
if row and row[0]:
    ddl = row[0]
    print('Creating DeviceUsageLogs in WebAPI DB...')
    try:
        api_conn.execute(ddl)
    except Exception as e:
        print('DeviceUsageLogs note:', e)
    
    rc.execute('SELECT Id, AssetId, UsageDate, UsageCount, DepartmentName, RecordedBy, Notes, CreatedAt FROM DeviceUsageLogs')
    logs = rc.fetchall()
    if logs:
        api_conn.executemany('INSERT OR REPLACE INTO DeviceUsageLogs VALUES (?,?,?,?,?,?,?,?)', logs)
    api_conn.commit()
    print('Done copying', len(logs), 'records to WebAPI DB.')

ac = api_conn.cursor()
ac.execute("SELECT sql FROM sqlite_master WHERE name='SecurityAuditLogs'")
row_audit = ac.fetchone()
if row_audit and row_audit[0]:
    try:
        root_conn.execute(row_audit[0])
        root_conn.commit()
        print('SecurityAuditLogs synced to root db.')
    except Exception as e:
        print('Audit log note:', e)

print('SUCCESSFULLY SYNCED')
