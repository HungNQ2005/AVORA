import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchMyBookings } from '../../../services/bookingApi';
import { getHotels } from '../../../services/hotelManagementService';
import {
  chatWithSupportAI,
  claimSupportTicket,
  createSupportTicket,
  deleteSupportAttachment,
  deleteSupportTicket,
  getSupportCategories,
  getSupportTicket,
  listSupportTickets,
  replyToSupportTicket,
  subscribeToSupportTicket,
  updateSupportTicketStatus,
} from '../../../services/supportApi';
import { CalendarIcon, ChevronDownIcon, CloseIcon, PlusIcon, TrashIcon, UploadIcon } from '../../../common/components/icons';
import SupportTicketConversation from '../components/SupportTicketConversation';
import SupportTicketWorkspace from '../components/SupportTicketWorkspace';
import './SupportCenter.css';

const STATUS_LABELS = {
  OPN: 'Mới',
  INP: 'Đang xử lý',
  WAT: 'Chờ phản hồi',
  RSV: 'Chờ xác nhận giải quyết',
  CLS: 'Đã đóng',
};
const MAX_FILES = 3;
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const LINK_PATTERN = /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?/i;

const countWords = (text) => (String(text).match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu) || []).length;
const splitIntoMessages = (text) => {
  const words = [...text.matchAll(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu)];
  if (words.length <= 500) return [text.trim()];
  const parts = [];
  for (let index = 0; index < words.length; index += 500) {
    const first = words[index].index;
    const last = words[Math.min(index + 499, words.length - 1)];
    parts.push(text.slice(first, last.index + last[0].length).trim());
  }
  return parts;
};
const getErrorMessage = (error, fallback) => error.response?.data?.message || error.message || fallback;
const formatDate = (value) => value ? new Date(value).toLocaleString('vi-VN') : '—';
const formatDateOnly = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN') : '';

