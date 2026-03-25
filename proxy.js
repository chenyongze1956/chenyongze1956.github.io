// proxy.js - 原生 Node.js 实现，无需安装任何包
const http = require('http');
const https = require('https');

const TUSHARE_TOKEN = 'a030801af2599e4c2205ea19562c5914bd68b82b19c1e9ed4bec2294';

const server = http.createServer((req, res) => {
    // 允许所有来源跨域访问
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 定义数据请求接口：localhost:4000/data?code=000001.SZ
    const urlParams = new URL(req.url, `http://${req.headers.host}`);
    if (urlParams.pathname === '/data') {
        const stockCode = urlParams.searchParams.get('code') || '000001.SZ';

        const postData = JSON.stringify({
            api_name: 'daily',
            token: TUSHARE_TOKEN,
            params: { 
                ts_code: stockCode, 
                start_date: '20240101', 
                end_date: '20240325' 
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
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(body);
            });
        });

        connector.on('error', (e) => {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        });

        connector.write(postData);
        connector.end();
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(4000, () => {
    console.log('✅ 数据代理已启动！');
    console.log('📡 正在监听: http://localhost:4000/data?code=000001.SZ');
});