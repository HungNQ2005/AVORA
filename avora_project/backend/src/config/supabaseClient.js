'use strict';

const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

let supabase = null;

if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'avora',
    },
  });
  console.log('[Supabase] Client initialized successfully.');
} else {
  console.error(
    '[Supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Client not initialized.'
  );
}

module.exports = supabase;