const SupportCenter = ({ mode = 'customer' }) => {
  const isAdmin = mode === 'admin';
  const isVendor = mode === 'vendor';
  const supportGroup = isAdmin ? 'all' : isVendor ? 'vendor' : 'customer';
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [filters, setFilters] = useState({ q: '', status: '', category: '', assigned: 'all', from: '' });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const selectedTicketId = searchParams.get('ticketId');
  const { user } = useAuth();

  const categoryLabelByCode = useMemo(
    () => new Map(categories.map((category) => [category.code, category.label])),
    [categories],
  );

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await getSupportCategories(supportGroup));
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Không thể tải danh mục hỗ trợ.'));
    }
  }, [supportGroup]);

  const loadTickets = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await listSupportTickets({
        group: supportGroup,
        page,
        limit: 20,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
        ...(filters.from ? { from: filters.from } : {}),
        ...(isAdmin ? { assigned: filters.assigned } : {}),
      });
      setTickets((result.items || []).filter((item) => !item.is_deleted));
      setPagination(result.pagination || { page: 1, total_pages: 1, total: 0 });
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Không thể tải danh sách phiếu hỗ trợ.'));
    } finally {
      setLoading(false);
    }
  }, [filters, isAdmin, supportGroup]);

  const loadTicket = useCallback(async (ticketId, showSpinner = true) => {
    if (!ticketId) {
      setTicket(null);
      return;
    }
    if (showSpinner) setDetailLoading(true);
    try {
      const result = await getSupportTicket(ticketId, supportGroup);
      setTicket(result);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Không thể tải chi tiết phiếu hỗ trợ.'));
      setTicket(null);
    } finally {
      if (showSpinner) setDetailLoading(false);
    }
  }, [supportGroup]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadTickets(1);
  }, [loadTickets]);

  useEffect(() => {
    if (selectedTicketId) loadTicket(selectedTicketId);
    else setTicket(null);
  }, [loadTicket, selectedTicketId]);

  useEffect(() => {
    if (!selectedTicketId) return undefined;
    const controller = new AbortController();
    subscribeToSupportTicket(selectedTicketId, supportGroup, controller.signal, () => {
      loadTicket(selectedTicketId, false);
      loadTickets(pagination.page);
    }).catch((streamError) => {
      if (streamError.name !== 'AbortError') console.error('Support ticket event stream failed:', streamError);
    });
    return () => controller.abort();
  }, [loadTicket, loadTickets, pagination.page, selectedTicketId, supportGroup]);

  const selectTicket = (ticketId) => {
    setNotice('');
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (ticketId) next.set('ticketId', ticketId);
      else next.delete('ticketId');
      return next;
    });
  };

  const refreshSelected = async () => {
    await Promise.all([loadTickets(pagination.page), selectedTicketId ? loadTicket(selectedTicketId, false) : Promise.resolve()]);
  };

  const handleCreateTicket = async (data, files) => {
    try {
      const created = await createSupportTicket(data, files);
      setShowCreate(false);
      setNotice('Yêu cầu hỗ trợ đã được tạo thành công.');
      await loadTickets(1);
      selectTicket(created.ticket_id);
    } catch (submitError) {
      throw new Error(getErrorMessage(submitError, 'Không thể tạo phiếu hỗ trợ.'));
    }
  };

  const handleClaim = async () => {
    if (!ticket) return;
    setError('');
    try {
      await claimSupportTicket(ticket.ticket_id);
      await refreshSelected();
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'Không thể nhận xử lý phiếu này.'));
    }
  };

  const handleStatus = async (action, resolutionNote) => {
    if (!ticket) return;
    setError('');
    try {
      await updateSupportTicketStatus(ticket.ticket_id, { action, ...(resolutionNote ? { resolution_note: resolutionNote } : {}) });
      await refreshSelected();
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'Không thể cập nhật trạng thái phiếu.'));
    }
  };

  const handleReply = async ({ message, files, internal }) => {
    if (!ticket) return;
    const parts = splitIntoMessages(message);
    if (!message.trim() && !files.length) throw new Error('Vui lòng nhập tin nhắn hoặc chọn ảnh đính kèm.');
    if (LINK_PATTERN.test(message)) throw new Error('Tin nhắn không được chứa đường dẫn.');
    setError('');
    try {
      for (let index = 0; index < Math.max(parts.length, 1); index += 1) {
        await replyToSupportTicket(ticket.ticket_id, {
          message: parts[index] || '',
          is_internal_note: internal,
        }, index === 0 ? files : []);
      }
      await refreshSelected();
    } catch (replyError) {
      setError(getErrorMessage(replyError, 'Không thể gửi tin nhắn.'));
      throw replyError;
    }
  };

  const handleDeleteAttachment = async (attachment) => {
    if (!window.confirm(`Xóa ảnh "${attachment.name || 'đính kèm'}"?`)) return;
    try {
      await deleteSupportAttachment(ticket.ticket_id, attachment.key);
      await refreshSelected();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Không thể xóa ảnh đính kèm.'));
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticket) return;
    const isClosed = ticket.ticket_status_cd === 'CLS';
    const confirmation = isClosed
      ? 'Xóa phiếu đã đóng? Chỉ quản trị viên mới có thể thực hiện thao tác này.'
      : 'Xóa phiếu hỗ trợ này? Phiếu sẽ được lưu trong lịch sử kiểm toán nhưng không thể mở lại.';
    if (!window.confirm(confirmation)) return;
    try {
      await deleteSupportTicket(ticket.ticket_id);
      setNotice('Phiếu hỗ trợ đã được xóa.');
      selectTicket(null);
      await loadTickets(1);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Không thể xóa phiếu hỗ trợ.'));
    }
  };

  const heading = isAdmin ? 'Quản lý phiếu hỗ trợ' : isVendor ? 'Hỗ trợ nhà cung cấp' : 'Phiếu hỗ trợ';
  const visibleCategories = categories;

  return (
    <section className="support-center">
      <header className="support-center__header">
        <div>
          <p className="support-center__eyebrow">AVORA · HỖ TRỢ</p>
          <h1>{heading}</h1>
          <p>Theo dõi yêu cầu và trao đổi với đội ngũ hỗ trợ.</p>
        </div>
        {!isAdmin && (
          <button type="button" className="support-button support-button--primary" onClick={() => setShowCreate(true)}>
            <PlusIcon size={16} /> Tạo yêu cầu hỗ trợ
          </button>
        )}
      </header>

      {error && <div className="support-alert support-alert--error" role="alert">{error}</div>}
      {notice && <div className="support-alert support-alert--success" role="status">{notice}</div>}

      <SupportTicketWorkspace
        selectedTicketId={selectedTicketId}
        filters={filters}
        setFilters={setFilters}
        statusLabels={STATUS_LABELS}
        visibleCategories={visibleCategories}
        categoryLabelByCode={categoryLabelByCode}
        formatDate={formatDate}
        formatDateOnly={formatDateOnly}
        isAdmin={isAdmin}
        tickets={tickets}
        loading={loading}
        pagination={pagination}
        loadTickets={loadTickets}
        selectTicket={selectTicket}
        detailLoading={detailLoading}
        ticket={ticket}
        conversation={ticket && (
          <SupportTicketConversation
            ticket={ticket}
            mode={mode}
            viewerId={user?.user_id}
            isAssignedAdmin={isAdmin && String(ticket.assigned_to) === String(user?.user_id)}
            categoryLabel={categoryLabelByCode.get(ticket.ticket_type_cd) || ticket.category_label}
            statusLabels={STATUS_LABELS}
            formatDate={formatDate}
            onClaim={handleClaim}
            onStatus={handleStatus}
            onReply={handleReply}
            onDeleteAttachment={handleDeleteAttachment}
            onDeleteTicket={handleDeleteTicket}
            onAIChat={chatWithSupportAI}
          />
        )}
      />

      {showCreate && (
        <CreateTicketDialog
          mode={mode}
          categories={visibleCategories}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreateTicket}
        />
      )}
    </section>
  );
};

