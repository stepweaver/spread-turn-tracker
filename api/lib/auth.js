const jwt = require('jsonwebtoken');

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === '') {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return secret;
}

function verifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
    }
    const token = authHeader.substring(7);
    return jwt.verify(token, getJwtSecret());
}

function getAllowedOrigin() {
    if (process.env.ALLOWED_ORIGIN) {
        return process.env.ALLOWED_ORIGIN;
    }
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    return '*';
}

function setCorsHeaders(res, methods = 'GET, POST, PUT, DELETE, OPTIONS', extraHeaders = 'Content-Type, Authorization') {
    res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin());
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', extraHeaders);
}

module.exports = {
    getJwtSecret,
    verifyToken,
    setCorsHeaders
};
