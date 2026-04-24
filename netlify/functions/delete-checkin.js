const { getSupabaseAdmin } = require('../../lib/supabase');
const { verifyPayload, getBearerToken } = require('../../lib/auth');
const { json } = require('../../lib/utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'DELETE' && event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const token = getBearerToken(event.headers || {});
    const payload = verifyPayload(token, process.env.APP_SECRET);
    if (!payload || payload.role !== 'admin') {
      return json(401, { error: '未授權，請重新登入' });
    }

    let body = {};
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (_) {
      body = {};
    }

    const qs = event.queryStringParameters || {};
    const checkinId = body.checkinId || body.id || qs.checkinId || qs.id;
    const sessionId = body.sessionId || qs.sessionId;
    if (!checkinId) return json(400, { error: '缺少 checkinId' });

    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from('checkins')
      .select('id, name, session_id, checkin_time')
      .eq('id', checkinId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) return json(404, { error: '找不到簽到紀錄，可能已被刪除' });
    if (sessionId && String(existing.session_id) !== String(sessionId)) {
      return json(400, { error: '簽到紀錄與目前場次不一致，已停止刪除' });
    }

    const { error: deleteError } = await supabase
      .from('checkins')
      .delete()
      .eq('id', checkinId);

    if (deleteError) throw deleteError;

    return json(200, {
      ok: true,
      message: '簽到紀錄已刪除',
      deleted: existing
    });
  } catch (err) {
    return json(500, { error: err.message || '伺服器錯誤' });
  }
};
