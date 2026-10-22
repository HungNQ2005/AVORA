import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchCommissionPolicyById,
  fetchCommissionPolicyHotels,
  updateCommissionPolicy,
  deleteCommissionPolicy,
} from '../../../services/commissionPolicyApi';
import CommissionPolicyFormModal from '../components/CommissionPolicyFormModal';
import CommissionPolicyDeleteModal from '../components/CommissionPolicyDeleteModal';
import './CommissionPolicyManagementPage.css';
import './CommissionPolicyDetailPage.css';

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

const CommissionPolicyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [policy, setPolicy] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Toast
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Simulator State
  const [simAmount, setSimAmount] = useState(2000000); // 2,000,000 VND default

  useEffect(() => {
    fetchCommissionPolicyHotels()
      .then((data) => setHotels(data || []))
      .catch((err) => console.error('Lỗi khi tải danh sách khách sạn:', err));
  }, []);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommissionPolicyById(id);
      setPolicy(data);
    } catch (err) {
      console.error('Lỗi khi tải chi tiết chính sách hoa hồng:', err);
      setError(err.message || 'Không thể tải thông tin chi tiết chính sách phí hoa hồng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadDetail();
    }
  }, [id]);

  const handleUpdate = async (payload) => {
    setFormLoading(true);
    try {
      const updated = await updateCommissionPolicy(id, payload);
      setPolicy(updated);
      showToast('Cập nhật chính sách phí hoa hồng thành công!', 'success');
      setFormModalOpen(false);
    } catch (err) {
      console.error('Lỗi khi cập nhật:', err);
      showToast(err.message || 'Lỗi khi cập nhật chính sách.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteCommissionPolicy(id);
      showToast('Đã xóa chính sách phí hoa hồng thành công.', 'info');
      setDeleteModalOpen(false);
      setTimeout(() => {
        navigate('/dashboard/commission-policies');
      }, 700);
    } catch (err) {
      console.error('Lỗi khi xóa:', err);
      showToast(err.message || 'Lỗi khi xóa chính sách.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="cpd-page">
        <div className="cp-empty-state" style={{ marginTop: '4rem' }}>
          <div
            className="cp-btn-spinner"
            style={{
              margin: '0 auto 14px',
              width: 32,
              height: 32,
              borderColor: '#003580',
              borderTopColor: 'transparent',
            }}
          />
          <div className="cp-empty-title">Đang tải thông tin chính sách phí hoa hồng...</div>
        </div>
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="cpd-page">
        <div className="cp-empty-state" style={{ marginTop: '4rem' }}>
          <div className="cp-empty-icon">⚠️</div>
          <div className="cp-empty-title">Không tìm thấy chính sách hoa hồng</div>
          <div className="cp-empty-desc">{error || 'Mã chính sách không tồn tại hoặc đã bị xóa.'}</div>
          <button
            type="button"
            className="cp-btn cp-btn--outline"
            onClick={() => navigate('/dashboard/commission-policies')}
            style={{ marginTop: '14px' }}
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  // Simulation calculations
  const rate = Number(policy.commission_rate || 0);
  const hostRate = Math.max(0, 100 - rate);
  const currentSimAmount = Number(simAmount) || 0;
  const avoraCut = Math.round((currentSimAmount * rate) / 100);
  const hostCut = Math.max(0, currentSimAmount - avoraCut);

  const statusClass =
    policy.status === 'ACTIVE'
      ? 'cp-status-pill--active'
      : policy.status === 'UPCOMING'
      ? 'cp-status-pill--upcoming'
      : 'cp-status-pill--expired';

  return (
    <div className="cpd-page">
      {/* Toast */}
      {toast.message && (
        <div className={`cp-mgmt-toast cp-mgmt-toast--${toast.type}`}>
          <span className="cp-mgmt-toast__icon">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="cp-page-header">
        <div className="cp-page-header__left">
          <div className="cp-breadcrumb">
            <span
              style={{ cursor: 'pointer', color: '#003580' }}
              onClick={() => navigate('/dashboard/commission-policies')}
            >
              Chính sách phí hoa hồng
            </span>
            <span className="cp-breadcrumb__sep">/</span>
            <span className="cp-breadcrumb__current">{policy.policy_code}</span>
          </div>

          <div className="cp-title-row">
            <h1 className="cp-main-title">{policy.policy_name}</h1>
            <span className="cpd-code-badge">{policy.policy_code}</span>
            <span className="cp-role-badge">BUSINESS MANAGER</span>
            <span className={`cp-status-pill ${statusClass}`}>{policy.status_label}</span>
          </div>

          <p className="cp-subtitle">
            Mã định danh UUID: <code>{policy.policy_id}</code> &bull; Phạm vi áp dụng:{' '}
            <strong>{policy.scope_label}</strong> &bull; Cập nhật lần cuối:{' '}
            {formatDateTime(policy.updated_at || policy.created_at)}
          </p>
        </div>

        <div className="cp-page-header__actions">
          <button
            type="button"
            className="cp-btn cp-btn--outline"
            onClick={() => navigate('/dashboard/commission-policies')}
            title="Quay lại danh sách chính sách"
          >
            Quay lại
          </button>

          <button
            type="button"
            className="cp-btn cp-btn--primary-gold"
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
            className="cp-btn cp-btn--danger"
            onClick={() => setDeleteModalOpen(true)}
            title="Xóa chính sách"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Xóa chính sách</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ KPI Metrics */}
      <div className="cp-stats-grid">
        {/* KPI 1: Tỷ lệ hoa hồng */}
        <div className="cp-stat-card">
          <div className="cp-stat-card__header">
            <span className="cp-stat-card__title">TỶ LỆ HOA HỒNG</span>
            <div className="cp-stat-card__icon-box cp-stat-card__icon-box--amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8l-8 8" />
                <circle cx="9" cy="9" r="1.5" />
                <circle cx="15" cy="15" r="1.5" />
              </svg>
            </div>
          </div>
          <div className="cp-stat-card__value-row">
            <span className="cp-stat-card__main-value">{policy.commission_rate}%</span>
            <span className="cp-stat-card__unit">doanh thu</span>
            <span className="cp-stat-card__badge cp-stat-card__badge--urgent">Trích AVORA</span>
          </div>
          <div className="cp-stat-card__footer">
            <span className="cp-stat-card__footer-left">Đối tác thực nhận</span>
            <span className="cp-stat-card__footer-right">{hostRate}% doanh thu</span>
          </div>
        </div>

        {/* KPI 2: Mức độ ưu tiên */}
        <div className="cp-stat-card">
          <div className="cp-stat-card__header">
            <span className="cp-stat-card__title">MỨC ĐỘ ƯU TIÊN</span>
            <div className="cp-stat-card__icon-box cp-stat-card__icon-box--blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </div>
          <div className="cp-stat-card__value-row">
            <span className="cp-stat-card__main-value">Cấp {policy.priority_level}</span>
            <span className="cp-stat-card__unit">thứ bậc</span>
            <span className="cp-stat-card__badge cp-stat-card__badge--online">Xung đột</span>
          </div>
          <div className="cp-stat-card__footer">
            <span className="cp-stat-card__footer-left">Độ ưu tiên áp dụng</span>
            <span className="cp-stat-card__footer-right">
              {policy.priority_level >= 3 ? 'Ưu tiên cao nhất' : policy.priority_level === 2 ? 'Ưu tiên hạng sao' : 'Mặc định toàn chuỗi'}
            </span>
          </div>
        </div>

        {/* KPI 3: Phạm vi áp dụng */}
        <div className="cp-stat-card">
          <div className="cp-stat-card__header">
            <span className="cp-stat-card__title">PHẠM VI ÁP DỤNG</span>
            <div className="cp-stat-card__icon-box cp-stat-card__icon-box--purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
              </svg>
            </div>
          </div>
          <div className="cp-stat-card__value-row">
            <span className="cp-stat-card__main-value" style={{ fontSize: '1.45rem' }}>
              {policy.scope === 'SYSTEM' ? 'Toàn chuỗi' : policy.scope === 'STAR' ? `${policy.star_quality} Sao` : 'Khách sạn riêng'}
            </span>
            <span className="cp-stat-card__unit">quy mô</span>
            <span className="cp-stat-card__badge cp-stat-card__badge--secured">Phân cấp</span>
          </div>
          <div className="cp-stat-card__footer">
            <span className="cp-stat-card__footer-left">Phạm vi hiệu lực</span>
            <span className="cp-stat-card__footer-right">{policy.scope_label}</span>
          </div>
        </div>

        {/* KPI 4: Hiệu lực chính sách */}
        <div className="cp-stat-card">
          <div className="cp-stat-card__header">
            <span className="cp-stat-card__title">HIỆU LỰC CHÍNH SÁCH</span>
            <div className="cp-stat-card__icon-box cp-stat-card__icon-box--green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <div className="cp-stat-card__value-row">
            <span
              className="cp-stat-card__main-value"
              style={{
                fontSize: '1.45rem',
                color: policy.status === 'ACTIVE' ? '#10b981' : policy.status === 'UPCOMING' ? '#2563eb' : '#64748b',
              }}
            >
              {policy.status_label}
            </span>
            <span className="cp-stat-card__unit">trạng thái</span>
            <span
              className={`cp-stat-card__badge ${
                policy.status === 'ACTIVE' ? 'cp-stat-card__badge--growth' : 'cp-stat-card__badge--online'
              }`}
            >
              {policy.status === 'ACTIVE' ? 'Hoạt động' : 'Dự kiến'}
            </span>
          </div>
          <div className="cp-stat-card__footer">
            <span className="cp-stat-card__footer-left">Thời hạn đối soát</span>
            <span className="cp-stat-card__footer-right">
              {policy.valid_from ? formatDate(policy.valid_from) : 'Bắt đầu'} &rarr;{' '}
              {policy.valid_to ? formatDate(policy.valid_to) : 'Vô thời hạn'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid 2 Cột: Thông số & Công cụ mô phỏng */}
      <div className="cpd-grid-layout">
        {/* Cột 1: Thông số cấu hình & Công cụ tính toán mô phỏng */}
        <div className="cpd-card">
          <div className="cpd-card__header">
            <div className="cpd-card__title-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <h3 className="cpd-card__title">Công cụ mô phỏng quyết toán doanh thu</h3>
            </div>
            <span className="cpd-badge-blue">TỰ ĐỘNG TÍNH TOÁN</span>
          </div>

          <div className="cpd-simulator-card">
            <div className="cpd-calc-input-group">
              <label className="cpd-calc-input-label">
                Nhập giá trị đơn đặt phòng mẫu (VNĐ):
              </label>
              <input
                type="number"
                step="100000"
                min="0"
                className="cpd-calc-input"
                value={simAmount}
                onChange={(e) => setSimAmount(Number(e.target.value) || 0)}
              />
            </div>

            {/* Thanh biểu đồ phân chia tỷ lệ */}
            <div className="cpd-split-bar">
              <div
                className="cpd-split-bar__avora"
                style={{ width: `${Math.max(8, rate)}%` }}
                title={`AVORA: ${rate}%`}
              >
                AVORA {rate}%
              </div>
              <div
                className="cpd-split-bar__host"
                style={{ width: `${Math.max(8, hostRate)}%` }}
                title={`Khách sạn: ${hostRate}%`}
              >
                Khách sạn {hostRate}%
              </div>
            </div>

            {/* Chi tiết con số */}
            <div className="cpd-split-legend">
              <div className="cpd-legend-item">
                <div className="cpd-legend-label">
                  <span className="cpd-legend-dot" style={{ background: '#003580' }} />
                  Phí hoa hồng AVORA thu ({rate}%):
                </div>
                <div className="cpd-legend-value" style={{ color: '#003580' }}>
                  {avoraCut.toLocaleString('vi-VN')} VNĐ
                </div>
              </div>

              <div className="cpd-legend-item">
                <div className="cpd-legend-label">
                  <span className="cpd-legend-dot" style={{ background: '#10b981' }} />
                  Đối tác khách sạn thực nhận ({hostRate}%):
                </div>
                <div className="cpd-legend-value" style={{ color: '#059669' }}>
                  {hostCut.toLocaleString('vi-VN')} VNĐ
                </div>
              </div>
            </div>
          </div>

          {/* Bảng chi tiết thông số */}
          <div style={{ marginTop: '0.5rem' }}>
            <div className="cpd-param-row">
              <span className="cpd-param-label">Tên chính sách:</span>
              <span className="cpd-param-value">{policy.policy_name}</span>
            </div>
            <div className="cpd-param-row">
              <span className="cpd-param-label">Mã hệ thống:</span>
              <span className="cpd-param-value">{policy.policy_code}</span>
            </div>
            <div className="cpd-param-row">
              <span className="cpd-param-label">Phạm vi áp dụng:</span>
              <span className="cpd-param-value">{policy.scope_label}</span>
            </div>
            <div className="cpd-param-row">
              <span className="cpd-param-label">Khách sạn liên kết:</span>
              <span className="cpd-param-value">
                {policy.hotel ? `${policy.hotel.name} (${policy.hotel.address || ''})` : 'Toàn bộ khách sạn theo phạm vi'}
              </span>
            </div>
            <div className="cpd-param-row">
              <span className="cpd-param-label">Mức độ ưu tiên (Priority Level):</span>
              <span className="cpd-param-value">Cấp {policy.priority_level} (Áp dụng khi có tranh chấp)</span>
            </div>
            <div className="cpd-param-row">
              <span className="cpd-param-label">Ngày kích hoạt hiệu lực:</span>
              <span className="cpd-param-value">{policy.valid_from ? formatDate(policy.valid_from) : 'Ngay khi ban hành'}</span>
            </div>
            <div className="cpd-param-row">
              <span className="cpd-param-label">Ngày kết thúc hiệu lực:</span>
              <span className="cpd-param-value">{policy.valid_to ? formatDate(policy.valid_to) : 'Không giới hạn (Vô thời hạn)'}</span>
            </div>
            <div className="cpd-param-row">
              <span className="cpd-param-label">Thời điểm khởi tạo:</span>
              <span className="cpd-param-value">{formatDateTime(policy.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Cột 2: Hướng dẫn nghiệp vụ & Quy trình Quyết toán tài chính (SOP) */}
        <div className="cpd-card">
          <div className="cpd-card__header">
            <div className="cpd-card__title-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <h3 className="cpd-card__title">Quy trình Quyết toán Hoa hồng & Đối soát (SOP)</h3>
            </div>
            <span className="cpd-badge-blue">QUY CHUẨN DOANH NGHIỆP</span>
          </div>

          <div className="cpd-sop-steps">
            <div className="cpd-sop-step">
              <div className="cpd-sop-step__number">1</div>
              <div className="cpd-sop-step__content">
                <div className="cpd-sop-step__title">Xác định tỷ lệ hoa hồng hiệu lực tại thời điểm đặt phòng</div>
                <div className="cpd-sop-step__desc">
                  Khi khách hàng hoàn tất thanh toán đơn đặt phòng (<code>t_booking</code>),
                  hệ thống sẽ rà soát các chính sách hoa hồng đang trong thời hạn hiệu lực theo thứ tự ưu tiên
                  (Khách sạn cụ thể &rarr; Phân khúc sao &rarr; Toàn chuỗi).
                </div>
              </div>
            </div>

            <div className="cpd-sop-step">
              <div className="cpd-sop-step__number">2</div>
              <div className="cpd-sop-step__content">
                <div className="cpd-sop-step__title">Tạo bản ghi đối soát tài chính (Settlement Record)</div>
                <div className="cpd-sop-step__desc">
                  Hệ thống tự động khởi tạo bản ghi trong bảng <code>t_settlement</code> với tỷ lệ{' '}
                  <strong>{rate}%</strong>, tính toán trường <code>commission_amount</code> và{' '}
                  <code>host_earnings</code> tương ứng.
                </div>
              </div>
            </div>

            <div className="cpd-sop-step">
              <div className="cpd-sop-step__number">3</div>
              <div className="cpd-sop-step__content">
                <div className="cpd-sop-step__title">Ghi nhận số dư chờ và giải ngân vào ví đối tác</div>
                <div className="cpd-sop-step__desc">
                  Khoản doanh thu thực nhận của đối tác được cập nhật vào số dư chờ (<code>pending_balance</code>)
                  trong ví <code>t_hotel_wallet</code>. Sau khi khách hàng hoàn tất kỳ lưu trú (Check-out an toàn),
                  khoản tiền được chuyển thành số dư khả dụng (<code>available_balance</code>).
                </div>
              </div>
            </div>

            <div className="cpd-sop-step">
              <div className="cpd-sop-step__number">4</div>
              <div className="cpd-sop-step__content">
                <div className="cpd-sop-step__title">Báo cáo tài chính & Xuất biên lai hoa hồng</div>
                <div className="cpd-sop-step__desc">
                  Định kỳ hàng tháng, Business Manager đối soát tổng doanh thu và xuất hóa đơn giá trị gia tăng (VAT)
                  phí dịch vụ hoa hồng nền tảng AVORA gửi đến đối tác lưu trú.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <CommissionPolicyFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleUpdate}
        initialData={policy}
        hotels={hotels}
        loading={formLoading}
      />

      {/* Delete Modal */}
      <CommissionPolicyDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        policy={policy}
        loading={deleteLoading}
      />
    </div>
  );
};

export default CommissionPolicyDetailPage;
