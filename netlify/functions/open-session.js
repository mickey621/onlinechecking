const { getSupabaseAdmin } = require('../../lib/supabase');
const { verifyPayload, getBearerToken } = require('../../lib/auth');
const { json } = require('../../lib/utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const token = getBearerToken(event.headers || {});
    const payload = verifyPayload(token, process.env.APP_SECRET);
    if (!payload || payload.role !== 'admin') return json(401, { error: '未授權，請重新登入' });

    const { title, latitude, longitude, radiusMeters, startsAt, endsAt, requireGps } = JSON.parse(event.body || '{}');
    if (!title || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return json(400, { error: '場次資料不完整' });
    }
    if (!startsAt || !endsAt) return json(400, { error: '請輸入開始與結束時間' });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('sessions').insert({
      title: String(title).trim(),
      latitude,
      longitude,
      radius_meters: Number(radiusMeters || 80),
      require_gps: requireGps !== false,
      starts_at: startsAt,
      ends_at: endsAt,
      status: 'open',
      created_by: payload.sub
    }).select().single();

    if (error) throw error;
    return json(200, { session: data });
  } catch (err) {
    return json(500, { error: err.message || '伺服器錯誤' });
  }
};
