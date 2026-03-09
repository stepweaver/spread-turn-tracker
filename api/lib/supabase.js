const { createClient } = require('@supabase/supabase-js');

let _client = null;

function getSupabaseClient() {
    if (_client) {
        return _client;
    }
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    }
    _client = createClient(url, key);
    return _client;
}

module.exports = { getSupabaseClient };
