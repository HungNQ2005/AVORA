'use strict';

const supabase = require('../../config/supabaseClient');

/**
 * Fetch all records from m_system_code table.
 * Ordered by business_cd then sort_no.
 * @returns {{ data: Array, error: Object|null }}
 */
const getSystemCodes = async () => {
  if (!supabase) {
    throw new Error(
      'Database client is not initialized. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
    );
  }

  const { data, error } = await supabase
    .from('m_system_code')
    .select('*')
    .order('business_cd')
    .order('sort_no');

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  return data;
};

module.exports = { getSystemCodes };
