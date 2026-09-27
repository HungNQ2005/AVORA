'use strict';

require('dotenv').config();

const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET: process.env.JWT_SECRET || 'avora_jwt_secret_dev_key_change_in_prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
};

// Validate required env vars on startup
const REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
const missing = REQUIRED_VARS.filter((key) => !env[key]);

if (missing.length > 0) {
  console.warn(
    `[ENV WARNING] Missing environment variables: ${missing.join(', ')}. Please fill in backend/.env`
  );
}

module.exports = env;
