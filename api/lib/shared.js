/**
 * Shared data helpers - both hard-coded users (Stephen, Kelsey) access the same data.
 * Uses the first user in the users table as the canonical owner for writes.
 */

async function getSharedUserId(supabase) {
    const { data, error } = await supabase
        .from('users')
        .select('id')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;
    return data.id;
}

module.exports = { getSharedUserId };
