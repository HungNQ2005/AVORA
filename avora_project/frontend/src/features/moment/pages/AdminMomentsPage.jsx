import React, { useEffect, useState } from 'react';
import { adminRemoveMoment, listAdminMoments } from '../../../services/momentApi';
import './AdminMomentsPage.css';

const PAGE_SIZE = 12;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
};

const AdminMomentsPage = () => {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState({ published_from: '', published_to: '', hotel: '', author: '' });
  const [filters, setFilters] = useState({});
  const [selectedMoment, setSelectedMoment] = useState(null);
  const [removalTarget, setRemovalTarget] = useState(null);
  const [removalReason, setRemovalReason] = useState('');

  useEffect(() => {
    let active = true;
    listAdminMoments({ page: pagination.page, limit: PAGE_SIZE, ...filters })
      .then((result) => {
        if (!active) return;
        setItems(result.items || []);
        setPagination((current) => ({ ...current, ...(result.pagination || {}) }));
        setError('');
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Không thể tải danh sách Moment.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [pagination.page, reload, filters]);

  useEffect(() => {
    if (!selectedMoment && !removalTarget) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedMoment(null);
        setRemovalTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMoment, removalTarget]);

  const handleSearch = (event) => {
    event.preventDefault();
    setLoading(true);
    const nextFilters = Object.fromEntries(
      Object.entries(search).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()])
    );
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters(nextFilters);
  };

  const handleClearSearch = () => {
    setLoading(true);
    setSearch({ published_from: '', published_to: '', hotel: '', author: '' });
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters({});
  };

  const handleRemove = async () => {
    if (!removalTarget || removalTarget.is_admin_removed || busyId) return;
    const moment = removalTarget;
    setBusyId(moment.moment_id);
    setError('');
    try {
      await adminRemoveMoment(moment.moment_id, removalReason);
      const removedAt = new Date().toISOString();
      setItems((current) => current.map((item) => (
        item.moment_id === moment.moment_id
          ? {
            ...item,
            is_hidden: true,
            is_admin_removed: true,
            removal_reason: removalReason.trim() || null,
            removed_at: removedAt,
          }
          : item
      )));
      setSelectedMoment((current) => (
        current?.moment_id === moment.moment_id
          ? { ...current, is_hidden: true, is_admin_removed: true, removal_reason: removalReason.trim() || null, removed_at: removedAt }
          : current
      ));
      setRemovalTarget(null);
      setRemovalReason('');
    } catch (removeError) {
      setError(removeError.message || 'Không thể gỡ Moment.');
    } finally {
      setBusyId('');
    }
  };

  const openRemovalDialog = (moment) => {
    setRemovalTarget(moment);
    setRemovalReason('');
  };

  return (
    <main className="admin-moments">
      <header className="admin-moments__header">
        <div>
          <span className="admin-moments__eyebrow">QUẢN LÝ CỘNG ĐỒNG</span>
          <h1>Moment</h1>
          <p>Quản lý các bài đăng cộng đồng.</p>
        </div>
        <span className="admin-moments__total">{pagination.total.toLocaleString('vi-VN')} bài đăng</span>
      </header>

      <form className="admin-moments__filters" onSubmit={handleSearch}>
        {/* <label>
          <span>Đăng ngày</span>
          <input
            type="date"
            value={search.published_from}
            max={search.published_to || undefined}
            onChange={(event) => setSearch((current) => ({ ...current, published_from: event.target.value }))}
          />
        </label> */}
        {/* <label>
          <span>Đến ngày</span>
          <input
            type="date"
            value={search.published_to}
            min={search.published_from || undefined}
            onChange={(event) => setSearch((current) => ({ ...current, published_to: event.target.value }))}
          />
        </label> */}
        <label>
          <span>Khách sạn</span>
          <input
            type="search"
            value={search.hotel}
            placeholder="Tên khách sạn"
            onChange={(event) => setSearch((current) => ({ ...current, hotel: event.target.value }))}
          />
        </label>
        <label>
          <span>Tác giả</span>
          <input
            type="search"
            value={search.author}
            placeholder="Email hoặc tên người dùng"
            onChange={(event) => setSearch((current) => ({ ...current, author: event.target.value }))}
          />
        </label>
        <div className="admin-moments__filter-actions">
          <button type="submit" disabled={loading}>Tìm kiếm</button>
          <button type="button" onClick={handleClearSearch} disabled={loading}>Xóa lọc</button>
        </div>
      </form>

      {error && (
        <div className="admin-moments__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => {
            setLoading(true);
            setReload((value) => value + 1);
          }}>Thử lại</button>
        </div>
      )}

      {loading ? (
        <div className="admin-moments__state" role="status">Đang tải bài đăng...</div>
      ) : items.length ? (
        <>
          <section className="admin-moments__grid" aria-label="Danh sách bài đăng Moment">
            {items.map((moment) => (
              <article className={`admin-moments__card${moment.is_admin_removed ? ' is-removed' : ''}`} key={moment.moment_id}>
                <button
                  type="button"
                  className="admin-moments__open"
                  onClick={() => setSelectedMoment(moment)}
                  aria-label={`Xem chi tiết Moment của ${moment.creator_name || 'khách hàng'}`}
                >
                  <div className="admin-moments__media">
                    {moment.image_url && <img src={moment.image_url} alt="" loading="lazy" />}
                    <span className={`admin-moments__status${moment.is_admin_removed ? ' admin-moments__status--removed' : moment.is_hidden ? ' admin-moments__status--hidden' : ''}`}>
                      {moment.is_admin_removed ? 'Đã gỡ' : moment.is_hidden ? 'Tác giả đã ẩn' : 'Đang hiển thị'}
                    </span>
                  </div>
                  <div className="admin-moments__body">
                    <div className="admin-moments__author">
                      <strong>{moment.creator_name || 'Khách hàng Avora'}</strong>
                      {moment.creator_email && <span>{moment.creator_email}</span>}
                    </div>
                    {moment.hotel_name && <span className="admin-moments__hotel">{moment.hotel_name}</span>}
                    <p>{moment.message}</p>
                    <div className="admin-moments__meta">
                      <span>{formatDate(moment.created_at)}</span>
                      <span>{Number(moment.likes_count || 0).toLocaleString('vi-VN')} lượt thích</span>
                    </div>
                    <span className="admin-moments__details-link">Xem chi tiết</span>
                  </div>
                </button>
                <div className="admin-moments__card-action">
                  {moment.is_admin_removed ? (
                    <div className="admin-moments__removed-note">
                      Gỡ lúc {formatDate(moment.removed_at)}
                      {moment.removal_reason && <span>Lý do: {moment.removal_reason}</span>}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="admin-moments__remove"
                      onClick={() => openRemovalDialog(moment)}
                      disabled={Boolean(busyId)}
                    >
                      {busyId === moment.moment_id ? 'Đang gỡ...' : 'Gỡ bài vĩnh viễn'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>

          {pagination.total_pages > 1 && (
            <nav className="admin-moments__pagination" aria-label="Phân trang Moment">
              <button type="button" onClick={() => {
                setLoading(true);
                setPagination((current) => ({ ...current, page: current.page - 1 }));
              }} disabled={pagination.page <= 1 || loading}>
                Trước
              </button>
              <span>Trang {pagination.page} / {pagination.total_pages}</span>
              <button type="button" onClick={() => {
                setLoading(true);
                setPagination((current) => ({ ...current, page: current.page + 1 }));
              }} disabled={pagination.page >= pagination.total_pages || loading}>
                Tiếp
              </button>
            </nav>
          )}
        </>
      ) : (
        <div className="admin-moments__state">
          {Object.keys(filters).length ? 'Không tìm thấy Moment phù hợp với tiêu chí tìm kiếm.' : 'Chưa có bài đăng Moment.'}
        </div>
      )}

      {selectedMoment && (
        <div className="admin-moments__overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedMoment(null);
        }}>
          <section className="admin-moments__dialog admin-moments__detail" role="dialog" aria-modal="true" aria-labelledby="admin-moment-detail-title">
            <button type="button" className="admin-moments__dialog-close" onClick={() => setSelectedMoment(null)} aria-label="Đóng chi tiết">×</button>
            <span className="admin-moments__eyebrow">CHI TIẾT BÀI ĐĂNG</span>
            <h2 id="admin-moment-detail-title">{selectedMoment.creator_name || 'Khách hàng Avora'}</h2>
            <div className="admin-moments__detail-meta">
              <span>{selectedMoment.creator_email || 'Không có email'}</span>
              <span>{formatDate(selectedMoment.created_at)}</span>
              {selectedMoment.hotel_name && <span>Khách sạn: {selectedMoment.hotel_name}</span>}
              <span>{Number(selectedMoment.likes_count || 0).toLocaleString('vi-VN')} lượt thích</span>
              <span>{selectedMoment.is_admin_removed ? 'Admin đã gỡ' : selectedMoment.is_hidden ? 'Tác giả đã ẩn' : 'Đang hiển thị'}</span>
            </div>
            {selectedMoment.image_url && <img className="admin-moments__detail-image" src={selectedMoment.image_url} alt={`Ảnh Moment của ${selectedMoment.creator_name || 'khách hàng'}`} />}
            <p className="admin-moments__detail-message">{selectedMoment.message}</p>
            <div className="admin-moments__detail-booking">
              <span>Mã Moment: {selectedMoment.moment_id}</span>
              {selectedMoment.booking_id && <span>Mã đặt phòng: {selectedMoment.booking_id}</span>}
              {selectedMoment.is_admin_removed && selectedMoment.removed_at && <span>Admin gỡ lúc: {formatDate(selectedMoment.removed_at)}</span>}
              {selectedMoment.removal_reason && <span>Lý do gỡ: {selectedMoment.removal_reason}</span>}
            </div>
          </section>
        </div>
      )}

      {removalTarget && (
        <div className="admin-moments__overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busyId) setRemovalTarget(null);
        }}>
          <section className="admin-moments__dialog admin-moments__confirm" role="dialog" aria-modal="true" aria-labelledby="admin-moment-remove-title">
            <button type="button" className="admin-moments__dialog-close" onClick={() => setRemovalTarget(null)} disabled={Boolean(busyId)} aria-label="Đóng xác nhận">×</button>
            <span className="admin-moments__confirm-mark" aria-hidden="true">!</span>
            <span className="admin-moments__eyebrow">XÁC NHẬN GỠ BÀI</span>
            <h2 id="admin-moment-remove-title">Gỡ Moment vĩnh viễn?</h2>
            <p>Bài đăng sẽ bị ẩn khỏi cộng đồng và người đăng không thể khôi phục. Thao tác này không thể hoàn tác.</p>
            <label className="admin-moments__reason">
              <span>Lý do gỡ <small>(không bắt buộc)</small></span>
              <textarea
                value={removalReason}
                maxLength={500}
                rows={3}
                placeholder="Nhập lý do để lưu trong lịch sử quản trị"
                onChange={(event) => setRemovalReason(event.target.value)}
              />
            </label>
            <div className="admin-moments__confirm-actions">
              <button type="button" onClick={() => setRemovalTarget(null)} disabled={Boolean(busyId)}>Hủy</button>
              <button type="button" className="is-danger" onClick={handleRemove} disabled={Boolean(busyId)}>
                {busyId ? 'Đang gỡ...' : 'Gỡ bài vĩnh viễn'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

export default AdminMomentsPage;
