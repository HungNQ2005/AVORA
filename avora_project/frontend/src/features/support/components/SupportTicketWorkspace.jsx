import React from 'react';
import {
  AlertTriangleIcon,
  CalendarIcon,
  GridIcon,
  InboxIcon,
  MessageCircleIcon,
  SearchIcon,
  UserIcon,
} from '../../../common/components/icons';
import './supportTicketWorkspace.css';

const SupportTicketWorkspace = ({
  selectedTicketId,
  filters,
  setFilters,
  statusLabels,
  visibleCategories,
  categoryLabelByCode,
  formatDate,
  formatDateOnly,
  isAdmin,
  tickets,
  loading,
  pagination,
  loadTickets,
  selectTicket,
  detailLoading,
  ticket,
  conversation,
}) => (
  <div className={`support-center__layout ${selectedTicketId ? 'has-selection' : ''}`}>
    {/* Cột danh sách phiếu */}
    <section className="support-list" aria-label="Danh sách phiếu hỗ trợ">
      <div className="support-list__header">
        <div className="support-list__title-area">
          <h2>Yêu cầu hỗ trợ</h2>
          <span className="support-ticket-count">{pagination.total ?? tickets.length} phiếu</span>
        </div>
      </div>

      <div className="support-filters">
        <div className="support-filter-search">
          <SearchIcon size={18} />
          <input
            type="search"
            placeholder="Tìm theo tiêu đề phiếu..."
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          />
        </div>

        <div className="support-filter-grid">
          <label className="support-filter-field">
            <span>Trạng thái</span>
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">Tất cả trạng thái</option>
              {Object.entries(statusLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <label className="support-filter-field">
            <span>Danh mục</span>
            <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
              <option value="">Tất cả danh mục</option>
              {visibleCategories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}
            </select>
          </label>
        </div>

        <div className="support-filter-grid-single">
          <label className="support-date-filter">
            <span>Ngày tạo từ</span>
            <span className="support-date-filter__control">
              <input
                type="date"
                aria-label="Lọc từ ngày tạo"
                value={filters.from}
                onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
              />
              <span aria-hidden="true">{filters.from ? formatDateOnly(filters.from) : 'Tất cả các ngày'}</span>
              <CalendarIcon size={18} />
            </span>
          </label>
        </div>
      </div>

      {isAdmin && (
        <div className="support-admin-queues" aria-label="Phân loại hàng đợi quản trị">
          <button type="button" className={filters.assigned === 'mine' ? 'is-active' : ''} onClick={() => setFilters((current) => ({ ...current, assigned: 'mine' }))}>
            <UserIcon size={16} /> Của tôi
          </button>
          <button type="button" className={filters.assigned === 'unassigned' ? 'is-active' : ''} onClick={() => setFilters((current) => ({ ...current, assigned: 'unassigned' }))}>
            <InboxIcon size={16} /> Cần xử lý
          </button>
          <button type="button" className={filters.assigned === 'all' ? 'is-active' : ''} onClick={() => setFilters((current) => ({ ...current, assigned: 'all' }))}>
            <GridIcon size={16} /> Tất cả
          </button>
        </div>
      )}

      {loading ? (
        <div className="support-empty-state" role="status">
          <div className="support-spinner" />
          <span>Đang tải danh sách phiếu…</span>
        </div>
      ) : tickets.filter((item) => !item.is_deleted).length ? (
        <div className="support-list__items">
          {tickets.filter((item) => !item.is_deleted).map((item) => (
            <button
              type="button"
              key={item.ticket_id}
              className={`support-ticket-row ${item.ticket_id === selectedTicketId ? 'is-selected' : ''}`}
              onClick={() => selectTicket(item.ticket_id)}
            >
              <div className="support-ticket-row__top">
                <strong>{item.title}</strong>
                <span className={`support-status support-status--${item.ticket_status_cd}`}>
                  {statusLabels[item.ticket_status_cd] || item.ticket_status_cd}
                </span>
              </div>
              <div className="support-ticket-row__meta">
                <span className="support-category-badge">{categoryLabelByCode.get(item.ticket_type_cd) || item.category_label}</span>
                <span className="support-dot-separator">•</span>
                <span>{formatDate(item.updated_at)}</span>
              </div>
              <div className="support-ticket-row__bottom">
                <span className="support-requester">
                  {item.requester?.full_name || item.assigned_admin?.label || (item.hotel_id ? `Khách sạn ${item.hotel_id.slice(0, 8)}` : 'Phiếu hỗ trợ')}
                </span>
                {item.unread && <span className="support-unread" role="img" aria-label="Có cập nhật mới" title="Có cập nhật mới" />}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="support-empty">
          <p>Chưa có phiếu hỗ trợ phù hợp với bộ lọc.</p>
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div className="support-pagination">
          <button type="button" disabled={pagination.page <= 1} onClick={() => loadTickets(pagination.page - 1)}>Trang trước</button>
          <span>{pagination.page} / {pagination.total_pages}</span>
          <button type="button" disabled={pagination.page >= pagination.total_pages} onClick={() => loadTickets(pagination.page + 1)}>Trang sau</button>
        </div>
      )}
    </section>

    {/* Cột chi tiết trò chuyện */}
    <section className="support-conversation" aria-label="Chi tiết phiếu hỗ trợ">
      {!selectedTicketId ? (
        <div className="support-empty support-empty--detail">
          <div className="support-empty-icon-wrap"><MessageCircleIcon size={28} /></div>
          <strong>Chưa chọn phiếu hỗ trợ nào</strong>
          <p>Vui lòng chọn một phiếu từ danh sách bên trái để xem nội dung chi tiết và trao đổi.</p>
        </div>
      ) : detailLoading ? (
        <div className="support-empty support-empty--detail" role="status">
          <div className="support-spinner" />
          <p>Đang tải nội dung trao đổi…</p>
        </div>
      ) : !ticket ? (
        <div className="support-empty support-empty--detail" role="alert">
          <div className="support-empty-icon-wrap"><AlertTriangleIcon size={28} /></div>
          <strong>Không thể mở phiếu hỗ trợ</strong>
          <p>Phiếu này có thể đã bị xóa hoặc bạn không có quyền truy cập.</p>
        </div>
      ) : conversation}
    </section>
  </div>
);

export default SupportTicketWorkspace;