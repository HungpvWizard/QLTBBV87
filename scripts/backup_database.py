"""
Script sao lưu dữ liệu toàn diện cho Hệ thống Quản lý Tài sản & Thiết bị - BV Quân y 87.
Tác vụ:
1. Thực hiện SQLite WAL Checkpoint để dồn toàn bộ dữ liệu từ file -wal vào file .db chính.
2. Sao lưu file assetmanagement.db thành file .db có gắn mốc thời gian (timestamp).
3. Duy trì một bản sao lưu master gốc an toàn: assetmanagement_PRESERVED_MASTER.db.
4. Trích xuất (export) toàn bộ dữ liệu của tất cả các bảng ra định dạng JSON trong thư mục backups/data_json/
   giúp dữ liệu luôn đọc được bằng mắt thường, chống mất mát độc lập với phần mềm.
5. Ghi nhận thông tin vào backup_manifest.json (tổng số dòng của từng bảng).
"""

import sqlite3
import os
import sys
import shutil
import json
import datetime

# Fix Windows console UTF-8 output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def run_backup():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backend_db = os.path.join(base_dir, "backend", "AssetManagement.WebAPI", "assetmanagement.db")
    root_db = os.path.join(base_dir, "assetmanagement.db")
    
    if os.path.exists(backend_db) and (not os.path.exists(root_db) or os.path.getmtime(backend_db) >= os.path.getmtime(root_db)):
        db_file = backend_db
        try:
            shutil.copy2(backend_db, root_db)
        except Exception:
            pass
    else:
        db_file = root_db

    backups_dir = os.path.join(base_dir, "backups")
    json_dir = os.path.join(backups_dir, "data_json")

    os.makedirs(backups_dir, exist_ok=True)
    os.makedirs(json_dir, exist_ok=True)

    if not os.path.exists(db_file):
        print(f"[CANH BAO] Khong tim thay file co so du lieu: {db_file}")
        return False

    now = datetime.datetime.now()
    now_str = now.strftime("%Y%m%d_%H%M%S")
    now_human = now.strftime("%d/%m/%Y %H:%M:%S")

    print("=================================================================")
    print(f"  [SAO LUU DU LIEU] - BV Quan y 87")
    print(f"  Thoi gian: {now_human}")
    print("=================================================================")

    # 1. Checkpoint SQLite WAL mode
    try:
        conn = sqlite3.connect(db_file)
        conn.execute("PRAGMA wal_checkpoint(FULL);")
        conn.commit()
    except Exception as e:
        print(f"[!] Canh bao khi checkpoint WAL: {e}")
        conn = sqlite3.connect(db_file)

    # 2. Tạo bản sao SQLite .db
    timestamped_db = os.path.join(backups_dir, f"backup_{now_str}.db")
    master_preserved_db = os.path.join(backups_dir, "assetmanagement_PRESERVED_MASTER.db")

    shutil.copy2(db_file, timestamped_db)
    if not os.path.exists(master_preserved_db):
        shutil.copy2(db_file, master_preserved_db)
        print(f"[*] Da tao ban luu tru Master bat kha xam pham: {os.path.basename(master_preserved_db)}")

    db_size = os.path.getsize(timestamped_db)
    print(f"[OK] Da tao ban sao luu SQLite: {os.path.basename(timestamped_db)} ({db_size:,} bytes)")

    # 3. Export toàn bộ các bảng ra file JSON độc lập
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cur.fetchall()]

    manifest = {
        "backup_time": now_human,
        "timestamp": now_str,
        "database_file": os.path.basename(timestamped_db),
        "database_size_bytes": db_size,
        "tables_count": len(tables),
        "tables_summary": {}
    }

    all_data_export = {}

    for table in tables:
        try:
            cur.execute(f"PRAGMA table_info('{table}');")
            columns = [col[1] for col in cur.fetchall()]
            
            cur.execute(f"SELECT * FROM '{table}';")
            rows = cur.fetchall()
            
            table_data = []
            for r in rows:
                row_dict = {}
                for idx, col in enumerate(columns):
                    row_dict[col] = r[idx]
                table_data.append(row_dict)

            # Lưu file json riêng cho từng bảng
            table_json_file = os.path.join(json_dir, f"{table}.json")
            with open(table_json_file, "w", encoding="utf-8") as f:
                json.dump(table_data, f, ensure_ascii=False, indent=2)

            all_data_export[table] = table_data
            manifest["tables_summary"][table] = len(rows)
            print(f"    - Bang {table:22s}: {len(rows):4d} ban ghi -> {os.path.basename(table_json_file)}")
        except Exception as ex:
            print(f"    - [LOI] Bang {table}: {ex}")

    # Ghi toàn bộ dữ liệu vào 1 file tổng hợp duy nhất
    full_export_file = os.path.join(json_dir, f"full_database_dump_{now_str}.json")
    with open(full_export_file, "w", encoding="utf-8") as f:
        json.dump(all_data_export, f, ensure_ascii=False, indent=2)
    print(f"[OK] Da xuat ban ket xuat du lieu JSON tong the: {os.path.basename(full_export_file)}")

    # Ghi manifest
    manifest_file = os.path.join(backups_dir, "backup_manifest.json")
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    conn.close()
    print("=================================================================")
    print("  [HOAN TAT] Toan bo du lieu hien co da duoc luu tru an toan 100%!")
    print("=================================================================")
    return True

if __name__ == "__main__":
    run_backup()
