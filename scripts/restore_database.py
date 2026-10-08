"""
Script khoi phuc du lieu an toan cho He thong Quan ly Tai san - BV Quan y 87.
Cho phep khoi phuc lai database tu:
1. Ban Master goc: assetmanagement_PRESERVED_MASTER.db
2. Ban backup gan nhat hoac file chi dinh
"""

import sqlite3
import os
import sys
import shutil

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def restore(backup_filename=None):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_file = os.path.join(base_dir, "assetmanagement.db")
    backups_dir = os.path.join(base_dir, "backups")

    if not backup_filename:
        # Mac dinh chon assetmanagement_PRESERVED_MASTER.db
        source_db = os.path.join(backups_dir, "assetmanagement_PRESERVED_MASTER.db")
    else:
        source_db = os.path.join(backups_dir, backup_filename)

    if not os.path.exists(source_db):
        print(f"[LOI] Khong tim thay file backup: {source_db}")
        return False

    print(f"[*] Dang khoi phuc du lieu tu: {os.path.basename(source_db)}")
    
    # Xoa cac file tam -wal va -shm neu co
    for ext in ["-wal", "-shm"]:
        temp_f = db_file + ext
        if os.path.exists(temp_f):
            try:
                os.remove(temp_f)
            except Exception as e:
                print(f"[!] Khong the xoa file tam {temp_f}: {e}")

    shutil.copy2(source_db, db_file)
    print(f"[OK] Da khoi phuc thanh cong database chinh: {db_file}")
    return True

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    restore(target)
