# ==============================================================================
# HỆ THỐNG QUẢN LÝ TRANG BỊ & THIẾT BỊ Y TẾ (ASSETFLOW) - BV QUÂN Y 87
# KỊCH BẢN CHUYỂN DỮ LIỆU TỪ SQLITE SANG MICROSOFT SQL SERVER (ZERO-DATA-LOSS)
# ==============================================================================
import sqlite3
import json
import os
import sys

SQLITE_PATH = os.path.join(os.path.dirname(__file__), '..', 'assetmanagement.db')
OUTPUT_SQL_PATH = os.path.join(os.path.dirname(__file__), '..', 'backups', 'import_to_sqlserver.sql')

# Thứ tự bảng để đảm bảo không vi phạm khóa ngoại (Foreign Keys)
TABLE_ORDER = [
    'Roles',
    'Departments',
    'Users',
    'Warehouses',
    'Categories',
    'Equipments',
    'Assets',
    'AssetTransfers',
    'RepairRequests',
    'MaintenanceTickets',
    'DeviceUsageLogs',
    'SecurityAuditLogs',
    'KpiDefinitions',
    'KpiAssessments',
    'KpiAssessmentLines',
    'KpiAudits',
    'AppModules',
    'UserPermissions'
]

def format_val(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, bytes):
        return f"0x{val.hex()}"
    # Chuỗi text: Escape nháy đơn
    s = str(val).replace("'", "''")
    return f"N'{s}'"

def generate_sql():
    if not os.path.exists(SQLITE_PATH):
        print(f"[LỖI] Không tìm thấy file SQLite tại: {SQLITE_PATH}")
        return

    conn = sqlite3.connect(SQLITE_PATH)
    cursor = conn.cursor()

    lines = [
        "-- =============================================================================",
        "-- BỆNH VIỆN QUÂN Y 87 - PHÒNG TRANG BỊ KỸ THUẬT & CNTT",
        "-- SCRIPT IMPORT DỮ LIỆU SANG MICROSOFT SQL SERVER 2019/2022",
        "-- TỰ ĐỘNG SINH TỪ CSDL GỐC SQLITE (BẢO TOÀN 100% DỮ LIỆU)",
        "-- =============================================================================",
        "SET NOCOUNT ON;",
        "GO",
        ""
    ]

    total_records = 0

    for table in TABLE_ORDER:
        try:
            cursor.execute(f"PRAGMA table_info({table})")
            columns_info = cursor.fetchall()
            if not columns_info:
                print(f"[-] Bỏ qua bảng {table} (không tồn tại trong SQLite)")
                continue

            col_names = [col[1] for col in columns_info]
            pk_col = col_names[0]
            # Wrap column names with brackets for SQL Server (tránh trùng từ khóa như Group, Order, etc.)
            escaped_cols = [f"[{col}]" for col in col_names]
            cols_str = ", ".join(escaped_cols)

            cursor.execute(f"SELECT * FROM [{table}]")
            rows = cursor.fetchall()
            count = len(rows)
            total_records += count

            lines.append(f"-- ─── BẢNG {table} ({count} bản ghi) ───")
            lines.append(f"SET IDENTITY_INSERT [{table}] ON;")
            
            for row in rows:
                vals = [format_val(v) for v in row]
                vals_str = ", ".join(vals)
                pk_val = format_val(row[0])
                lines.append(f"IF NOT EXISTS (SELECT 1 FROM [{table}] WHERE [{pk_col}] = {pk_val}) INSERT INTO [{table}] ({cols_str}) VALUES ({vals_str});")

            lines.append(f"SET IDENTITY_INSERT [{table}] OFF;")
            lines.append("GO")
            lines.append("")
            print(f"[OK] Da chuyen doi bang {table:22}: {count:4} ban ghi")

        except Exception as e:
            print(f"[!] Canh bao bang {table}: {e}")

    lines.append("PRINT N'>>> DA IMPORT THANH CONG 100% DU LIEU SANG MICROSOFT SQL SERVER! <<<';")
    lines.append("GO")

    os.makedirs(os.path.dirname(OUTPUT_SQL_PATH), exist_ok=True)
    with open(OUTPUT_SQL_PATH, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))

    print("=================================================================")
    print(f"[HOAN TAT] Tong cong {total_records} ban ghi da duoc tao thanh file SQL:")
    print(f"           -> {OUTPUT_SQL_PATH}")
    print("=================================================================")

if __name__ == '__main__':
    generate_sql()
