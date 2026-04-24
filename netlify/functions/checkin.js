const { getSupabaseAdmin } = require('../../lib/supabase');
const { verifyPayload } = require('../../lib/auth');
const { json } = require('../../lib/utils');

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (n) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { qrToken, name, latitude, longitude, deviceId } = JSON.parse(event.body || '{}');
    if (!qrToken) return json(400, { error: '缺少 qrToken' });
    if (!name || !String(name).trim()) return json(400, { error: '請輸入姓名' });
    if (!deviceId || !String(deviceId).trim()) return json(400, { error: '裝置識別失敗，請重新整理後再試' });
    const qrPayload = verifyPayload(qrToken, process.env.QR_SECRET);
    if (!qrPayload || !qrPayload.sessionId) return json(400, { error: 'QR 無效或已過期' });

    const supabase = getSupabaseAdmin();
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', qrPayload.sessionId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) return json(404, { error: '找不到場次' });
    if (session.status !== 'open') return json(400, { error: '場次未開放簽到' });

    const now = Date.now();
    const startMs = new Date(session.starts_at).getTime();
    const endMs = new Date(session.ends_at).getTime();
    if (Number.isFinite(startMs) && now < startMs) return json(400, { error: '尚未到簽到時間' });
    if (Number.isFinite(endMs) && now > endMs) return json(400, { error: '簽到已截止' });

    const requireGps = session.require_gps !== false;
    let checkinLatitude = null;
    let checkinLongitude = null;

    if (requireGps) {
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return json(428, { error: 'GPS_REQUIRED', requireGps: true });
      }

      const distance = haversineMeters(
        Number(latitude),
        Number(longitude),
        Number(session.latitude),
        Number(session.longitude)
      );

      if (distance > Number(session.radius_meters || 0)) {
        return json(400, { error: `GPS 超出允許範圍，目前距離約 ${Math.round(distance)} 公尺` });
      }

      checkinLatitude = Number(latitude);
      checkinLongitude = Number(longitude);
    } else {
      // GPS 關閉的場次不要求使用者提供定位；沿用場地座標避免既有資料表 latitude/longitude NOT NULL 時寫入失敗。
      checkinLatitude = Number(session.latitude);
      checkinLongitude = Number(session.longitude);
    }

    const { data: existing, error: existingError } = await supabase
      .from('checkins')
      .select('id, checkin_time, name')
      .eq('session_id', qrPayload.sessionId)
      .eq('device_id', String(deviceId).trim())
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return json(409, {
        error: '你已經打過卡',
        alreadyChecked: true,
        checkinTime: existing.checkin_time,
        checkinName: existing.name || null
      });
    }

    const ipAddress = event.headers['x-forwarded-for'] || event.headers['client-ip'] || event.headers['X-Forwarded-For'] || null;
    const userAgent = event.headers['user-agent'] || event.headers['User-Agent'] || null;

    const { data: inserted, error: insertError } = await supabase
      .from('checkins')
      .insert({
        user_id: null,
        session_id: qrPayload.sessionId,
        name: String(name).trim(),
        checkin_time: new Date().toISOString(),
        latitude: checkinLatitude,
        longitude: checkinLongitude,
        device_id: String(deviceId).trim(),
        ip_address: ipAddress,
        user_agent: userAgent,
        is_suspicious: false
      })
      .select()
      .single();

    if (insertError) {
      const msg = String(insertError.message || '');
      if (msg.toLowerCase().includes('unique')) {
        const { data: retryExisting } = await supabase
          .from('checkins')
          .select('id, checkin_time, name')
          .eq('session_id', qrPayload.sessionId)
          .eq('device_id', String(deviceId).trim())
          .maybeSingle();

        return json(409, {
          error: '你已經打過卡',
          alreadyChecked: true,
          checkinTime: retryExisting?.checkin_time || null,
          checkinName: retryExisting?.name || null
        });
      }
      throw insertError;
    }

    return json(200, { ok: true, message: '簽到成功', requireGps, checkin: inserted });
  } catch (err) {
    return json(500, { error: err.message || '系統錯誤' });
  }
};
