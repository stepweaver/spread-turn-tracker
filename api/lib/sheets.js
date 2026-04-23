const { google } = require('googleapis');
const crypto = require('crypto');

const SHEETS_SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];

const HEADERS = {
    settings: [
        'id',
        'user_id',
        'top_total',
        'bottom_total',
        'install_date',
        'schedule_type',
        'interval_days',
        'child_name',
        'created_at',
        'updated_at'
    ],
    turns: [
        'id',
        'user_id',
        'date',
        'arch',
        'note',
        'created_at'
    ],
    treatment_notes: [
        'id',
        'user_id',
        'date',
        'note',
        'created_at',
        'updated_at'
    ]
};

let _sheetsClient = null;

function getSpreadsheetId() {
    const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!id || !id.trim()) {
        throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID must be set');
    }
    return id.trim();
}

function getServiceAccountEmail() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    if (!email || !email.trim()) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL must be set');
    }
    return email.trim();
}

function getPrivateKey() {
    const key = process.env.GOOGLE_PRIVATE_KEY;
    if (!key || !key.trim()) {
        throw new Error('GOOGLE_PRIVATE_KEY must be set');
    }
    return key.replace(/\\n/g, '\n');
}

function getSheetsClient() {
    if (_sheetsClient) {
        return _sheetsClient;
    }

    const auth = new google.auth.JWT({
        email: getServiceAccountEmail(),
        key: getPrivateKey(),
        scopes: SHEETS_SCOPE
    });

    _sheetsClient = google.sheets({
        version: 'v4',
        auth
    });

    return _sheetsClient;
}

function getHeaders(tabName) {
    const headers = HEADERS[tabName];
    if (!headers) {
        throw new Error(`Unknown sheet/tab: ${tabName}`);
    }
    return headers;
}

function ensureString(value) {
    if (value === null || value === undefined) return '';
    return String(value);
}

function rowArrayToObject(headers, row) {
    const obj = {};
    headers.forEach((header, index) => {
        obj[header] = row[index] ?? '';
    });
    return obj;
}

function objectToRowArray(headers, obj) {
    return headers.map((header) => ensureString(obj[header]));
}

async function readRawValues(tabName) {
    const sheets = getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${tabName}'`
    });

    return response.data.values || [];
}

async function readObjects(tabName) {
    const values = await readRawValues(tabName);
    const headers = getHeaders(tabName);

    if (values.length === 0) {
        return [];
    }

    const sheetHeaders = values[0];
    const dataRows = values.slice(1);

    return dataRows
        .filter((row) => row.some((cell) => String(cell || '').trim() !== ''))
        .map((row) => rowArrayToObject(sheetHeaders, row))
        .map((row) => {
            const normalized = {};
            headers.forEach((header) => {
                normalized[header] = row[header] ?? '';
            });
            return normalized;
        });
}

async function overwriteObjects(tabName, rows) {
    const sheets = getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    const headers = getHeaders(tabName);

    const matrix = [
        headers,
        ...rows.map((row) => objectToRowArray(headers, row))
    ];

    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'${tabName}'`
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tabName}'!A1`,
        valueInputOption: 'RAW',
        requestBody: {
            values: matrix
        }
    });
}

function nowIso() {
    return new Date().toISOString();
}

function generateId() {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = {
    HEADERS,
    getHeaders,
    readObjects,
    overwriteObjects,
    generateId,
    nowIso
};