const { createClient } = require('@supabase/supabase-js');
function getSupabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}
module.exports = { getSupabaseAdmin };
