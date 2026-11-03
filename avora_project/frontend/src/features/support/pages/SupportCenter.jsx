import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchMyBookings } from '../../../services/bookingApi';
import { getHotels } from '../../../services/hotelManagementService';
import {
  chatWithSupportAI,
  claimSupportTicket,
  createSupportCategory,
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
import AttachmentImage from '../components/AttachmentImage';
import SupportTicketWorkspace from '../components/SupportTicketWorkspace';
import './supportCenter.css';

const STATUS_LABELS = {
  OPN: 'Mới',
  INP: 'Đang xử lý',
  WAT: 'Chờ phản hồi',
  RSV: 'Chờ xác nhận giải quyết',
  CLS: 'Đã đóng',
  DELETED: 'Đã xóa',
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

const RequesterAccountDetails = ({ requester }) => {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const name = requester.full_name || requester.email || 'Người dùng';
  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <details className="support-requester-details">
      <summary>
        <span className="support-requester-details__avatar">
          {requester.avatar_url && !avatarFailed
            ? <img src={requester.avatar_url} alt="" onError={() => setAvatarFailed(true)} />
            : initial}
        </span>
        <span><strong>{name}</strong><small>{requester.email}</small></span>
      </summary>
      {requester.email && (
        <Link to={`/dashboard/users?search=${encodeURIComponent(requester.email)}`}>
          Xem thông tin tài khoản
        </Link>
      )}
    </details>
  );
};

const SupportCenter = ({ mode = 'customer' }) => {
  const isAdmin = mode === 'admin';
  const isVendor = mode === 'vendor';
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
  const [newCategory, setNewCategory] = useState({ group: 'customer', category_code: '' });
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState('');
  const selectedTicketId = searchParams.get('ticketId');
  const { user } = useAuth();

  const categoryLabelByCode = useMemo(
    () => new Map(categories.map((category) => [category.code, category.label])),
    [categories],
  );

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await getSupportCategories());
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Không thể tải danh mục hỗ trợ.'));
    }
  }, []);

  const loadTickets = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await listSupportTickets({
        group: isAdmin || isVendor ? 'all' : 'customer',
        page,
        limit: 20,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
        ...(filters.from ? { from: filters.from } : {}),
        ...(isAdmin ? { assigned: filters.assigned } : {}),
      });
      setTickets(result.items || []);
      setPagination(result.pagination || { page: 1, total_pages: 1, total: 0 });
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Không thể tải danh sách phiếu hỗ trợ.'));
    } finally {
      setLoading(false);
    }
  }, [filters, isAdmin, isVendor]);

  const loadTicket = useCallback(async (ticketId, showSpinner = true) => {
    if (!ticketId) {
      setTicket(null);
      return;
    }
    if (showSpinner) setDetailLoading(true);
    try {
      const result = await getSupportTicket(ticketId);
      setTicket(result);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Không thể tải chi tiết phiếu hỗ trợ.'));
      setTicket(null);
    } finally {
      if (showSpinner) setDetailLoading(false);
    }
  }, []);

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
    subscribeToSupportTicket(selectedTicketId, controller.signal, () => {
      loadTicket(selectedTicketId, false);
      loadTickets(pagination.page);
    }).catch((streamError) => {
      if (streamError.name !== 'AbortError') console.error('Support ticket event stream failed:', streamError);
    });
    return () => controller.abort();
  }, [loadTicket, loadTickets, pagination.page, selectedTicketId]);

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
      setNotice('Phiếu hỗ trợ đã được tạo thành công.');
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

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    setCategoryLoading(true);
    setCategoryMessage('');
    try {
      await createSupportCategory({
        ...newCategory,
        category_code: newCategory.category_code.trim().toUpperCase(),
      });
      setNewCategory((current) => ({ ...current, category_code: '' }));
      setCategoryMessage('Đã thêm danh mục hỗ trợ.');
      await loadCategories();
    } catch (createError) {
      setCategoryMessage(getErrorMessage(createError, 'Không thể thêm danh mục hỗ trợ.'));
    } finally {
      setCategoryLoading(false);
    }
  };

  const heading = isAdmin ? 'Quản lý phiếu hỗ trợ' : isVendor ? 'Hỗ trợ nhà cung cấp' : 'Tickets & Hỗ trợ';
  const visibleCategories = categories.filter((category) => isAdmin
    || isVendor
    || category.group === mode
    || category.group === 'both');

  return (
    <section className="support-center">
      <header className="support-center__header">
        <div>
          <p className="support-center__eyebrow">AVORA · HỖ TRỢ</p>
          <h1>{heading}</h1>
          <p>Theo dõi trao đổi và phản hồi trên từng phiếu hỗ trợ.</p>
        </div>
        {!isAdmin && (
          <button type="button" className="support-button support-button--primary" onClick={() => setShowCreate(true)}>
            + Tạo phiếu hỗ trợ
          </button>
        )}
      </header>

      {error && <div className="support-alert support-alert--error" role="alert">{error}</div>}
      {notice && <div className="support-alert support-alert--success" role="status">{notice}</div>}

      {isAdmin && (
        <form className="support-category-form" onSubmit={handleCreateCategory}>
          <strong>Danh mục hỗ trợ</strong>
          <select value={newCategory.group} onChange={(event) => setNewCategory((current) => ({ ...current, group: event.target.value }))}>
            <option value="customer">Khách hàng</option>
            <option value="vendor">Nhà cung cấp</option>
          </select>
          <input
            value={newCategory.category_code}
            onChange={(event) => setNewCategory((current) => ({ ...current, category_code: event.target.value }))}
            placeholder="Mã danh mục, ví dụ ACCOUNT"
            pattern="[A-Za-z][A-Za-z0-9_]*"
            maxLength={50}
            required
          />
          <button type="submit" disabled={categoryLoading}>{categoryLoading ? 'Đang thêm…' : 'Thêm danh mục'}</button>
          {categoryMessage && <span role="status">{categoryMessage}</span>}
        </form>
      )}

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
          <TicketConversation
            ticket={ticket}
            mode={mode}
            viewerId={user?.user_id}
            isAssignedAdmin={isAdmin && String(ticket.assigned_to) === String(user?.user_id)}
            categoryLabel={categoryLabelByCode.get(ticket.ticket_type_cd) || ticket.category_label}
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

const TicketConversation = ({ ticket, mode, viewerId, isAssignedAdmin, categoryLabel, onClaim, onStatus, onReply, onDeleteAttachment, onDeleteTicket, onAIChat }) => {
  const isAdmin = mode === 'admin';
  const isClosed = ticket.ticket_status_cd === 'CLS';
  const [resolutionNote, setResolutionNote] = useState('');
  const [statusError, setStatusError] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiHistory, setAiHistory] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const runStatusAction = async (action) => {
    setStatusError('');
    try {
      await onStatus(action, resolutionNote);
      setResolutionNote('');
    } catch (error) {
      setStatusError(getErrorMessage(error, 'Không thể cập nhật trạng thái.'));
    }
  };

  const askAI = async (event) => {
    event.preventDefault();
    if (!aiMessage.trim() || aiLoading) return;
    const message = aiMessage.trim();
    const history = aiHistory.map(({ role, content }) => ({ role, content }));
    setAiHistory((current) => [...current, { role: 'user', content: message }]);
    setAiMessage('');
    setAiLoading(true);
    try {
      const result = await onAIChat(ticket.ticket_id, { message, history });
      setAiHistory((current) => [...current, { role: 'assistant', content: result.reply || 'Xin lỗi, tôi chưa có câu trả lời.' }]);
    } catch (error) {
      setAiHistory((current) => [...current, { role: 'assistant', content: getErrorMessage(error, 'Trợ lý AI tạm thời không khả dụng.') }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <header className="support-conversation__header">
        <div>
          <div className="support-conversation__title-row">
            <h2>{ticket.title}</h2>
            <span className={`support-status support-status--${ticket.ticket_status_cd}`}>{STATUS_LABELS[ticket.ticket_status_cd] || ticket.ticket_status_cd}</span>
          </div>
          <p>{categoryLabel} · Tạo lúc {formatDate(ticket.created_at)}{ticket.assigned_admin ? ` · ${ticket.assigned_admin.label}` : ''}</p>
        </div>
        {isAdmin && ticket.requester && <RequesterAccountDetails requester={ticket.requester} />}
      </header>

      <div className="support-conversation__messages">
        <article className={`support-message support-message--description ${String(ticket.requester_id) === String(viewerId) ? 'support-message--own' : 'support-message--other'}`}>
          <div className="support-message__byline"><strong>{ticket.requester?.full_name || (isAdmin ? 'Người gửi phiếu' : 'Bạn')}</strong><time>{formatDate(ticket.created_at)}</time></div>
          <p>{ticket.description}</p>
          {!!ticket.attachment_urls?.length && (
            <div className="support-attachments">
              {ticket.attachment_urls.map((attachment) => (
                <AttachmentImage
                  key={attachment.key}
                  attachment={attachment}
                  onDelete={!isClosed && !isAdmin ? onDeleteAttachment : undefined}
                />
              ))}
            </div>
          )}
        </article>
        {ticket.resolution_note && (
          <div className="support-resolution">
            <strong>Đề xuất giải quyết</strong>
            <p>{ticket.resolution_note}</p>
          </div>
        )}
        {(ticket.replies || []).map((reply) => (
          <article
            key={reply.reply_id}
            className={`support-message ${String(reply.sender_id) === String(viewerId) ? 'support-message--own' : 'support-message--other'} ${reply.is_internal_note ? 'support-message--internal' : ''}`}
          >
            <div className="support-message__byline">
              <strong>{reply.sender_name || (reply.sender_role === 'ADM' ? 'Đội ngũ hỗ trợ' : 'Người gửi')}</strong>
              <time>{formatDate(reply.created_at)}</time>
              {reply.is_internal_note && <span>Ghi chú nội bộ</span>}
            </div>
            {reply.message && <p>{reply.message}</p>}
            {!!reply.attachment_urls?.length && (
              <div className="support-attachments">
                {reply.attachment_urls.map((attachment) => (
                  <AttachmentImage
                    key={attachment.key}
                    attachment={attachment}
                    onDelete={!isClosed && String(reply.sender_id) === String(viewerId) ? onDeleteAttachment : undefined}
                  />
                ))}
              </div>
            )}
          </article>
        ))}
        {aiOpen && (
          <section className="support-ai">
            <div className="support-ai__header"><strong>Trợ lý AVORA</strong><button type="button" onClick={() => setAiOpen(false)}>Đóng</button></div>
            <div className="support-ai__messages">
              {aiHistory.length ? aiHistory.map((message, index) => <p key={`${index}-${message.role}`} className={`support-ai__message support-ai__message--${message.role}`}>{message.content}</p>) : <p>Mô tả vấn đề hoặc hỏi cách xử lý trước khi tiếp tục.</p>}
            </div>
            <form onSubmit={askAI}>
              <input value={aiMessage} onChange={(event) => setAiMessage(event.target.value)} maxLength={2000} placeholder="Nhập câu hỏi..." />
              <button type="submit" disabled={aiLoading || !aiMessage.trim()}>{aiLoading ? '…' : 'Gửi'}</button>
            </form>
          </section>
        )}
      </div>

      {statusError && <div className="support-alert support-alert--error" role="alert">{statusError}</div>}
      <footer className="support-conversation__actions">
        {isAdmin && ticket.ticket_status_cd === 'OPN' && !ticket.assigned_to && (
          <button type="button" className="support-button support-button--outline" onClick={onClaim}>Nhận xử lý</button>
        )}
        {isAssignedAdmin && ticket.ticket_status_cd !== 'CLS' && (
          <div className="support-status-actions">
            {!ticket.resolved_at && (
              <>
                <textarea value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} maxLength={5000} placeholder="Ghi nội dung đề xuất giải quyết..." />
                <button type="button" className="support-button support-button--outline" disabled={!resolutionNote.trim()} onClick={() => runStatusAction('request_resolution')}>Đề xuất giải quyết</button>
              </>
            )}
            {ticket.ticket_status_cd === 'RSV' && ticket.resolved_at && <button type="button" className="support-button support-button--primary" onClick={() => runStatusAction('close')}>Đóng phiếu</button>}
          </div>
        )}
        {!isAdmin && ticket.ticket_status_cd === 'RSV' && !ticket.resolved_at && (
          <>
            <button type="button" className="support-button support-button--outline" onClick={() => runStatusAction('reject_resolution')}>Chưa được giải quyết</button>
            <button type="button" className="support-button support-button--primary" onClick={() => runStatusAction('confirm_resolution')}>Xác nhận giải quyết</button>
          </>
        )}
        {!isAdmin && !isClosed && ticket.ticket_status_cd === 'OPN' && (
          <button type="button" className="support-button support-button--outline" onClick={() => setAiOpen((open) => !open)}>Hỏi trợ lý AI</button>
        )}
        {(ticket.ticket_status_cd === 'CLS' ? isAdmin && isAssignedAdmin : !isAdmin || isAssignedAdmin) && (
          <button type="button" className="support-button support-button--danger" onClick={onDeleteTicket}>Xóa phiếu</button>
        )}
        {!isClosed && (!isAdmin || ticket.assigned_to) && <ReplyComposer isAdmin={isAdmin} onSubmit={onReply} />}
        {!isClosed && isAdmin && !ticket.assigned_to && <p className="support-closed-note">Nhận xử lý phiếu trước khi trả lời.</p>}
        {isClosed && <p className="support-closed-note">Phiếu đã đóng. Không thể gửi thêm tin nhắn.</p>}
      </footer>
    </>
  );
};

const ReplyComposer = ({ isAdmin, onSubmit }) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [internal, setInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateFiles = (event) => {
    const nextFiles = [...event.target.files];
    if (nextFiles.length > MAX_FILES) {
      setError(`Mỗi lần chỉ được gửi tối đa ${MAX_FILES} ảnh.`);
      return;
    }
    if (nextFiles.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_FILE_SIZE)) {
      setError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP tối đa 2 MB mỗi ảnh.');
      return;
    }
    setError('');
    setFiles(nextFiles);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!message.trim() && !files.length) {
      setError('Vui lòng nhập tin nhắn hoặc chọn ảnh đính kèm.');
      return;
    }
    if (LINK_PATTERN.test(message)) {
      setError('Tin nhắn không được chứa đường dẫn.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ message, files, internal });
      setMessage('');
      setFiles([]);
      setInternal(false);
      event.target.reset();
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Không thể gửi tin nhắn.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="support-reply-form" onSubmit={submit}>
      {error && <span className="support-reply-form__error" role="alert">{error}</span>}
      {isAdmin && (
        <label className="support-reply-form__internal">
          <input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />
          Ghi chú nội bộ (chỉ quản trị viên thấy)
        </label>
      )}
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={internal ? 'Nhập ghi chú nội bộ...' : 'Nhập phản hồi...'} maxLength={100000} />
      <div className="support-reply-form__footer">
        <label className="support-upload">
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={updateFiles} />
          Đính kèm ảnh
        </label>
        <span>{files.length ? `${files.length} ảnh đã chọn` : `${countWords(message)} từ`}</span>
        <button type="submit" disabled={submitting}>{submitting ? 'Đang gửi…' : 'Gửi'}</button>
      </div>
    </form>
  );
};

const CreateTicketDialog = ({ mode, categories, onClose, onSubmit }) => {
  const isVendor = mode === 'vendor';
  const [bookings, setBookings] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [form, setForm] = useState({ ticket_type_cd: '', title: '', description: '', priority_cd: 'MEDIUM', booking_id: '', hotel_id: '' });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const usableCategories = categories.filter((category) => isVendor
    || category.group === mode
    || category.group === 'both');
  const selectedCategory = usableCategories.find((category) => category.code === form.ticket_type_cd);
  const isVendorCategory = isVendor && selectedCategory?.group === 'vendor';
  const canLinkBooking = !isVendorCategory;

  useEffect(() => {
    let active = true;
    if (mode === 'customer' || isVendor) {
      const loadBookings = async () => {
        try {
          const firstPage = await fetchMyBookings({ page: 1, limit: 50 });
          const allBookings = [...(firstPage?.bookings || firstPage?.items || [])];
          const totalPages = Number(firstPage?.pagination?.total_pages || 1);
          for (let page = 2; page <= totalPages; page += 1) {
            const result = await fetchMyBookings({ page, limit: 50 });
            allBookings.push(...(result?.bookings || result?.items || []));
          }
          if (active) setBookings(allBookings);
        } catch (bookingError) {
          console.error('Could not load bookings for support ticket:', bookingError);
          if (active) setError('Không thể tải danh sách đơn đặt phòng liên quan.');
        }
      };
      loadBookings();
    }
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
  }, [isVendor, mode]);

  useEffect(() => {
    if (!form.ticket_type_cd && usableCategories.length) {
      setForm((current) => ({ ...current, ticket_type_cd: usableCategories[0].code }));
    }
  }, [form.ticket_type_cd, usableCategories]);

  const updateFiles = (event) => {
    const nextFiles = [...event.target.files];
    if (nextFiles.length > MAX_FILES || nextFiles.reduce((sum, file) => sum + file.size, 0) > 6 * 1024 * 1024) {
      setError(`Tối đa ${MAX_FILES} ảnh, tổng dung lượng không quá 6 MB.`);
      return;
    }
    if (nextFiles.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_FILE_SIZE)) {
      setError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP tối đa 2 MB mỗi ảnh.');
      return;
    }
    setError('');
    setFiles(nextFiles);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (countWords(form.title) > 50 || countWords(form.description) > 500) {
      setError('Tiêu đề tối đa 50 từ, mô tả tối đa 500 từ.');
      return;
    }
    if (LINK_PATTERN.test(form.title) || LINK_PATTERN.test(form.description)) {
      setError('Tiêu đề và mô tả không được chứa đường dẫn.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        ticket_type_cd: form.ticket_type_cd,
        title: form.title.trim(),
        description: form.description.trim(),
        ...(canLinkBooking && form.booking_id ? { booking_id: form.booking_id } : {}),
        ...(isVendorCategory && form.hotel_id ? { hotel_id: form.hotel_id } : {}),
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
        <header><div><p>TẠO YÊU CẦU</p><h2 id="support-create-title">Phiếu hỗ trợ mới</h2></div><button type="button" onClick={onClose} aria-label="Đóng">×</button></header>
        {error && <div className="support-alert support-alert--error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <label>Danh mục
            <select required value={form.ticket_type_cd} onChange={(event) => setForm((current) => ({ ...current, ticket_type_cd: event.target.value }))}>
              {usableCategories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}
            </select>
          </label>
          <label>Tiêu đề
            <input required maxLength={255} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Tóm tắt vấn đề" />
            <small>{countWords(form.title)} / 50 từ</small>
          </label>
          <label>Mô tả
            <textarea required value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Mô tả chi tiết vấn đề..." />
            <small>{countWords(form.description)} / 500 từ</small>
          </label>
          {canLinkBooking && (
            <label>Đơn đặt phòng liên quan (không bắt buộc)
              <select value={form.booking_id} onChange={(event) => setForm((current) => ({ ...current, booking_id: event.target.value }))}>
                <option value="">Không liên kết</option>
                {bookings.map((booking) => <option key={booking.booking_id} value={booking.booking_id}>{booking.booking_code || booking.booking_id} · {booking.hotel_name || 'Khách sạn'}</option>)}
              </select>
            </label>
          )}
          {isVendorCategory && (
            <>
              <label>Khách sạn liên quan (không bắt buộc)
                <select value={form.hotel_id} onChange={(event) => setForm((current) => ({ ...current, hotel_id: event.target.value }))}>
                  <option value="">Không liên kết</option>
                  {hotels.map((hotel) => <option key={hotel.hotel_id} value={hotel.hotel_id}>{hotel.name}</option>)}
                </select>
              </label>
              <label>Mức độ ưu tiên
                <select value={form.priority_cd} onChange={(event) => setForm((current) => ({ ...current, priority_cd: event.target.value }))}>
                  <option value="LOW">Thấp</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="URGENT">Khẩn cấp</option>
                </select>
              </label>
            </>
          )}
          <label className="support-upload">Ảnh đính kèm (tối đa 3 ảnh, mỗi ảnh 2 MB)
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={updateFiles} />
          </label>
          <footer><button type="button" className="support-button support-button--outline" onClick={onClose}>Hủy</button><button type="submit" className="support-button support-button--primary" disabled={loading || !usableCategories.length}>{loading ? 'Đang gửi…' : 'Gửi phiếu'}</button></footer>
        </form>
      </section>
    </div>
  );
};

export default SupportCenter;
export { CreateTicketDialog };
