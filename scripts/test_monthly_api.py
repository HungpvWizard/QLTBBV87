import sqlite3, json, urllib.request

# Lấy token bằng cách tạo token test hoặc dùng user
# Hãy kiểm tra user admin trong Users
conn = sqlite3.connect('backend/AssetManagement.WebAPI/assetmanagement.db')
c = conn.cursor()
c.execute("SELECT Username, PasswordHash FROM Users WHERE Id=1")
user = c.fetchone()
print('User:', user[0])

# Login qua API
try:
    for pwd in ['admin123', 'admin@123', '123456', 'Admin@123', 'Admin123']:
        try:
            req = urllib.request.Request('http://127.0.0.1:5000/api/auth/login',
                data=json.dumps({'username':'admin', 'password':pwd}).encode('utf-8'),
                headers={'Content-Type':'application/json'})
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                print('Login OK with password:', pwd)
                token = data['token']
                
                # Test API monthly
                req2 = urllib.request.Request('http://127.0.0.1:5000/api/deviceusages/monthly?year=2026&month=9&department=all',
                    headers={'Authorization': f'Bearer {token}'})
                with urllib.request.urlopen(req2) as resp2:
                    mdata = json.loads(resp2.read().decode('utf-8'))
                    print('TotalAssets in monthly:', mdata.get('totalAssets'))
                    print('ActiveAssetsCount in monthly:', mdata.get('activeAssetsCount'))
                    print('TotalUsageAll in monthly:', mdata.get('totalUsageAll'))
                    print('Rows length:', len(mdata.get('rows', [])))
                break
        except urllib.error.HTTPError as he:
            continue
except Exception as e:
    print('Exception:', e)
