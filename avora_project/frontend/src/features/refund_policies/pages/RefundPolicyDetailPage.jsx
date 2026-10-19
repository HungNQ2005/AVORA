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
  return new Date(dateStr).toLocaleString('vi-VN');
};

const RefundPolicyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [policy, setPolicy] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchRefundPolicyHotels()
      .then((data) => setHotels(data || []))
      .catch((err) => console.error('Failed to load hotels:', err));
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRefundPolicyById(id);
      setPolicy(data);
    } catch (err) {
      setError(err.message || 'Không thể tải thông tin chi tiết chính sách hoàn tiền.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadPolicy();
  }, [id]);

  const handleFormSubmit = async (formData) => {
    setFormLoading(true);
    try {
      const updated = await updateRefundPolicy(id, formData);
      setPolicy(updated);
      setFormModalOpen(false);
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi cập nhật chính sách.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await deleteRefundPolicy(id);
      setDeleteModalOpen(false);
      navigate('/admin/refund-policies');
    } catch (err) {
      alert(err.message || 'Không thể xóa chính sách hoàn tiền.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rpd-state-container">
        <div className="rpd-spinner"></div>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Đang tải thông tin chính sách hoàn tiền...
        </p>
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="rpd-state-container">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3 style={{ margin: '4px 0', color: '#0f172a' }}>Không tìm thấy chính sách</h3>
        <p style={{ margin: '0 0 16px 0', color: '#64748b' }}>{error || 'Chính sách hoàn tiền không tồn tại.'}</p>
        <button
          className="rp-top-btn rp-top-btn--primary"
          onClick={() => navigate('/admin/refund-policies')}
        >
          ← Quay lại danh sách chính sách
        </button>
      </div>
    );
  }

  const rate = Number(policy.refund_percentage || 0);
  const hours = Number(policy.minimum_cancellation_hours || 0);
  const penalty = Math.max(0, 100 - rate);

  return (
    <div className="rpd-page">
      {/* Breadcrumb */}
      <nav className="rpd-breadcrumb">
        <Link to="/admin/refund-policies">Quản lý chính sách hoàn tiền</Link>
        <span className="rpd-breadcrumb__sep">&gt;</span>
        <span className="rpd-breadcrumb__active">{policy.policy_name}</span>
      </nav>

      {/* Header */}
      <div className="rpd-header">
        <div className="rpd-header__left">
          <div className="rpd-header__icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="M9 12l2 2 4-4"></path>
            </svg>
          </div>
          <div className="rpd-header__info">
            <div className="rpd-header__title-row">
              <h1 className="rpd-header__title">{policy.policy_name}</h1>
              <span className="rpd-header__code">{policy.policy_code}</span>
              <span
                className={`rp-status-badge ${
                  policy.status === 'ACTIVE'
                    ? 'rp-status-badge--active'
                    : 'rp-status-badge--inactive'
                }`}
              >
                <span className="rp-status-badge__dot"></span>
                {policy.status === 'ACTIVE' ? 'Đang áp dụng' : 'Tạm dừng'}
              </span>
            </div>
            <div className="rpd-header__meta">
              <span>Khách sạn: <strong>{policy.hotel_name || 'Toàn hệ thống'}</strong></span>
              <span>•</span>
              <span>Mã ID: <code>{policy.policy_id}</code></span>
              <span>•</span>
              <span>Tạo lúc: {formatDateTime(policy.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="rpd-header__actions">
          <button
            className="rp-top-btn rp-top-btn--outline"
            onClick={() => navigate('/admin/refund-policies')}
          >
            ← Quay lại
          </button>
          <button
            className="rp-top-btn rp-top-btn--primary"
            onClick={() => setFormModalOpen(true)}
          >
            Chỉnh sửa
          </button>
          <button
            className="rp-top-btn rp-btn--cancel"
            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
            onClick={() => setDeleteModalOpen(true)}
          >
            Xóa
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="rpd-grid">
        {/* Left Column: Rules & Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Key Metrics */}
          <div className="rpd-card">
            <h3 className="rpd-card__title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              Các chỉ số cốt lõi của chính sách
            </h3>

            <div className="rpd-metrics-row">
              <div className="rpd-metric-box">
                <span className="rpd-metric-box__val" style={{ color: '#047857' }}>{rate}%</span>
                <span className="rpd-metric-box__label">TỶ LỆ HOÀN TIỀN</span>
              </div>
              <div className="rpd-metric-box">
                <span className="rpd-metric-box__val">{hours}h</span>
                <span className="rpd-metric-box__label">HỦY TRƯỚC CHECK-IN</span>
              </div>
              <div className="rpd-metric-box">
                <span className="rpd-metric-box__val" style={{ color: '#b45309' }}>{penalty}%</span>
                <span className="rpd-metric-box__label">PHÍ PHẠT SAU HẠN CHÓT</span>
              </div>
            </div>

            {/* Rule Callout */}
            <div className="rpd-callout">
              <div className="rpd-callout__title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                Quy tắc xử lý hoàn tiền
              </div>
              <p className="rpd-callout__text">
                Khách hàng hủy đặt phòng trước <strong>{hours > 0 ? `${hours} giờ` : 'giờ nhận phòng'}</strong>{' '}
                được hoàn trả <strong>{rate}%</strong> giá trị booking. Nếu hủy sau thời điểm này, mức hoàn trả sẽ được
                trừ theo tỷ lệ phạt <strong>{penalty}%</strong>.
              </p>
            </div>
          </div>

          {/* Điều kiện & Mô tả */}
          <div className="rpd-card">
            <h3 className="rpd-card__title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              Điều kiện áp dụng &amp; Mô tả
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>
                  Điều kiện hoàn tiền:
                </strong>
                <p style={{ margin: 0, fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.6, background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {policy.refund_conditions || 'Theo quy định tiêu chuẩn hủy đặt phòng của nền tảng AVORA.'}
                </p>
              </div>

              <div>
                <strong style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>
                  Mô tả chi tiết:
                </strong>
                <p style={{ margin: 0, fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.6, background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {policy.description || 'Không có mô tả bổ sung cho chính sách này.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hotel Scope & Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Phạm vi khách sạn */}
          <div className="rpd-card">
            <h3 className="rpd-card__title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
              </svg>
              Phạm vi cơ sở lưu trú
            </h3>

            <div className="rpd-info-list">
              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Phạm vi</span>
                <span className="rpd-info-item__val">{policy.hotel_id ? 'Khách sạn chỉ định' : 'Toàn hệ thống'}</span>
              </div>
              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Tên khách sạn</span>
                <span className="rpd-info-item__val">{policy.hotel_name || 'Toàn hệ thống AVORA'}</span>
              </div>
              {policy.hotel?.address && (
                <div className="rpd-info-item">
                  <span className="rpd-info-item__label">Địa chỉ</span>
                  <span className="rpd-info-item__val">{policy.hotel.address}</span>
                </div>
              )}
              {policy.hotel?.star_rating && (
                <div className="rpd-info-item">
                  <span className="rpd-info-item__label">Hạng sao</span>
                  <span className="rpd-info-item__val">⭐ {policy.hotel.star_rating} sao</span>
                </div>
              )}
            </div>
          </div>

          {/* Dữ liệu kiểm toán & Hiệu lực */}
          <div className="rpd-card">
            <h3 className="rpd-card__title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Thời hạn &amp; Kiểm toán
            </h3>

            <div className="rpd-info-list">
              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Hiệu lực từ ngày</span>
                <span className="rpd-info-item__val">{policy.effective_from ? formatDate(policy.effective_from) : 'Từ khi tạo'}</span>
              </div>
              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Hiệu lực đến ngày</span>
                <span className="rpd-info-item__val">{policy.effective_to ? formatDate(policy.effective_to) : 'Không thời hạn'}</span>
              </div>
              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Đơn đặt phòng áp dụng</span>
                <span className="rpd-info-item__val" style={{ color: '#003580', fontWeight: 800 }}>
                  {policy.associated_bookings_count || 0} booking
                </span>
              </div>
              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Ngày tạo</span>
                <span className="rpd-info-item__val">{formatDateTime(policy.created_at)}</span>
              </div>
              <div className="rpd-info-item">
                <span className="rpd-info-item__label">Cập nhật lần cuối</span>
                <span className="rpd-info-item__val">{formatDateTime(policy.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RefundPolicyFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={policy}
        hotels={hotels}
        loading={formLoading}
      />

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
