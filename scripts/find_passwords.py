import sqlite3
import bcrypt

conn = sqlite3.connect('backend/AssetManagement.WebAPI/assetmanagement.db')
c = conn.cursor()
c.execute("SELECT Username, PasswordHash FROM Users")
rows = c.fetchall()

common_passwords = [
    'admin', 'admin123', 'admin@123', 'Admin123', 'Admin@123', 'Admin@2026', 
    '123456', '12345678', 'password', 'Password123', 'bvqy87', 'Bvqy87@2026',
    'Admin@123456', 'admin123456', 'dmtuan123', 'Dmtuan@123'
]

for username, p_hash in rows:
    print(f'Checking {username}...')
    p_bytes = p_hash.encode('utf-8')
    for pwd in common_passwords:
        if bcrypt.checkpw(pwd.encode('utf-8'), p_bytes):
            print(f'>>> FOUND! {username}: {pwd}')
            break
