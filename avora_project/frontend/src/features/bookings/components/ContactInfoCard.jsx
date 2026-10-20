import React from 'react';

/**
 * Card 1: Contact Information Form component
 */
const ContactInfoCard = ({ form, onChange }) => {
  return (
    <div className="booking-card">
      <div className="booking-card-header">
        <h3 className="booking-card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Thông tin người nhận phòng
        </h3>
        <p className="booking-card-subtitle">
          Họ tên và số điện thoại người đại diện nhận phòng tại quầy lễ tân khách sạn.
        </p>
      </div>

      <div className="booking-form-grid-2">
        <div className="booking-form-group">
          <label>
            Họ và tên đệm<span className="booking-required">*</span>
          </label>
          <input
            type="text"
            className="booking-input"
            name="lastName"
            value={form.lastName}
            onChange={onChange}
            placeholder="Ví dụ: Nguyễn"
            required
          />
        </div>

        <div className="booking-form-group">
          <label>
            Tên<span className="booking-required">*</span>
          </label>
          <input
            type="text"
            className="booking-input"
            name="firstName"
            value={form.firstName}
            onChange={onChange}
            placeholder="Ví dụ: Văn An"
            required
          />
        </div>
      </div>
      <div className="booking-form-group" style={{ marginTop: 16 }}>
        <label>
          Số điện thoại liên hệ<span className="booking-required">*</span>
        </label>
        <div className="phone-input-combo">
          <select
            className="country-code-select"
            name="countryCode"
            value={form.countryCode}
            onChange={onChange}
          >
            <option value="+84">VN +84</option>
            <option value="+1">US +1</option>
            <option value="+81">JP +81</option>
            <option value="+82">KR +82</option>
            <option value="+65">SG +65</option>
          </select>
          <input
            type="tel"
            className="booking-input"
            name="phone"
            value={form.phone}
            onChange={onChange}
            placeholder="0905 123 456"
            maxLength={15}
            required
          />
        </div>

      </div>
    </div>
  );
};

export default ContactInfoCard;
