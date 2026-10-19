import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  fetchRefundPolicyById,
  fetchRefundPolicyHotels,
  updateRefundPolicy,
  deleteRefundPolicy,
} from '../../../services/refundPolicyApi';
import RefundPolicyFormModal from '../components/RefundPolicyFormModal';
import RefundPolicyDeleteModal from '../components/RefundPolicyDeleteModal';
import './RefundPolicyManagementPage.css';
import './RefundPolicyDetailPage.css';

/* ─── Helpers ─────────────────────────────────────────────────────────── */
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/* ─── Main Detail Component ─────────────────────────────────────────── */
const RefundPolicyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [policy, setPolicy] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Toast feedback matching Admin User Management
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'success' });
    }, 3500);
  };

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchRefundPolicyHotels()
      .then((data) => setHotels(data || []))
      .catch((err) => console.error('Failed to load hotels list:', err));
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRefundPolicyById(id);
      setPolicy(data);
    } catch (err) {
      console.error('Error loading policy detail:', err);
      setError(err.message || 'Không thể tải thông tin chi tiết chính sách hoàn tiền từ hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadPolicy();
    }
  }, [id]);

  const handleFormSubmit = async (formData) => {
    setFormLoading(true);
    try {
      const updated = await updateRefundPolicy(id, formData);
      setPolicy(updated);
      setFormModalOpen(false);
      showToast('Cập nhật chính sách hoàn tiền thành công!', 'success');
    } catch (err) {
      showToast(err.message || 'Có lỗi xảy ra khi cập nhật chính sách hoàn tiền.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await deleteRefundPolicy(id);
      setDeleteModalOpen(false);
      navigate('/dashboard/refund-policies');
    } catch (err) {
      showToast(err.message || 'Không thể xóa chính sách hoàn tiền.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="refund-policy-page">
        <div className="rpd-state-container">
          <div className="rpd-spinner"></div>
          <p className="rpd-state-text">Đang tải thông tin chi tiết chính sách hoàn tiền...</p>
        </div>
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="refund-policy-page">
        <div className="rpd-state-container rpd-state-container--error">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3 className="rpd-state-title">Không tìm thấy chính sách</h3>
          <p className="rpd-state-desc">{error || 'Chính sách hoàn tiền không tồn tại hoặc đã bị gỡ bỏ.'}</p>
          <button
            type="button"
            className="rp-btn rp-btn--primary-gold"
            onClick={() => navigate('/dashboard/refund-policies')}
          >
            ← Quay lại danh sách chính sách
          </button>
        </div>
      </div>
    );
  }

  const rate = Number(policy.refund_percentage || 0);
  const hours = Number(policy.minimum_cancellation_hours || policy.free_cancel_before_hours || 0);
  const penalty = Math.max(0, 100 - rate);

  return (
    <div className="refund-policy-page">
      {/* Toast Feedback Notification */}
      {toast.message && (
        <div className={`rp-mgmt-toast rp-mgmt-toast--${toast.type}`}>
          <div className="rp-mgmt-toast__icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
          </div>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb matching Admin User Management */}
      <nav className="rp-breadcrumb" aria-label="Breadcrumb">
        <Link to="/dashboard/refund-policies">Hệ thống</Link>
        <span className="rp-breadcrumb__sep">&gt;</span>
        <Link to="/dashboard/refund-policies">Marketing &amp; Doanh thu</Link>
        <span className="rp-breadcrumb__sep">&gt;</span>
        <Link to="/dashboard/refund-policies">Chính sách hoàn tiền</Link>
        <span className="rp-breadcrumb__sep">&gt;</span>
        <span className="rp-breadcrumb__current">{policy.policy_name}</span>
      </nav>

      {/* Page Header Card (Aligned with Admin User Management) */}
      <div className="rp-page-header">
        <div className="rp-page-header__left">
          <div className="rp-title-row">
            <button
              type="button"
              className="rp-btn rp-btn--outline rpd-back-arrow-btn"
              onClick={() => navigate('/dashboard/refund-policies')}
              title="Quay lại danh sách chính sách"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h1 className="rp-main-title">{policy.policy_name}</h1>
            <span className="rpd-code-badge">{policy.policy_code}</span>
            <span className="rp-role-badge">BUSINESS MANAGER</span>
            <span
              className={`rp-status-pill ${
                policy.status === 'ACTIVE' ? 'rp-status-pill--active' : 'rp-status-pill--locked'
              }`}
            >
              {policy.status === 'ACTIVE' ? 'Đang áp dụng' : 'Tạm dừng'}
            </span>
          </div>

          <p className="rp-subtitle">
            Mã định danh: <code>{policy.policy_id}</code> &bull; Cơ sở áp dụng:{' '}
            <strong>{policy.hotel_name || 'Toàn hệ thống AVORA'}</strong> &bull; Cập nhật lần cuối:{' '}
            {formatDateTime(policy.updated_at || policy.created_at)}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="rp-page-header__actions">
          <button
            type="button"
            className="rp-btn rp-btn--outline"
            onClick={() => navigate('/dashboard/refund-policies')}
            title="Quay lại danh sách chính sách hoàn tiền"
          >
            <span>Quay lại</span>
          </button>

          <button
            type="button"
            className="rp-btn rp-btn--primary-gold"
            onClick={() => setFormModalOpen(true)}
            title="Chỉnh sửa cấu hình chính sách này"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Chỉnh sửa chính sách</span>
          </button>

          <button
            type="button"
            className="rp-btn rp-btn--danger"
            onClick={() => setDeleteModalOpen(true)}
            title="Xóa chính sách khỏi hệ thống"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Xóa chính sách</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ KPI Metrics Cards matching rp-stats-grid */}
      <div className="rp-stats-grid">
        {/* KPI 1: Tỷ lệ hoàn */}
        <div className="rp-stat-card">
          <div className="rp-stat-card__header">
            <span className="rp-stat-card__title">TỶ LỆ HOÀN TIỀN</span>
            <div className="rp-stat-card__icon-box rp-stat-card__icon-box--green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8l-8 8" />
                <circle cx="9" cy="9" r="1.5" />
                <circle cx="15" cy="15" r="1.5" />
              </svg>
            </div>
          </div>
          <div className="rp-stat-card__value-row">
            <span className="rp-stat-card__main-value">{rate}%</span>
            <span className="rp-stat-card__unit">giá trị đặt phòng</span>
            <span className="rp-stat-card__badge rp-stat-card__badge--growth">Mức hoàn</span>
          </div>
          <div className="rp-stat-card__footer">
            <span className="rp-stat-card__footer-left">Hoàn tiền thực tế</span>
            <span className="rp-stat-card__footer-right">Bảo đảm bởi AVORA</span>
          </div>
        </div>

        {/* KPI 2: Hạn hủy tối thiểu */}
        <div className="rp-stat-card">
          <div className="rp-stat-card__header">
            <span className="rp-stat-card__title">HẠN HỦY TỐI THIỂU</span>
            <div className="rp-stat-card__icon-box rp-stat-card__icon-box--blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="rp-stat-card__value-row">
            <span className="rp-stat-card__main-value">{hours > 0 ? `${hours}h` : '0h'}</span>
            <span className="rp-stat-card__unit">trước giờ nhận phòng</span>
            <span className="rp-stat-card__badge rp-stat-card__badge--online">Hạn chót</span>
          </div>
          <div className="rp-stat-card__footer">
            <span className="rp-stat-card__footer-left">Thời hạn hợp lệ</span>
            <span className="rp-stat-card__footer-right">Hủy phòng linh hoạt</span>
          </div>
        </div>

        {/* KPI 3: Phí phạt khi hủy trễ */}
        <div className="rp-stat-card">
          <div className="rp-stat-card__header">
            <span className="rp-stat-card__title">PHÍ PHẠT KHI HỦY TRỄ</span>
            <div className="rp-stat-card__icon-box rp-stat-card__icon-box--amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 2 22 22 22 12 2" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>
          <div className="rp-stat-card__value-row">
            <span className="rp-stat-card__main-value">{penalty}%</span>
            <span className="rp-stat-card__unit">khấu trừ khi quá hạn</span>
            <span className="rp-stat-card__badge rp-stat-card__badge--urgent">Khấu trừ</span>
          </div>
          <div className="rp-stat-card__footer">
            <span className="rp-stat-card__footer-left">Sau thời hạn chót</span>
            <span className="rp-stat-card__footer-right">Giữ lại doanh thu</span>
          </div>
        </div>

        {/* KPI 4: Đơn booking bảo đảm */}
        <div className="rp-stat-card">
          <div className="rp-stat-card__header">
            <span className="rp-stat-card__title">ĐƠN ĐẶT PHÒNG BẢO ĐẢM</span>
            <div className="rp-stat-card__icon-box rp-stat-card__icon-box--purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>
          <div className="rp-stat-card__value-row">
            <span className="rp-stat-card__main-value">{policy.associated_bookings_count || 0}</span>
            <span className="rp-stat-card__unit">đơn đặt phòng</span>
            <span className="rp-stat-card__badge rp-stat-card__badge--secured">Bảo vệ</span>
          </div>
          <div className="rp-stat-card__footer">
            <span className="rp-stat-card__footer-left">Liên kết giao dịch</span>
            <span className="rp-stat-card__footer-right">Áp dụng tự động</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Detail Grid */}
      <div className="rpd-grid">
        {/* Left Column: Rules & SOP Guidelines */}
        <div className="rpd-col-main">
          {/* Card 1: Quy tắc & Điều kiện hoàn tiền */}
          <div className="rpd-card">
            <div className="rpd-card__header">
              <div className="rpd-card__title-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <h3 className="rpd-card__title">Quy tắc &amp; Điều kiện hoàn tiền</h3>
              </div>
              <span className="rpd-badge-gold">CƠ CHẾ ÁP DỤNG</span>
            </div>

            {/* Visual Callout */}
            <div className="rpd-callout">
              <div className="rpd-callout__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div className="rpd-callout__content">
                <div className="rpd-callout__headline">Quy định hủy &amp; hoàn tiền chính thức</div>
                <p className="rpd-callout__text">
                  Khách hàng gửi yêu cầu hủy đặt phòng trước{' '}
                  <strong>{hours > 0 ? `${hours} giờ` : 'thời điểm nhận phòng'}</strong> sẽ được hoàn trả{' '}
                  <strong>{rate}%</strong> tổng giá trị phòng. Trường hợp hủy sau thời hạn này, hệ thống sẽ tự động
                  áp dụng mức khấu trừ phí phạt <strong>{penalty}%</strong> giá trị booking.
                </p>
              </div>
            </div>

            {/* Conditions Block */}
            <div className="rpd-section-block">
              <div className="rpd-section-label">Điều kiện chi tiết áp dụng:</div>
              <div className="rpd-text-box">
                {policy.refund_conditions || 'Theo quy chế tiêu chuẩn hủy đặt phòng và bảo đảm quyền lợi khách hàng của AVORA.'}
              </div>
            </div>

            {/* Description Block */}
            <div className="rpd-section-block">
              <div className="rpd-section-label">Mô tả nghiệp vụ &amp; Ghi chú:</div>
              <div className="rpd-text-box">
                {policy.description || 'Chính sách tiêu chuẩn áp dụng cho các đơn đặt phòng thuộc phân khúc được cấu hình.'}
              </div>
            </div>
          </div>

          {/* Card 2: Quy trình vận hành & Hướng dẫn Lễ tân */}
          <div className="rpd-card">
            <div className="rpd-card__header">
              <div className="rpd-card__title-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <h3 className="rpd-card__title">Quy trình Hướng dẫn Lễ tân &amp; CSKH (SOP)</h3>
              </div>
              <span className="rpd-badge-blue">QUY CHUẨN DOANH NGHIỆP</span>
            </div>

            <div className="rpd-sop-steps">
              <div className="rpd-sop-step">
                <div className="rpd-sop-step__number">1</div>
                <div className="rpd-sop-step__content">
                  <div className="rpd-sop-step__title">Tiếp nhận yêu cầu hủy đặt phòng</div>
                  <div className="rpd-sop-step__desc">
                    Kiểm tra mã đặt phòng (Booking Code), xác định thời điểm khách hàng gửi yêu cầu hủy trên hệ thống.
                  </div>
                </div>
              </div>

              <div className="rpd-sop-step">
                <div className="rpd-sop-step__number">2</div>
                <div className="rpd-sop-step__content">
                  <div className="rpd-sop-step__title">Đối soát mốc thời gian tối thiểu</div>
                  <div className="rpd-sop-step__desc">
                    So sánh thời điểm hủy với giờ nhận phòng (Check-in). Đảm bảo đáp ứng trước hạn chót{' '}
                    <strong>{hours} giờ</strong> để kích hoạt hoàn tiền mức <strong>{rate}%</strong>.
                  </div>
                </div>
              </div>

              <div className="rpd-sop-step">
                <div className="rpd-sop-step__number">3</div>
                <div className="rpd-sop-step__content">
                  <div className="rpd-sop-step__title">Khấu trừ và xử lý tài chính</div>
                  <div className="rpd-sop-step__desc">
                    {penalty > 0
                      ? `Nếu quá hạn chót, tính phí phạt hủy ${penalty}% và hoàn phần còn lại qua cổng thanh toán ban đầu.`
                      : 'Chính sách hoàn 100% không phát sinh phí phạt; tiến hành duyệt hoàn toàn bộ giá trị booking.'}
                  </div>
                </div>
              </div>

              <div className="rpd-sop-step">
                <div className="rpd-sop-step__number">4</div>
                <div className="rpd-sop-step__content">
                  <div className="rpd-sop-step__title">Gửi xác nhận &amp; Cập nhật trạng thái</div>
                  <div className="rpd-sop-step__desc">
                    Hệ thống tự động phát hành email và cập nhật trạng thái đơn đặt phòng sang Đã hủy hoàn tiền.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hotel Scope & Audit Log */}
        <div className="rpd-col-side">
          {/* Card 3: Cơ sở lưu trú áp dụng */}
          <div className="rpd-card">
            <div className="rpd-card__header">
              <div className="rpd-card__title-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2">
                  <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                </svg>
                <h3 className="rpd-card__title">Cơ sở lưu trú áp dụng</h3>
              </div>
            </div>

            <div className="rpd-info-list">
              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Phạm vi áp dụng</span>
                <span className="rpd-info-item__val">
                  <span className={`rpd-scope-pill ${policy.hotel_id ? 'rpd-scope-pill--branch' : 'rpd-scope-pill--chain'}`}>
                    {policy.hotel_id ? 'Khách sạn cơ sở' : 'Toàn chuỗi AVORA'}
                  </span>
                </span>
              </div>

              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Tên cơ sở</span>
                <span className="rpd-info-item__val font-bold">
                  {policy.hotel_name || 'Áp dụng chung toàn hệ thống AVORA'}
                </span>
              </div>

              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Địa chỉ</span>
                <span className="rpd-info-item__val">
                  {policy.hotel?.address || 'Hệ thống chuỗi khách sạn & khu nghỉ dưỡng AVORA toàn quốc'}
                </span>
              </div>

              {policy.hotel?.star_rating && (
                <div className="rpd-info-item">
                  <span className="rpd-info-item__label">Xếp hạng cơ sở</span>
                  <span className="rpd-info-item__val font-gold">
                    ⭐ {policy.hotel.star_rating} sao cao cấp
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Hiệu lực & Kiểm toán hệ thống */}
          <div className="rpd-card">
            <div className="rpd-card__header">
              <div className="rpd-card__title-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <h3 className="rpd-card__title">Hiệu lực &amp; Kiểm toán</h3>
              </div>
            </div>

            <div className="rpd-info-list">
              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Hiệu lực từ</span>
                <span className="rpd-info-item__val">
                  {policy.effective_from ? formatDate(policy.effective_from) : 'Từ thời điểm tạo'}
                </span>
              </div>

              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Hiệu lực đến</span>
                <span className="rpd-info-item__val">
                  {policy.effective_to ? formatDate(policy.effective_to) : 'Không giới hạn thời gian'}
                </span>
              </div>

              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Đơn đặt phòng liên kết</span>
                <span className="rpd-info-item__val font-navy-bold">
                  {policy.associated_bookings_count || 0} booking
                </span>
              </div>

              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Ngày tạo bản ghi</span>
                <span className="rpd-info-item__val">{formatDateTime(policy.created_at)}</span>
              </div>

              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Cập nhật lần cuối</span>
                <span className="rpd-info-item__val">
                  {formatDateTime(policy.updated_at || policy.created_at)}
                </span>
              </div>

              <div className="rpd-info-item rpd-info-item--full">
                <span className="rpd-info-item__label">Mã định danh hệ thống (UUID)</span>
                <code className="rpd-uuid-box">{policy.policy_id}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Edit Modal */}
      <RefundPolicyFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={policy}
        hotels={hotels}
        loading={formLoading}
      />

      {/* Delete Confirmation Modal */}
      <RefundPolicyDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        policy={policy}
        loading={deleteLoading}
      />
    </div>
  );
};

export default RefundPolicyDetailPage;
