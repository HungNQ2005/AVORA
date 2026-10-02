'use strict';

const supabase = require('../../config/supabaseClient');

const ensureClient = () => {
  if (!supabase) {
    const err = new Error('Database client is not initialized.');
    err.statusCode = 503;
    throw err;
  }
};

const checkQuery = (error) => {
  if (error) {
    console.error(`[LOCATION SERVICE] ${error.code || 'DB_ERROR'}: ${error.message}`);
    const err = new Error('Location data lookup failed.');
    err.statusCode = 500;
    throw err;
  }
};

const getCities = async () => {
  ensureClient();
  const { data, error } = await supabase
    .from('m_city')
    .select('city_id, city_name')
    .order('city_name', { ascending: true });
  checkQuery(error);
  return data || [];
};

const getDistricts = async (cityId) => {
  ensureClient();
  if (!cityId) {
    const err = new Error('city_id is required.');
    err.statusCode = 400;
    throw err;
  }
  const { data, error } = await supabase
    .from('m_district')
    .select('district_id, city_id, district_name')
    .eq('city_id', cityId)
    .order('district_name', { ascending: true });
  checkQuery(error);
  return data || [];
};

const getWards = async (districtId) => {
  ensureClient();
  if (!districtId) {
    const err = new Error('district_id is required.');
    err.statusCode = 400;
    throw err;
  }
  const { data, error } = await supabase
    .from('m_ward')
    .select('ward_id, district_id, ward_name')
    .eq('district_id', districtId)
    .order('ward_name', { ascending: true });
  checkQuery(error);
  return data || [];
};

module.exports = { getCities, getDistricts, getWards };
