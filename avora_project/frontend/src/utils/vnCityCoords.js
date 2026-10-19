/**
 * Approximate city-center coordinates for major Vietnamese provinces/cities.
 * Used only to pre-fill a sensible default latitude/longitude when a Vendor
 * selects a City in the hotel form; the value remains editable afterward.
 */
const VN_CITY_COORDS = {
  'FPTuni': { lat: 10.0123, lng: 105.7319 }
};

const DEFAULT_COORDS = VN_CITY_COORDS['FPTuni'];

export const getDefaultCoordsForCity = (cityName) => {
  if (!cityName) return null;
  const trimmed = cityName.trim();
  return VN_CITY_COORDS[trimmed] || DEFAULT_COORDS;
};

export default VN_CITY_COORDS;
