const { getSupabaseAdmin } = require('../../lib/supabase');
const { verifyPayload, getBearerToken } = require('../../lib/auth');
const { json } = require('../../lib/utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  try {
    const token = getBearerToken(event.headers || {});
    const payload = verifyPayload(token, process.env.APP_SECRET);
    if (!payload || payload.role !== 'admin') {
      return json(401, { error: '未授權，請重新登入' });
    }

    const sessionId = event.queryStringParameters && event.queryStringParameters.sessionId;
    const status = event.queryStringParameters && event.queryStringParameters.status;
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('sessions')
      .select('id, title, latitude, longitude, radius_meters, require_gps, starts_at, ends_at, status, created_at, checkins(count)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (sessionId) query = query.eq('id', sessionId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return json(200, data || []);
  } catch (err) {
    return json(500, { error: err.message || '伺服器錯誤' });
  }
};
