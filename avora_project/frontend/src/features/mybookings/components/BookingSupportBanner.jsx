import React from 'react';
import { ConciergeBellIcon, ChatSupportIcon, PhoneCallIcon } from './BookingIcons';

/**
 * Bottom 24/7 Support Banner
 */
const BookingSupportBanner = () => {
  const handleChatClick = () => {
    const chatWidgetBtn = document.querySelector('.ai-chat-bubble-toggle');
    if (chatWidgetBtn) {
      chatWidgetBtn.click();
    } else {
      alert('Đang kết nối tổng đài viên trực tuyến...');
    }
  };

  return (
    <div className="my-bookings-support-banner">
      <div className="my-bookings-support-left">
        <div className="my-bookings-support-icon-wrap">
          <ConciergeBellIcon width="26" height="26" />
        </div>
        <div className="my-bookings-support-text">
          <h4 className="my-bookings-support-title">
            Cần trợ giúp đặc biệt cho chuyến đi sắp tới?
          </h4>
          <p className="my-bookings-support-desc">
            Đội ngũ hỗ trợ &amp; lễ tân Avora túc trực 24/7 qua điện thoại, ứng dụng và trung tâm trợ giúp nhanh.
          </p>
        </div>
      </div>

      <div className="my-bookings-support-actions">
        <button
          type="button"
          className="my-bookings-btn-chat"
          onClick={handleChatClick}
        >
          <ChatSupportIcon width="16" height="16" />
          <span>Chat với CSKH</span>
        </button>

        <a href="tel:19006868" className="my-bookings-btn-call" style={{ textDecoration: 'none' }}>
          <PhoneCallIcon width="16" height="16" />
          <span>Gọi 1900 6868</span>
        </a>
      </div>
    </div>
  );
};

export default BookingSupportBanner;
