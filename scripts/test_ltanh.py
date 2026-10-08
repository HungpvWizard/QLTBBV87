import urllib.request, json

req = urllib.request.Request('http://127.0.0.1:5000/api/auth/login',
    data=json.dumps({'username':'ltanh', 'password':'123456'}).encode('utf-8'),
    headers={'Content-Type':'application/json'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print('Login OK as ltanh!')
    token = data['token']
    
    req2 = urllib.request.Request('http://127.0.0.1:5000/api/deviceusages/monthly?year=2026&month=9&department=all',
        headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req2) as resp2:
        mdata = json.loads(resp2.read().decode('utf-8'))
        print('TotalAssets:', mdata.get('totalAssets'))
        print('ActiveAssetsCount:', mdata.get('activeAssetsCount'))
        print('TotalUsageAll:', mdata.get('totalUsageAll'))
        print('Rows length:', len(mdata.get('rows', [])))
        if mdata.get('rows'):
            print('Sample row 0:', mdata['rows'][0]['name'], mdata['rows'][0]['departmentName'], 'Usage:', mdata['rows'][0]['totalMonthUsage'])
