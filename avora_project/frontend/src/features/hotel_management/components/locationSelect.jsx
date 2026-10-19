import React, { useEffect, useState } from 'react';
import { getCities, getDistricts, getWards } from '../../../services/hotelManagementService';

/**
 * Cascading City -> District -> Ward selector.
 * Selecting a City resets/enables District; selecting a District resets/enables Ward.
 * Out-of-order selection is disallowed via the `disabled` attribute on each <select>.
 */
const LocationSelect = ({ cityId, districtId, wardId, onChange, disabled }) => {
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  useEffect(() => {
    let active = true;
    getCities().then((data) => { if (active) setCities(data); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!cityId) { setDistricts([]); return undefined; }
    let active = true;
    getDistricts(cityId).then((data) => { if (active) setDistricts(data); }).catch(() => { if (active) setDistricts([]); });
    return () => { active = false; };
  }, [cityId]);

  useEffect(() => {
    if (!districtId) { setWards([]); return undefined; }
    let active = true;
    getWards(districtId).then((data) => { if (active) setWards(data); }).catch(() => { if (active) setWards([]); });
    return () => { active = false; };
  }, [districtId]);

  const handleCityChange = (event) => {
    const newCityId = event.target.value;
    const cityName = cities.find((c) => String(c.city_id) === String(newCityId))?.city_name || '';
    onChange({ city_id: newCityId, district_id: '', ward_id: '', city_name: cityName });
  };

  const handleDistrictChange = (event) => {
    const newDistrictId = event.target.value;
    onChange({ city_id: cityId, district_id: newDistrictId, ward_id: '' });
  };

  const handleWardChange = (event) => {
    onChange({ city_id: cityId, district_id: districtId, ward_id: event.target.value });
  };

  return (
    <>
      <label className="hotel-modal__field">
        <span>Tỉnh / Thành phố <b>*</b></span>
        <select value={cityId || ''} onChange={handleCityChange} disabled={disabled} required>
          <option value="">Chọn tỉnh/thành phố</option>
          {cities.map((city) => <option key={city.city_id} value={city.city_id}>{city.city_name}</option>)}
        </select>
      </label>
      <label className="hotel-modal__field">
        <span>Quận / Huyện</span>
        <select value={districtId || ''} onChange={handleDistrictChange} disabled={disabled || !cityId}>
          <option value="">{cityId ? 'Chọn quận/huyện' : 'Chọn tỉnh/thành phố trước'}</option>
          {districts.map((district) => <option key={district.district_id} value={district.district_id}>{district.district_name}</option>)}
        </select>
      </label>
      <label className="hotel-modal__field">
        <span>Phường / Xã</span>
        <select value={wardId || ''} onChange={handleWardChange} disabled={disabled || !districtId}>
          <option value="">{districtId ? 'Chọn phường/xã' : 'Chọn quận/huyện trước'}</option>
          {wards.map((ward) => <option key={ward.ward_id} value={ward.ward_id}>{ward.ward_name}</option>)}
        </select>
      </label>
    </>
  );
};

export default LocationSelect;
