/**
 * Local development server - serves static files and API routes.
 * Use: npm run dev
 * For production, deploy to Vercel.
 */
const fs = require('fs');
const path = require('path');
(function loadEnv() {
    try {
        require('dotenv').config({ path: '.env.local' });
    } catch (_) {
        const envPath = path.join(__dirname, '.env.local');
        if (fs.existsSync(envPath)) {
            fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
                const m = line.match(/^([^#=]+)=(.*)$/);
                if (m) process.env[m[1].trim()] = m[2].trim();
            });
        }
    }
})();
const http = require('http');

const PORT = process.env.PORT || 3000;
const API_HANDLERS = {
    '/api/login': require('./api/login.js'),
    '/api/verify': require('./api/verify.js'),
    '/api/settings': require('./api/settings.js'),
    '/api/turns': require('./api/turns.js'),
    '/api/treatment-notes': require('./api/treatment-notes.js')
};

const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.ico': 'image/x-icon'
};

function wrapResponse(res) {
    const chain = {
        json: (obj) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(obj));
        },
        end: () => res.end()
    };
    res.status = (code) => {
        res.statusCode = code;
        return chain;
    };
    return res;
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    const pathname = url.pathname;

    if (pathname.startsWith('/api/')) {
        const route = pathname.split('?')[0];
        const handler = API_HANDLERS[route];
        if (!handler) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
        }
        wrapResponse(res);
        let body = '';
        for await (const chunk of req) body += chunk;
        const vercelReq = {
            method: req.method,
            headers: req.headers,
            url: req.url,
            body: {},
            get query() {
                return Object.fromEntries(url.searchParams);
            }
        };
        try {
            if (body) vercelReq.body = JSON.parse(body);
        } catch (_) {}
        try {
            await handler(vercelReq, res);
        } catch (err) {
            console.error('API error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
        return;
    }

    const filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    const ext = path.extname(filePath);
    fs.readFile(filePath, (err, data) => {
        if (err || !data) {
            fs.readFile(path.join(__dirname, 'index.html'), (e, d) => {
                if (e || !d) { res.writeHead(404); res.end(); return; }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(d);
            });
            return;
        }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Local dev server: http://127.0.0.1:${PORT}`);
});
