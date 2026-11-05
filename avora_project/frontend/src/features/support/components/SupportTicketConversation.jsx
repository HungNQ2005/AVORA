import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AttachmentImage from './AttachmentImage';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  HandIcon,
  LightbulbIcon,
  LockIcon,
  PaperclipIcon,
  SparklesIcon,
  TrashIcon,
  UserIcon,
} from '../../../common/components/icons';
import './supportTicketConversation.css';

const MAX_FILES = 3;
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const LINK_PATTERN = /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?/i;

const countWords = (text) => (String(text).match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu) || []).length;
const getErrorMessage = (error, fallback) => error.response?.data?.message || error.message || fallback;

const RequesterAccountDetails = ({ requester }) => {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const name = requester.full_name || requester.email || 'Người dùng';
  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <details className="support-requester-details">
      <summary title="Xem thông tin chi tiết người gửi">
        <span className="support-requester-details__avatar">
          {requester.avatar_url && !avatarFailed
            ? <img src={requester.avatar_url} alt={name} onError={() => setAvatarFailed(true)} />
            : initial}
        </span>
        <span className="support-requester-details__info">
          <strong>{name}</strong>
          <small>{requester.email}</small>
        </span>
        <svg className="support-chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      {requester.email && (
        <div className="support-requester-details__popover">
          <Link to={`/dashboard/users?search=${encodeURIComponent(requester.email)}`}>
            <span><UserIcon size={16} /> Xem thông tin tài khoản</span>
          </Link>
        </div>
      )}
    </details>
  );
};