const CreateTicketDialog = ({ mode, categories, onClose, onSubmit }) => {
  const isVendor = mode === 'vendor';
  const [bookings, setBookings] = useState([]);
  const [bookingsVisible, setBookingsVisible] = useState(false);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [bookingsPage, setBookingsPage] = useState(0);
  const [bookingsTotalPages, setBookingsTotalPages] = useState(1);
  const [bookingsRetryPage, setBookingsRetryPage] = useState(1);
  const [hotels, setHotels] = useState([]);
  const [form, setForm] = useState({
    ticket_type_cd: '',
    title: '',
    description: '',
    priority_cd: 'MEDIUM',
    booking_ids: [],
    hotel_id: '',
    bank_account_number: '',
  });
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const filePreviewUrlsRef = useRef([]);
  const filePreviewCleanupTimerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const usableCategories = categories.filter((category) => category.group === mode || category.group === 'both');
  const selectedCategory = usableCategories.find((category) => category.code === form.ticket_type_cd);
  const isVendorCategory = selectedCategory?.group === 'vendor';
  const requiresBankAccountNumber = selectedCategory?.code === 'VBU';
  const canLinkBooking = mode === 'customer' && ['PWC', 'PWA', 'PTO', 'RFD', 'BKI'].includes(selectedCategory?.code);

  const loadBookings = async (page = 1) => {
    setBookingsLoading(true);
    setBookingsError('');
    try {
      const result = await fetchMyBookings({ page, limit: 10 });
      setBookings((current) => page === 1
        ? result?.bookings || []
        : [...current, ...(result?.bookings || [])]);
      setBookingsPage(page);
      setBookingsTotalPages(Number(result?.pagination?.total_pages || 1));
      setBookingsLoaded(true);
    } catch (bookingError) {
      console.error('Could not load bookings for support ticket:', bookingError);
      setBookingsRetryPage(page);
      setBookingsError(getErrorMessage(bookingError, 'Không thể tải danh sách đơn đặt phòng liên quan.'));
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (isVendor) {
      const loadHotels = async () => {
        try {
          const firstPage = await getHotels({ page: 1 });
          const allHotels = [...(firstPage?.items || firstPage?.hotels || [])];
          const totalPages = Number(firstPage?.pagination?.total_pages || 1);
          for (let page = 2; page <= totalPages; page += 1) {
            const result = await getHotels({ page });
            allHotels.push(...(result?.items || result?.hotels || []));
          }
          if (active) setHotels(allHotels);
        } catch (hotelError) {
          console.error('Could not load vendor hotels for support ticket:', hotelError);
          if (active) setError('Không thể tải danh sách khách sạn của bạn.');
        }
      };
      loadHotels();
    }
    return () => { active = false; };
  }, [isVendor]);

  useEffect(() => {
    if (!form.ticket_type_cd && usableCategories.length) {
      setForm((current) => ({ ...current, ticket_type_cd: usableCategories[0].code }));
    }
  }, [form.ticket_type_cd, usableCategories]);

  const updateFiles = (event) => {
    const nextFiles = [...event.target.files];
    event.target.value = '';
    if (nextFiles.length > MAX_FILES || nextFiles.reduce((sum, file) => sum + file.size, 0) > 6 * 1024 * 1024) {
      setError(`Tối đa ${MAX_FILES} ảnh, tổng dung lượng không quá 6 MB.`);
      return;
    }
    if (nextFiles.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_FILE_SIZE)) {
      setError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP tối đa 2 MB mỗi ảnh.');
      return;
    }
    setError('');
    filePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const previews = nextFiles.map((file) => ({ file, url: URL.createObjectURL(file) }));
    filePreviewUrlsRef.current = previews.map((preview) => preview.url);
    setFiles(nextFiles);
    setFilePreviews(previews);
  };

  useEffect(() => {
    window.clearTimeout(filePreviewCleanupTimerRef.current);
    return () => {
      filePreviewCleanupTimerRef.current = window.setTimeout(() => {
        filePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        filePreviewUrlsRef.current = [];
      }, 0);
    };
  }, []);

  const removeSelectedFile = (fileToRemove) => {
    const remaining = filePreviews.filter((preview) => preview.file !== fileToRemove);
    const remainingUrls = new Set(remaining.map((preview) => preview.url));
    filePreviewUrlsRef.current.forEach((url) => {
      if (!remainingUrls.has(url)) URL.revokeObjectURL(url);
    });
    filePreviewUrlsRef.current = remaining.map((preview) => preview.url);
    setFilePreviews(remaining);
    setFiles(remaining.map((preview) => preview.file));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const bankRequestWords = requiresBankAccountNumber
      ? countWords('Nội dung muốn thay đổi Số tài khoản ngân hàng muốn thay đổi') + countWords(form.bank_account_number)
      : 0;
    if (countWords(form.title) > 50 || countWords(form.description) + bankRequestWords > 500) {
      setError('Tiêu đề tối đa 50 từ, mô tả tối đa 500 từ.');
      return;
    }
    if (LINK_PATTERN.test(form.title) || LINK_PATTERN.test(form.description) || LINK_PATTERN.test(form.bank_account_number)) {
      setError('Tiêu đề và mô tả không được chứa đường dẫn.');
      return;
    }
    if (requiresBankAccountNumber && (!form.hotel_id || !form.bank_account_number.trim())) {
      setError('Vui lòng chọn khách sạn và nhập số tài khoản ngân hàng muốn thay đổi.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        support_group: mode,
        ticket_type_cd: form.ticket_type_cd,
        title: form.title.trim(),
        description: form.description.trim(),
        ...(canLinkBooking && form.booking_ids.length ? { booking_ids: form.booking_ids } : {}),
        ...(isVendorCategory && form.hotel_id ? { hotel_id: form.hotel_id } : {}),
        ...(requiresBankAccountNumber ? { bank_account_number: form.bank_account_number.trim() } : {}),
        ...(isVendorCategory ? { priority_cd: form.priority_cd } : {}),
      }, files);
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Không thể tạo phiếu hỗ trợ.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="support-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="support-dialog" role="dialog" aria-modal="true" aria-labelledby="support-create-title">
        <header>
          <div><p>TẠO YÊU CẦU</p><h2 id="support-create-title">Yêu cầu hỗ trợ mới</h2></div>
          <button type="button" onClick={onClose} aria-label="Đóng"><CloseIcon size={18} /></button>
        </header>
        {error && <div className="support-alert support-alert--error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <label>Danh mục
            <select required value={form.ticket_type_cd} onChange={(event) => setForm((current) => ({
              ...current,
              ticket_type_cd: event.target.value,
              booking_ids: [],
              hotel_id: '',
              bank_account_number: '',
            }))}>
              {usableCategories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}
            </select>
          </label>
          <label>Tiêu đề
            <input required maxLength={255} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Tóm tắt vấn đề" />
            <small>{countWords(form.title)} / 50 từ</small>
          </label>
          <label>{requiresBankAccountNumber ? 'Nội dung muốn thay đổi' : 'Mô tả'}
            <textarea required value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Mô tả chi tiết vấn đề..." />
            <small>{countWords(form.description)} / 500 từ</small>
          </label>
          {requiresBankAccountNumber && (
            <label>Số tài khoản ngân hàng muốn thay đổi
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                required
                maxLength={100}
                value={form.bank_account_number}
                onChange={(event) => setForm((current) => ({ ...current, bank_account_number: event.target.value }))}
                placeholder="Nhập số tài khoản mới"
              />
            </label>
          )}
          {canLinkBooking && (
            <section className="support-booking-picker" aria-label="Đơn đặt phòng liên quan">
              <div className="support-booking-picker__header">
                <span className="support-booking-picker__icon"><CalendarIcon size={19} /></span>
                <span className="support-booking-picker__heading">
                  <strong>Đơn đặt phòng liên quan</strong>
                  <small>Đính kèm một hoặc nhiều đơn để đội ngũ hỗ trợ xử lý nhanh hơn.</small>
                </span>
                {form.booking_ids.length > 0 && (
                  <span className="support-booking-picker__selected-count">
                    {form.booking_ids.length} đã chọn
                  </span>
                )}
              </div>
              <button
                type="button"
                className="support-button support-button--outline support-booking-picker__toggle"
                aria-controls="support-booking-picker-list"
                aria-expanded={bookingsVisible}
                onClick={() => {
                  const nextVisible = !bookingsVisible;
                  setBookingsVisible(nextVisible);
                  if (nextVisible && !bookingsLoaded && !bookingsLoading) loadBookings();
                }}
              >
                <span>{bookingsVisible ? 'Thu gọn danh sách' : 'Chọn đơn đặt phòng'}</span>
                <ChevronDownIcon className={`support-booking-picker__chevron ${bookingsVisible ? 'is-open' : ''}`} size={16} />
              </button>
              {bookingsVisible && (
                <div className="support-booking-picker__content" id="support-booking-picker-list">
                  <p className="support-booking-picker__hint">
                    Đơn đặt phòng gần đây của bạn
                  </p>
                  {bookingsLoading && <p className="support-booking-picker__message">Đang tải đơn đặt phòng...</p>}
                  {bookingsError && (
                    <div className="support-booking-picker__error" role="alert">
                      <span>{bookingsError}</span>
                      <button type="button" className="support-button support-button--outline" onClick={() => loadBookings(bookingsRetryPage)}>
                        Thử lại
                      </button>
                    </div>
                  )}
                  {bookingsLoaded && !bookings.length && !bookingsLoading && (
                    <p className="support-booking-picker__message">Bạn chưa có đơn đặt phòng nào.</p>
                  )}
                  {bookings.length > 0 && (
                    <div className="support-booking-picker__list">
                      {bookings.map((booking) => (
                        <label
                          key={booking.booking_id}
                          className={`support-booking-card ${form.booking_ids.includes(booking.booking_id) ? 'is-selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={form.booking_ids.includes(booking.booking_id)}
                            onChange={(event) => setForm((current) => ({
                              ...current,
                              booking_ids: event.target.checked
                                ? [...current.booking_ids, booking.booking_id]
                                : current.booking_ids.filter((bookingId) => bookingId !== booking.booking_id),
                            }))}
                          />
                          <span className="support-booking-card__image">
                            {booking.hotel?.thumbnail_url && (
                              <img
                                src={booking.hotel.thumbnail_url}
                                alt=""
                                onError={(event) => event.currentTarget.remove()}
                              />
                            )}
                            <span>AVORA</span>
                          </span>
                          <span className="support-booking-card__details">
                            <strong className="support-booking-card__hotel">{booking.hotel?.name || 'Khách sạn'}</strong>
                            <span className="support-booking-card__meta">
                              <span className="support-booking-card__code">Mã đơn · {booking.booking_code || booking.booking_id}</span>
                              <span className={`support-booking-card__status support-booking-card__status--${booking.status_badge_variant || 'default'}`}>
                                {booking.status_name || 'Chưa xác định trạng thái'}
                              </span>
                            </span>
                            <span className="support-booking-card__created">
                              Ngày đặt · {booking.booking_date_formatted || formatDateOnly(booking.created_at?.slice(0, 10))}
                            </span>
                            <span className="support-booking-card__dates">
                              <span><small>NHẬN PHÒNG</small><strong>{formatDateOnly(booking.stay?.check_in_date)}</strong></span>
                              <span><small>TRẢ PHÒNG</small><strong>{formatDateOnly(booking.stay?.check_out_date)}</strong></span>
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {bookingsLoaded && bookingsPage < bookingsTotalPages && !bookingsLoading && (
                    <button
                      type="button"
                      className="support-button support-button--outline support-booking-picker__more"
                      onClick={() => loadBookings(bookingsPage + 1)}
                    >
                      Tải thêm đơn đặt phòng
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
          {isVendorCategory && (
            <>
              <label>{requiresBankAccountNumber ? 'Khách sạn cần cập nhật (bắt buộc)' : 'Khách sạn liên quan (không bắt buộc)'}
                <select required={requiresBankAccountNumber} value={form.hotel_id} onChange={(event) => setForm((current) => ({ ...current, hotel_id: event.target.value }))}>
                  {!requiresBankAccountNumber && <option value="">Không liên kết</option>}
                  {hotels.map((hotel) => <option key={hotel.hotel_id} value={hotel.hotel_id}>{hotel.name}</option>)}
                </select>
                {requiresBankAccountNumber && !hotels.length && <small>Bạn chưa có khách sạn đủ điều kiện để gửi yêu cầu.</small>}
              </label>
              <label>Mức độ ưu tiên
                <select value={form.priority_cd} onChange={(event) => setForm((current) => ({ ...current, priority_cd: event.target.value }))}>
                  <option value="LOW">Thấp</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="URGENT">Khẩn cấp</option>
                </select>
              </label>
            </>
          )}
          <section className="support-upload-panel" aria-label="Ảnh đính kèm">
            <div className="support-upload-panel__heading">
              <span className="support-upload-panel__icon"><UploadIcon size={18} /></span>
              <span>
                <strong>Ảnh đính kèm</strong>
                <small>Thêm ảnh để đội ngũ hỗ trợ hiểu rõ vấn đề của bạn.</small>
              </span>
              <span className="support-upload-panel__count">{files.length}/{MAX_FILES}</span>
            </div>
            <label className="support-upload-dropzone" htmlFor="support-ticket-image-upload">
              <span className="support-upload-dropzone__symbol"><PlusIcon size={19} /></span>
              <span className="support-upload-dropzone__copy">
                <strong>Chọn ảnh từ thiết bị</strong>
                <small>JPEG, PNG hoặc WEBP · tối đa 2 MB mỗi ảnh</small>
              </span>
              <input
                id="support-ticket-image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={updateFiles}
              />
            </label>
            {filePreviews.length > 0 && (
              <div className="support-upload-previews" aria-label="Ảnh đã chọn">
                {filePreviews.map(({ file, url }, index) => (
                  <figure className="support-upload-preview" key={`${file.name}-${file.lastModified}-${file.size}-${index}`}>
                    <img src={url} alt={file.name} />
                    <button
                      type="button"
                      className="support-upload-preview__remove"
                      onClick={() => removeSelectedFile(file)}
                      aria-label={`Xóa ảnh ${file.name}`}
                      title="Xóa ảnh"
                    >
                      <TrashIcon size={14} />
                    </button>
                    <figcaption>
                      <strong title={file.name}>{file.name}</strong>
                      <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
          <footer><button type="button" className="support-button support-button--outline" onClick={onClose}>Hủy</button><button type="submit" className="support-button support-button--primary" disabled={loading || !usableCategories.length || (requiresBankAccountNumber && !hotels.length)}>{loading ? 'Đang gửi…' : 'Gửi yêu cầu'}</button></footer>
        </form>
      </section>
    </div>
  );
};

export default SupportCenter;
export { CreateTicketDialog };
