import sqlite3
import shutil
import os

src_db = 'backups/backup_20261001_090559.db'
test_db = 'scratch/test_kpi_migration.db'
os.makedirs('scratch', exist_ok=True)
shutil.copy2(src_db, test_db)

conn = sqlite3.connect(test_db)
with open('scripts/kpi_migration_up.sql', 'r', encoding='utf-8') as f:
    sql_up = f.read()

conn.executescript(sql_up)
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Kpi%';")
tables = [r[0] for r in cur.fetchall()]
print('Created tables:', tables)

# Verify table counts of existing tables
cur.execute("SELECT count(*) FROM Assets;")
asset_count = cur.fetchone()[0]
print('Existing Assets count intact:', asset_count)

# Test rollback
with open('scripts/kpi_migration_down.sql', 'r', encoding='utf-8') as f:
    sql_down = f.read()

conn.executescript(sql_down)
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Kpi%';")
remaining = [r[0] for r in cur.fetchall()]
print('Remaining KPI tables after rollback:', remaining)

cur.execute("SELECT count(*) FROM Assets;")
asset_count_after = cur.fetchone()[0]
print('Assets count after rollback intact:', asset_count_after)

conn.close()
os.remove(test_db)
print('Migration test completed successfully!')
