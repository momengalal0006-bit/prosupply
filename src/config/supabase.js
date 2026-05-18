const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseKey = supabaseServiceRoleKey || process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  if (!supabaseServiceRoleKey) {
    console.warn(
      '⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Using SUPABASE_KEY may fail with "row-level security policy" errors for server uploads.'
    );
  }
} else {
  console.warn('⚠️ Supabase URL or key is missing. Cloud storage uploads will fail.');
}

module.exports = supabase;
