/**
 * Central registry for all API endpoint paths.
 * Base URL is driven by the VITE_API_BASE_URL environment variable.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  SYSTEM_CODES: `${API_BASE_URL}/api/system-codes`,
  HEALTH: `${API_BASE_URL}/api/health`,
};
