/**
 * Approximate city-center coordinates for major Vietnamese provinces/cities.
 * Used only to pre-fill a sensible default latitude/longitude when a Vendor
 * selects a City in the hotel form; the value remains editable afterward.
 */
const VN_CITY_COORDS = {
  'Hà Nội': { lat: 21.0278, lng: 105.8342 },
  'Hồ Chí Minh': { lat: 10.7769, lng: 106.7009 },
  'TP. Hồ Chí Minh': { lat: 10.7769, lng: 106.7009 },
  'Đà Nẵng': { lat: 16.0544, lng: 108.2022 },
  'Hải Phòng': { lat: 20.8449, lng: 106.6881 },
  'Cần Thơ': { lat: 10.0452, lng: 105.7469 },
  'Nha Trang': { lat: 12.2388, lng: 109.1967 },
  'Khánh Hòa': { lat: 12.2388, lng: 109.1967 },
  'Đà Lạt': { lat: 11.9404, lng: 108.4583 },
  'Lâm Đồng': { lat: 11.9404, lng: 108.4583 },
  'Huế': { lat: 16.4637, lng: 107.5909 },
  'Thừa Thiên Huế': { lat: 16.4637, lng: 107.5909 },
  'Quảng Ninh': { lat: 21.0064, lng: 107.2925 },
  'Vũng Tàu': { lat: 10.3460, lng: 107.0843 },
  'Bà Rịa - Vũng Tàu': { lat: 10.3460, lng: 107.0843 },
  'Phú Quốc': { lat: 10.2899, lng: 103.9840 },
  'Kiên Giang': { lat: 10.2899, lng: 103.9840 },
};

const DEFAULT_COORDS = VN_CITY_COORDS['Hà Nội'];

export const getDefaultCoordsForCity = (cityName) => {
  if (!cityName) return null;
  const trimmed = cityName.trim();
  return VN_CITY_COORDS[trimmed] || DEFAULT_COORDS;
};

export default VN_CITY_COORDS;
