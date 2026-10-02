/**
 * Normalizes Vietnamese string by removing diacritical marks (accents).
 * e.g., "Nguyễn" -> "nguyen", "Đà Nẵng" -> "da nang"
 *
 * @param {string} str
 * @returns {string}
 */
export const removeVietnameseTones = (str) => {
  if (!str) return '';
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

/**
 * Checks if target text contains the search query.
 * Matches case-insensitively and supports both accented & unaccented Vietnamese.
 *
 * @param {string|number} target - The text to search in
 * @param {string} term - The search query
 * @returns {boolean}
 */
export const textContains = (target, term) => {
  if (!term || !term.toString().trim()) return true;
  if (!target) return false;

  const rawTarget = target.toString().toLowerCase();
  const rawTerm = term.toString().toLowerCase().trim();

  if (rawTarget.includes(rawTerm)) return true;

  const normTarget = removeVietnameseTones(target);
  const normTerm = removeVietnameseTones(term);

  return normTarget.includes(normTerm);
};

/**
 * Checks if a list of fields matches all words in a search query.
 * Splits multi-word queries so e.g. "nguyen an" matches "Nguyễn Văn An".
 *
 * @param {Array<string|number|null|undefined>} fields - Array of strings or values
 * @param {string} searchTerm - Search query from user
 * @returns {boolean}
 */
export const matchesSearch = (fields, searchTerm) => {
  if (!searchTerm || !searchTerm.toString().trim()) return true;
  if (!fields) return false;

  const fieldList = Array.isArray(fields) ? fields : [fields];
  const combinedRaw = fieldList.filter(Boolean).map(String).join(' ').toLowerCase();
  const combinedNorm = removeVietnameseTones(combinedRaw);

  const keywords = searchTerm.toString().trim().split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return true;

  return keywords.every((kw) => {
    const rawKw = kw.toLowerCase();
    const normKw = removeVietnameseTones(kw);
    return combinedRaw.includes(rawKw) || combinedNorm.includes(normKw);
  });
};