const SupportTicketConversation = ({
  ticket,
  mode,
  viewerId,
  isAssignedAdmin,
  categoryLabel,
  statusLabels,
  formatDate,
  onClaim,
  onStatus,
  onReply,
  onDeleteAttachment,
  onDeleteTicket,
  onAIChat,
}) => {
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
    <div className="support-conversation-wrapper">
      <header className="support-conversation__header">
        <div className="support-conversation__main-info">
          <div className="support-conversation__title-row">
            <h2>{ticket.title}</h2>
            <span className={`support-status support-status--${ticket.ticket_status_cd}`}>
              {statusLabels[ticket.ticket_status_cd] || ticket.ticket_status_cd}
            </span>
          </div>
          <p className="support-conversation__submeta">
            <span className="support-category-pill">{categoryLabel}</span>
            <span className="support-meta-dot">•</span>
            <span>Tạo lúc {formatDate(ticket.created_at)}</span>
            {ticket.hotel_name && (
              <>
                <span className="support-meta-dot">•</span>
                <span>Khách sạn: <strong>{ticket.hotel_name}</strong></span>
              </>
            )}
            {ticket.assigned_admin && (
              <>
                <span className="support-meta-dot">•</span>
                <span className="support-assigned-admin">Phụ trách: <strong>{ticket.assigned_admin.label}</strong></span>
              </>
            )}
          </p>
        </div>
        {isAdmin && ticket.requester && <RequesterAccountDetails requester={ticket.requester} />}
      </header>

      <div className="support-conversation__messages">
        {/* Tin nhắn khởi tạo (Description) */}
        <article className={`support-message support-message--description ${String(ticket.requester_id) === String(viewerId) ? 'support-message--own' : 'support-message--other'}`}>
          <div className="support-message__header">
            <div className="support-message__author">
              <strong>{ticket.requester?.full_name || (isAdmin ? 'Người gửi phiếu' : 'Bạn')}</strong>
              <span className="support-role-badge">Yêu cầu ban đầu</span>
            </div>
            <time>{formatDate(ticket.created_at)}</time>
          </div>
          <div className="support-message__body">
            <p>{ticket.description}</p>
          </div>
          {!!ticket.bookings?.length && (
            <div className="support-linked-bookings">
              <strong>Đơn đặt phòng liên quan</strong>
              <ul>
                {ticket.bookings.map((booking) => (
                  <li key={booking.booking_id}>
                    <span>{booking.booking_code || booking.booking_id}</span>
                    {booking.hotel_name && <small>{booking.hotel_name}</small>}
                  </li>
                ))}
              </ul>
            </div>
          )}
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

        {/* Đề xuất giải quyết nếu có */}
        {ticket.resolution_note && (
          <div className="support-resolution">
            <div className="support-resolution__header">
              <span className="support-resolution__icon"><LightbulbIcon size={18} /></span>
              <strong>Đề xuất giải quyết từ quản trị viên</strong>
            </div>
            <p>{ticket.resolution_note}</p>
          </div>
        )}

        {/* Danh sách phản hồi */}
        {(ticket.replies || []).map((reply) => {
          const isOwn = String(reply.sender_id) === String(viewerId);
          return (
            <article
              key={reply.reply_id}
              className={`support-message ${isOwn ? 'support-message--own' : 'support-message--other'} ${reply.is_internal_note ? 'support-message--internal' : ''}`}
            >
              <div className="support-message__header">
                <div className="support-message__author">
                  <strong>{reply.sender_name || (reply.sender_role === 'ADM' ? 'Đội ngũ hỗ trợ' : 'Người gửi')}</strong>
                  {reply.is_internal_note && <span className="support-internal-badge">Ghi chú nội bộ</span>}
                </div>
                <time>{formatDate(reply.created_at)}</time>
              </div>
              {reply.message && (
                <div className="support-message__body">
                  <p>{reply.message}</p>
                </div>
              )}
              {!!reply.attachment_urls?.length && (
                <div className="support-attachments">
                  {reply.attachment_urls.map((attachment) => (
                    <AttachmentImage
                      key={attachment.key}
                      attachment={attachment}
                      onDelete={!isClosed && isOwn ? onDeleteAttachment : undefined}
                    />
                  ))}
                </div>
              )}
            </article>
          );
        })}

        {/* Khung Trợ lý AI */}
        {aiOpen && (
          <section className="support-ai">
            <div className="support-ai__header">
              <div className="support-ai__title">
                <span className="support-ai__icon"><SparklesIcon size={18} /></span>
                <strong>Trợ lý AI AVORA</strong>
              </div>
              <button type="button" className="support-ai__close" onClick={() => setAiOpen(false)}>Đóng</button>
            </div>
            <div className="support-ai__messages">
              {aiHistory.length ? (
                aiHistory.map((message, index) => (
                  <div key={`${index}-${message.role}`} className={`support-ai__message support-ai__message--${message.role}`}>
                    <p>{message.content}</p>
                  </div>
                ))
              ) : (
                <div className="support-ai__placeholder">
                  <p>Mô tả vấn đề hoặc đặt câu hỏi để trợ lý AI tư vấn cách xử lý nhanh nhất.</p>
                </div>
              )}
            </div>
            <form className="support-ai__form" onSubmit={askAI}>
              <input
                value={aiMessage}
                onChange={(event) => setAiMessage(event.target.value)}
                maxLength={2000}
                placeholder="Hỏi trợ lý AI điều gì đó..."
              />
              <button type="submit" disabled={aiLoading || !aiMessage.trim()}>
                {aiLoading ? 'Đang hỏi…' : 'Gửi'}
              </button>
            </form>
          </section>
        )}
      </div>

      {statusError && <div className="support-alert support-alert--error" role="alert">{statusError}</div>}

      {/* Khung hành động & Form trả lời */}
      <footer className="support-conversation__actions">
        <div className="support-toolbar">
          {isAdmin && ticket.ticket_status_cd === 'OPN' && !ticket.assigned_to && (
            <button type="button" className="support-button support-button--claim" onClick={onClaim}>
              <HandIcon size={16} /> Nhận xử lý phiếu
            </button>
          )}

          {isAssignedAdmin && ticket.ticket_status_cd !== 'CLS' && (
            <div className="support-status-actions">
              {!ticket.resolved_at && (
                <div className="support-resolution-box">
                  <textarea
                    value={resolutionNote}
                    onChange={(event) => setResolutionNote(event.target.value)}
                    maxLength={5000}
                    placeholder="Ghi nội dung/giải pháp đề xuất giải quyết..."
                  />
                  <button
                    type="button"
                    className="support-button support-button--resolution"
                    disabled={!resolutionNote.trim()}
                    onClick={() => runStatusAction('request_resolution')}
                  >
                    <LightbulbIcon size={16} /> Đề xuất giải quyết
                  </button>
                </div>
              )}
              {ticket.ticket_status_cd === 'RSV' && ticket.resolved_at && (
                <button type="button" className="support-button support-button--success" onClick={() => runStatusAction('close')}>
                  <CheckCircleIcon size={16} /> Đóng phiếu
                </button>
              )}
            </div>
          )}

          {!isAdmin && ticket.ticket_status_cd === 'RSV' && !ticket.resolved_at && (
            <div className="support-user-confirm-actions">
              <button type="button" className="support-button support-button--outline" onClick={() => runStatusAction('reject_resolution')}>
                <AlertTriangleIcon size={16} /> Chưa được giải quyết
              </button>
              <button type="button" className="support-button support-button--success" onClick={() => runStatusAction('confirm_resolution')}>
                <CheckCircleIcon size={16} /> Xác nhận giải quyết
              </button>
            </div>
          )}

          {!isAdmin && !isClosed && ticket.ticket_status_cd === 'OPN' && (
            <button
              type="button"
              className={`support-button support-button--ai ${aiOpen ? 'is-active' : ''}`}
              onClick={() => setAiOpen((open) => !open)}
            >
              <SparklesIcon size={16} /> {aiOpen ? 'Đóng Trợ lý AI' : 'Hỏi Trợ lý AI'}
            </button>
          )}

          {(ticket.ticket_status_cd === 'CLS' ? isAdmin && isAssignedAdmin : !isAdmin || isAssignedAdmin) && (
            <button type="button" className="support-button support-button--danger" onClick={onDeleteTicket}>
              <TrashIcon size={16} /> Xóa phiếu
            </button>
          )}
        </div>

        {/* Khung soạn thảo phản hồi */}
        {!isClosed && (!isAdmin || ticket.assigned_to) && <ReplyComposer isAdmin={isAdmin} onSubmit={onReply} />}
        {!isClosed && isAdmin && !ticket.assigned_to && (
          <div className="support-closed-note-box">
            <p className="support-closed-note"><AlertTriangleIcon size={16} /> Bạn cần bấm <strong>"Nhận xử lý phiếu"</strong> ở trên trước khi có thể gửi phản hồi.</p>
          </div>
        )}
        {isClosed && (
          <div className="support-closed-note-box">
            <p className="support-closed-note"><LockIcon size={16} /> Phiếu đã đóng. Không thể gửi thêm phản hồi.</p>
          </div>
        )}
      </footer>
    </div>
  );
};

