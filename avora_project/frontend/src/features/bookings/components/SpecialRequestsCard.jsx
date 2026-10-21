import React from 'react';

const STANDARD_REQUESTS = [
  'Phòng không hút thuốc',
  '1 giường lớn đôi King-size',
  'Nhận phòng sớm (~12:00)',
  'Cũi / nôi cho trẻ sơ sinh',
  'Phòng vị trí yên tĩnh, gần biển',
];

/**
 * Card 3: Special Requests component
 */
const SpecialRequestsCard = ({
  hotelName = 'khu nghỉ dưỡng',
  selectedRequests = [],
  onToggleRequest,
  customNote = '',
  onNoteChange,
}) => {
  return (
    <div className="booking-card">
      <div className="booking-card-header">
        <h3 className="booking-card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          Yêu cầu đặc biệt cho chỗ nghỉ
        </h3>
        <p className="booking-card-subtitle">
          Các yêu cầu không mất phí và được {hotelName} phục vụ linh hoạt tùy vào tình trạng phòng sẵn có lúc nhận phòng.
        </p>
      </div>

      <div className="special-requests-grid">
        {STANDARD_REQUESTS.map((item) => {
          const isChecked = selectedRequests.includes(item);
          return (
            <label key={item} className="special-req-item">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggleRequest(item)}
              />
              <span>{item}</span>
            </label>
          );
        })}
      </div>

      <label className="special-req-textarea-label">
        Ghi chú riêng bằng Tiếng Việt hoặc Tiếng Anh (tùy chọn):
      </label>
      <textarea
        className="special-req-textarea"
        value={customNote}
        onChange={onNoteChange}
        placeholder="Gia đình có người cao tuổi, cần hỗ trợ xe điện buggy ra biển khi nhận phòng..."
        rows={3}
      />
    </div>
  );
};

export default SpecialRequestsCard;
