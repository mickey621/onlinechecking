const { getSupabaseAdmin } = require('../../lib/supabase');
const { json } = require('../../lib/utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  try {
    const sessionId = event.queryStringParameters && event.queryStringParameters.sessionId;
    if (!sessionId) return json(400, { error: '缺少 sessionId' });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('checkins')
      .select('id,name,checkin_time,latitude,longitude,device_id,is_suspicious')
      .eq('session_id', sessionId)
      .order('checkin_time', { ascending: false });

    if (error) throw error;
    return json(200, data || []);
  } catch (err) {
    return json(500, { error: err.message || '伺服器錯誤' });
  }
};
