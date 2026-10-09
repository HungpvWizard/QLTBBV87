const http = require('http');

const API_URL = 'http://localhost:5046/api';

const fetchJson = (url, method = 'GET', body = null) => {
    return new Promise((resolve, reject) => {
        const req = http.request(url, {
            method,
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode} ${data}`));
                } else {
                    resolve(data ? JSON.parse(data) : null);
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

async function seed() {
    try {
        console.log("Fetching categories...");
        const categories = await fetchJson(`${API_URL}/categories`);
        console.log("Categories:", categories);

        const warehousesData = [
            { name: 'Kho CNTT', description: 'Quản lý thiết bị công nghệ thông tin' },
            { name: 'Kho KHTH', description: 'Kho Kế hoạch Tổng hợp' },
            { name: 'Kho Trang Bị', description: 'Quản lý máy móc y tế' }
        ];

        const createdWarehouses = [];

        for (const w of warehousesData) {
            console.log(`Creating warehouse ${w.name}...`);
            const created = await fetchJson(`${API_URL}/warehouses`, 'POST', w);
            createdWarehouses.push(created);
            console.log(`Created ID: ${created.id}`);
        }

        const map = {
            'CNTT': createdWarehouses[0].id,
            'Văn phòng phẩm': createdWarehouses[1].id,
            'Trang bị Máy Y tế': createdWarehouses[2].id
        };

        for (const cat of categories) {
            const wid = map[cat.name];
            if (wid) {
                console.log(`Updating category ${cat.name} with warehouseId ${wid}...`);
                const updateBody = { ...cat, warehouseId: wid };
                await fetchJson(`${API_URL}/categories/${cat.id}`, 'PUT', updateBody);
                console.log(`Updated!`);
            }
        }
        console.log("Done!");
    } catch (e) {
        console.error("Error:", e);
    }
}

seed();
