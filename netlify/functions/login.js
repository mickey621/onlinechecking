const bcrypt = require('bcryptjs');
const { getSupabaseAdmin } = require('../../lib/supabase');
const { signPayload } = require('../../lib/auth');
const { json } = require('../../lib/utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { userCode, password } = JSON.parse(event.body || '{}');
    if (!userCode || !password) return json(400, { error: '請輸入帳號與密碼' });

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, user_code, name, role, password_hash')
      .eq('user_code', userCode)
      .maybeSingle();

    if (error) throw error;
    if (!user) return json(401, { error: '帳號或密碼錯誤' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return json(401, { error: '帳號或密碼錯誤' });

    const token = signPayload({
      sub: user.id,
      userCode: user.user_code,
      name: user.name,
      role: user.role,
      exp: Date.now() + 1000 * 60 * 60 * 8
    }, process.env.APP_SECRET);

    return json(200, {
      token,
      user: { id: user.id, userCode: user.user_code, name: user.name, role: user.role }
    });
  } catch (err) {
    return json(500, { error: err.message || '伺服器錯誤' });
  }
};