const ReplyComposer = ({ isAdmin, onSubmit }) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [internal, setInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateFiles = (event) => {
    const nextFiles = Array.from(event.target.files);
    if (nextFiles.length > MAX_FILES) {
      setError(`Mỗi lần chỉ được gửi tối đa ${MAX_FILES} ảnh.`);
      return;
    }
    if (nextFiles.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_FILE_SIZE)) {
      setError('Chấp nhận ảnh JPEG, PNG hoặc WEBP, tối đa 2MB mỗi ảnh.');
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
      setError('Tin nhắn không được chứa đường dẫn URL.');
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
    <form className={`support-reply-form ${internal ? 'is-internal' : ''}`} onSubmit={submit}>
      {error && <div className="support-reply-form__error" role="alert">{error}</div>}

      {isAdmin && (
        <div className="support-reply-form__top-bar">
          <label className="support-reply-form__internal">
            <input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />
            <span><LockIcon size={16} /> Ghi chú nội bộ <small>(chỉ Quản trị viên mới xem được)</small></span>
          </label>
        </div>
      )}

      <div className="support-reply-form__input-wrap">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={internal ? 'Nhập ghi chú nội bộ bảo mật...' : 'Nhập nội dung phản hồi...'}
          maxLength={100000}
        />
      </div>

      <div className="support-reply-form__footer">
        <div className="support-reply-form__tools">
          <label className="support-upload-btn">
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={updateFiles} />
            <PaperclipIcon size={16} />
            <span>Đính kèm ảnh</span>
          </label>
          {files.length > 0 && <span className="support-file-badge">{files.length} ảnh được chọn</span>}
        </div>

        <div className="support-reply-form__submit-area">
          <span className="support-word-count">{countWords(message)} từ</span>
          <button type="submit" className="support-send-btn" disabled={submitting}>
            {submitting ? 'Đang gửi…' : 'Gửi phản hồi'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default SupportTicketConversation;