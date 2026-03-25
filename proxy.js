const http = require('http');
const https = require('https');

const TUSHARE_TOKEN = 'a030801af2599e4c2205ea19562c5914bd68b82b19c1e9ed4bec2294';

// 模拟数据生成器 (2026年数据)
function generateMockData(code) {
    const items = [];
    let basePrice = 12.5;
    const now = new Date();
    for (let i = 0; i < 20; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
        const change = (Math.random() - 0.5) * 0.8;
        basePrice += change;
        items.push([code, dateStr, basePrice.toFixed(2), (basePrice+0.3).toFixed(2), (basePrice-0.2).toFixed(2), (basePrice+0.1).toFixed(2)]);
    }
    return { code: 0, msg: "正在显示 2026 模拟数据 (权限受限时触发)", data: { items } };
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const urlParams = new URL(req.url, `http://${req.headers.host}`);
    if (urlParams.pathname === '/data') {
        const stockCode = urlParams.searchParams.get('code') || '000001.SZ';

        // 动态计算 2026 年日期
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

        const postData = JSON.stringify({
            api_name: 'daily',
            token: TUSHARE_TOKEN,
            params: { 
                ts_code: stockCode, 
                start_date: thirtyDaysAgo, 
                end_date: today 
            }
        });

        const options = {
            hostname: 'api.tushare.pro',
            port: 443,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const connector = https.request(options, (apiRes) => {
            let body = '';
            apiRes.on('data', (chunk) => body += chunk);
            apiRes.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    // 如果 Tushare 返回 40203 权限错误，自动切换到 2026 模拟数据
                    if (result.code === 40203) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(generateMockData(stockCode)));
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(body);
                    }
                } catch (e) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(generateMockData(stockCode)));
                }
            });
        });

        connector.on('error', (e) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(generateMockData(stockCode)));
        });

        connector.write(postData);
        connector.end();
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(4000, () => {
    console.log('✅ 2026 代理服务已启动！');
});
