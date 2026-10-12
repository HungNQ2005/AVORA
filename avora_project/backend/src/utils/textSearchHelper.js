'use strict';

/**
 * Normalizes Vietnamese string by removing diacritical marks (accents).
 * e.g., "Nguyễn" -> "nguyen", "Đà Nẵng" -> "da nang"
 *
 * @param {string} str
 * @returns {string}
 */
const removeVietnameseTones = (str) => {
  if (str === null || str === undefined) return '';
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[ơƠ]/g, 'o')
    .replace(/[ưƯ]/g, 'u')
    .toLowerCase()
    .trim();
};

/**
 * Checks if target text contains the search query.
 * Matches case-insensitively and supports both accented & unaccented Vietnamese,
 * as well as punctuation-tolerant matching (e.g., "wifi" vs "wi-fi", "247" vs "24/7").
 *
 * @param {string|number} target - The text to search in
 * @param {string} term - The search query
 * @returns {boolean}
 */
const textContains = (target, term) => {
  if (!term || !term.toString().trim()) return true;
  if (!target) return false;

  const rawTarget = target.toString().normalize('NFC').toLowerCase();
  const rawTerm = term.toString().normalize('NFC').toLowerCase().trim();

  if (rawTarget.includes(rawTerm)) return true;

  const normTarget = removeVietnameseTones(target);
  const normTerm = removeVietnameseTones(term);

  if (normTarget.includes(normTerm)) return true;

  const cleanTarget = normTarget.replace(/[^a-z0-9]/g, '');
  const cleanTerm = normTerm.replace(/[^a-z0-9]/g, '');
  return Boolean(cleanTerm && cleanTarget.includes(cleanTerm));
};

/**
 * Checks if a list of fields matches all words in a search query.
 * Splits multi-word queries so e.g. "ho boi" matches "Hồ bơi vô cực".
 * Supports both accented & unaccented Vietnamese, multi-keyword search,
 * and punctuation tolerance.
 *
 * @param {Array<string|number|null|undefined>} fields - Array of strings or values
 * @param {string} searchTerm - Search query from user
 * @returns {boolean}
 */
const matchesSearch = (fields, searchTerm) => {
  if (!searchTerm || !searchTerm.toString().trim()) return true;
  if (!fields) return false;

  const fieldList = Array.isArray(fields) ? fields : [fields];
  const combinedRaw = fieldList
    .filter(Boolean)
    .map((f) => String(f).normalize('NFC').toLowerCase())
    .join(' ');
  const combinedNorm = removeVietnameseTones(combinedRaw);
  const cleanCombined = combinedNorm.replace(/[^a-z0-9]/g, '');

  const keywords = searchTerm
    .toString()
    .trim()
    .split(/[\s,;+]+/)
    .filter(Boolean);

  if (keywords.length === 0) return true;

  return keywords.every((kw) => {
    const rawKw = kw.normalize('NFC').toLowerCase();
    const normKw = removeVietnameseTones(kw);
    const cleanKw = normKw.replace(/[^a-z0-9]/g, '');

    if (combinedRaw.includes(rawKw)) return true;
    if (combinedNorm.includes(normKw)) return true;
    if (cleanKw && cleanCombined.includes(cleanKw)) return true;

    return false;
  });
};

module.exports = {
  removeVietnameseTones,
  textContains,
  matchesSearch,
};
