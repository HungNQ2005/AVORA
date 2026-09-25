import React, { useState } from 'react';
import './Footer.css';

const BuildingPmsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
    <path d="M6 12h12" />
    <path d="M6 7h12" />
    <path d="M6 17h12" />
    <path d="M10 22v-4h4v4" />
  </svg>
);

/**
 * Reusable Footer component matching the visual reference image.
 * Includes a newsletter subscription banner, 4-column navigation links, and copyright disclaimer.
 *
 * @param {Object} props
 * @param {Function} [props.onLinkClick] - Click handler for footer links.
 */
const Footer = ({ onLinkClick }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 4000);
      setEmail('');
    }
  };

  const handleLink = (linkName) => (e) => {
    e.preventDefault();
    if (onLinkClick) {
      onLinkClick(linkName);
    }
  };

  return (
    <footer className="avora-footer">
      {/* Top Banner: Newsletter Subscription */}
      <div className="avora-footer__newsletter">
        <div className="avora-footer__container avora-footer__newsletter-inner">
          <span className="avora-footer__newsletter-title">
            Tiết kiệm thời gian, tiết kiệm tiền bạc! Đăng ký nhận bản tin Avora
          </span>

          <form className="avora-footer__newsletter-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Địa chỉ e-mail của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit">
              {subscribed ? 'Đã đăng ký!' : 'Đăng ký'}
            </button>
          </form>
        </div>
      </div>

      {/* Middle Section: Navigation Columns */}
      <div className="avora-footer__main">
        <div className="avora-footer__container avora-footer__grid">
          {/* Column 1: Customer Support */}
          <div className="avora-footer__col">
            <h4 className="avora-footer__col-title">Hỗ trợ khách hàng</h4>
            <ul className="avora-footer__links">
              <li><a href="#" onClick={handleLink('help-center')}>Trung tâm trợ giúp</a></li>
              <li><a href="#" onClick={handleLink('faq')}>Câu hỏi thường gặp</a></li>
              <li><a href="#" onClick={handleLink('safety')}>Thông tin an toàn du lịch</a></li>
              <li><a href="#" onClick={handleLink('complaints')}>Giải quyết khiếu nại</a></li>
            </ul>
          </div>

          {/* Column 2: Terms & Privacy */}
          <div className="avora-footer__col">
            <h4 className="avora-footer__col-title">Điều khoản & quyền riêng tư</h4>
            <ul className="avora-footer__links">
              <li><a href="#" onClick={handleLink('terms')}>Điều khoản & Điều kiện</a></li>
              <li><a href="#" onClick={handleLink('privacy')}>Chính sách bảo mật</a></li>
              <li><a href="#" onClick={handleLink('cookies')}>Chính sách Cookie</a></li>
              <li><a href="#" onClick={handleLink('payment-security')}>Bảo mật thông tin thanh toán</a></li>
            </ul>
          </div>

          {/* Column 3: About Avora */}
          <div className="avora-footer__col">
            <h4 className="avora-footer__col-title">Về Avora</h4>
            <ul className="avora-footer__links">
              <li><a href="#" onClick={handleLink('about-us')}>Về chúng tôi</a></li>
              <li><a href="#" onClick={handleLink('careers')}>Cơ hội nghề nghiệp</a></li>
              <li><a href="#" onClick={handleLink('press')}>Truyền thông & Báo chí</a></li>
              <li><a href="#" onClick={handleLink('investors')}>Quan hệ cổ đông</a></li>
            </ul>
          </div>

          {/* Column 4: For Partners */}
          <div className="avora-footer__col">
            <h4 className="avora-footer__col-title">Dành cho đối tác</h4>
            <ul className="avora-footer__links">
              <li className="avora-footer__pms-item">
                <a href="#" className="avora-footer__pms-link" onClick={handleLink('pms-portal')}>
                  <BuildingPmsIcon />
                  <span>Cổng Quản lý khách sạn (PMS)</span>
                </a>
              </li>
              <li><a href="#" onClick={handleLink('extranet')}>Đăng nhập Extranet</a></li>
              <li><a href="#" onClick={handleLink('partner-help')}>Trợ giúp đối tác</a></li>
              <li><a href="#" onClick={handleLink('partner-community')}>Cộng đồng đối tác Avora</a></li>
              <li><a href="#" onClick={handleLink('register-property')}>Đăng ký chỗ nghỉ mới</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Section: Copyright & Disclaimer */}
      <div className="avora-footer__bottom">
        <div className="avora-footer__container avora-footer__bottom-content">
          <p className="avora-footer__disclaimer">
            Avora.com là nền tảng đặt phòng trực tuyến hàng đầu dành cho du khách tại Việt Nam.
          </p>
          <p className="avora-footer__copyright">
            © 2024 Avora™. Bảo lưu mọi quyền.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

