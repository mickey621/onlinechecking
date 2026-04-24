const { getSupabaseAdmin } = require('../../lib/supabase');
const { signPayload, verifyPayload, getBearerToken } = require('../../lib/auth');
const { json } = require('../../lib/utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  try {
    const token = getBearerToken(event.headers || {});
    const auth = verifyPayload(token, process.env.APP_SECRET);
    if (!auth || auth.role !== 'admin') return json(401, { error: '未授權，請重新登入' });

    const sessionId = event.queryStringParameters && event.queryStringParameters.sessionId;
    if (!sessionId) return json(400, { error: '缺少 sessionId' });

    const supabase = getSupabaseAdmin();
    const { data: session, error } = await supabase.from('sessions').select('id,status').eq('id', sessionId).maybeSingle();
    if (error) throw error;
    if (!session) return json(404, { error: '找不到場次' });
    if (session.status !== 'open') return json(400, { error: '場次未開啟' });

    const expiresInSeconds = 30;
    const qrToken = signPayload({ sessionId, exp: Date.now() + expiresInSeconds * 1000 }, process.env.QR_SECRET);
    return json(200, { qrToken, expiresInSeconds });
  } catch (err) {
    return json(500, { error: err.message || '伺服器錯誤' });
  }
};
