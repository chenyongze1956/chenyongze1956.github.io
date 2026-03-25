const http = require('http');
const https = require('https');

const TUSHARE_TOKEN = 'a030801af2599e4c2205ea19562c5914bd68b82b19c1e9ed4bec2294';

// 模拟数据生成器 (支持 2026 年日期)
function generateMockData(code, isFund) {
    const items = [];
    let basePrice = isFund ? 1.0 : 15.0; // 基金价格通常在 1 块附近，股票高些
    const now = new Date();
    for (let i = 0; i < 20; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
        const change = (Math.random() - 0.5) * (isFund ? 0.02 : 0.5);
        basePrice += change;
        items.push([code, dateStr, basePrice.toFixed(3), (basePrice+0.01).toFixed(3), (basePrice-0.01).toFixed(3), basePrice.toFixed(3)]);
    }
    return { code: 0, msg: `正在显示 ${isFund?'基金':'股票'} 2026 模拟数据`, data: { items } };
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const urlParams = new URL(req.url, `http://${req.headers.host}`);
    if (urlParams.pathname === '/data') {
        const stockCode = urlParams.searchParams.get('code') || '000001.SZ';

        // 1. 自动识别：是股票还是基金？
        let apiName = 'daily'; 
        const isFund = stockCode.startsWith('5') || stockCode.startsWith('1') || stockCode.startsWith('2');
        if (isFund) apiName = 'fund_daily';

        // 2. 动态日期：2026 年最新 30 天
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

        const postData = JSON.stringify({
            api_name: apiName,
            token: TUSHARE_TOKEN,
            params: { ts_code: stockCode, start_date: thirtyDaysAgo, end_date: today }
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
                    // 如果权限不足或解析失败，直接转模拟数据
                    if (result.code !== 0) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(generateMockData(stockCode, isFund)));
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(body);
                    }
                } catch (e) {
                    res.end(JSON.stringify(generateMockData(stockCode, isFund)));
                }
            });
        });

        connector.on('error', () => {
            res.end(JSON.stringify(generateMockData(stockCode, isFund)));
        });

        connector.write(postData);
        connector.end();
    } else {
        res.writeHead(404);
        res.end();
    }
});

// Render 通常需要监听环境变量中的端口
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`✅ 2026 跨界查询服务已启动，端口: ${PORT}`);
});
