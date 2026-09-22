'use strict';

require('dotenv').config();

const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

// Validate required env vars on startup
const REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = REQUIRED_VARS.filter((key) => !env[key]);

if (missing.length > 0) {
  console.warn(
    `[ENV WARNING] Missing environment variables: ${missing.join(', ')}. Please fill in backend/.env`
  );
}

module.exports = env;
