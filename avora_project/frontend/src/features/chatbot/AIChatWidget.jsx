import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const HOTEL_PATH_RE = /^\/(?:hotels?|hotel-detail)\/([0-9a-f-]{36})/i;

const GREETING = {
    role: 'assistant',
    local: true,
    content:
        'Xin chào! Tôi là Trợ lý AI hỗ trợ của sàn AVORA. Tôi có thể giúp bạn tìm khách sạn, gợi ý địa điểm du lịch và giải đáp các thắc mắc về đặt phòng.',
};

const QUICK_PROMPTS = [
    'Khách sạn nào gần tôi?',
    'Gợi ý địa điểm du lịch quanh đây',
    'Có mã giảm giá nào không?',
    'Đơn đặt phòng gần đây của tôi',
];

const LOCATION_LABEL = {
    idle: 'Luôn sẵn sàng hỗ trợ',
    asking: '📍 Đang xin quyền vị trí…',
    granted: '📍 Đã nhận vị trí của bạn',
    denied: '📍 Chưa có vị trí (bạn đã từ chối)',
    unavailable: '📍 Trình duyệt không hỗ trợ định vị',
};

/** Chuẩn hóa markdown: bảng → danh sách, bỏ tiêu đề, gạch đầu dòng → •. */
const normalizeText = (text) =>
    String(text || '')
        .split('\n')
        .map((line) => {
            const t = line.trim();
            if (/^\|?[\s:|-]+\|?$/.test(t) && t.includes('-') && t.includes('|')) return null; // dòng kẻ bảng
            if (t.startsWith('|')) {
                const cells = t.split('|').map((c) => c.trim()).filter(Boolean);
                return cells.length > 1 ? `• ${cells[0]}: ${cells.slice(1).join(' – ')}` : `• ${cells[0] || ''}`;
            }
            return line.replace(/^\s*#{1,6}\s+/, '').replace(/^\s*[-*]\s+/, '• ');
        })
        .filter((l) => l !== null)
        .join('\n');

/** Render [text](/path) thành <Link>, **text** thành chữ đậm. */
const renderContent = (rawText) => {
    const text = normalizeText(rawText);
    const parts = [];
    const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
    let last = 0;
    let m;
    let i = 0;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) parts.push(text.slice(last, m.index));
        if (m[1]) {
            let href = m[2].trim();
            if (href.startsWith(window.location.origin)) href = href.slice(window.location.origin.length) || '/';
            else if (/^https?:\/\/localhost(:\d+)?\//.test(href)) href = href.replace(/^https?:\/\/localhost(:\d+)?/, '');
            parts.push(
                href.startsWith('/') ? (
                    <Link key={i} to={href} className="avora-chat__link">{m[1]}</Link>
                ) : (
                    <a key={i} href={href} target="_blank" rel="noreferrer" className="avora-chat__link">{m[1]}</a>
                )
            );
        } else {
            parts.push(<strong key={i}>{m[3]}</strong>);
        }
        i += 1;
        last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
};

const AIChatWidget = () => {
    const { user, token } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([GREETING]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [geoStatus, setGeoStatus] = useState('idle');
    const askedGeoRef = useRef(false);
    const endRef = useRef(null);

    const isLoggedIn = Boolean(user && token);
    const currentHotelId =
        (location.pathname.match(HOTEL_PATH_RE) || [])[1] ||
        new URLSearchParams(location.search).get('hotelId') ||
        '';

    // Lần đầu mở chat: xin quyền vị trí của trình duyệt
    const requestLocation = useCallback((force = false) => {
        if (askedGeoRef.current && !force) return;
        askedGeoRef.current = true;
        if (!navigator.geolocation) {
            setGeoStatus('unavailable');
            return;
        }
        setGeoStatus('asking');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGeoStatus('granted');
            },
            () => {
                setUserLocation(null);
                setGeoStatus('denied');
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
    }, []);

    useEffect(() => {
        if (open) requestLocation();
    }, [open, requestLocation]);

    // Đăng xuất → xóa hội thoại, quay về lời chào
    useEffect(() => {
        if (!isLoggedIn) setMessages([GREETING]);
    }, [isLoggedIn]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading, open]);

    const sendMessage = async (preset) => {
        const text = (typeof preset === 'string' ? preset : input).trim();
        if (!text || loading || !isLoggedIn) return;

        const history = messages.filter((m) => !m.local).map(({ role, content }) => ({ role, content }));

        setMessages((prev) => [...prev, { role: 'user', content: text }]);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post(
                `${API_BASE}/api/chat`,
                {
                    message: text,
                    history,
                    context: {
                        userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null,
                        currentPage: location.pathname,
                        currentHotelId,
                    },
                },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
            );
            const reply = res.data?.data?.reply || 'Xin lỗi, tôi chưa thể trả lời lúc này.';
            setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        } catch (err) {
            const msg =
                err.response?.status === 401
                    ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
                    : err.code === 'ECONNABORTED'
                      ? 'Trợ lý AI phản hồi quá lâu, bạn vui lòng thử lại nhé.'
                      : err.response?.data?.message || 'Trợ lý AI đang gặp sự cố, vui lòng thử lại sau.';
            setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
        } finally {
            setLoading(false);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const goToSignIn = () => {
        setOpen(false);
        navigate('/signin');
    };

    return (
        <>
            <style>{`
        .avora-chat__fab{position:fixed;right:24px;bottom:24px;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;z-index:1000;
          background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;font-size:26px;box-shadow:0 8px 24px rgba(99,102,241,.45);transition:transform .2s}
        .avora-chat__fab:hover{transform:scale(1.08)}
        .avora-chat__panel{position:fixed;right:24px;bottom:96px;width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 130px);
          background:#fff;border-radius:18px;box-shadow:0 20px 50px rgba(15,23,42,.25);display:flex;flex-direction:column;overflow:hidden;z-index:1000;
          animation:avoraChatIn .22s ease-out;font-family:inherit}
        @keyframes avoraChatIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
        .avora-chat__header{padding:14px 16px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;display:flex;justify-content:space-between;align-items:center}
        .avora-chat__header h3{margin:0;font-size:15px;font-weight:700}
        .avora-chat__header small{opacity:.9;font-size:11px}
        .avora-chat__close{background:none;border:none;color:#fff;font-size:20px;cursor:pointer}
        .avora-chat__geo{background:none;border:none;color:#fff;font-size:11px;cursor:pointer;padding:0;text-decoration:underline;opacity:.95}
        .avora-chat__body{flex:1;overflow-y:auto;padding:14px;background:#f8fafc;display:flex;flex-direction:column;gap:10px}
        .avora-chat__msg{max-width:86%;padding:9px 13px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
        .avora-chat__msg--user{align-self:flex-end;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;border-bottom-right-radius:4px}
        .avora-chat__msg--assistant{align-self:flex-start;background:#fff;color:#1e293b;border:1px solid #e2e8f0;border-bottom-left-radius:4px}
        .avora-chat__link{color:#4f46e5;font-weight:600;text-decoration:underline}
        .avora-chat__typing{align-self:flex-start;color:#64748b;font-size:13px;font-style:italic}
        .avora-chat__chips{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start}
        .avora-chat__chip{border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:16px;padding:6px 11px;font-size:12px;cursor:pointer}
        .avora-chat__chip:hover{background:#e0e7ff}
        .avora-chat__footer{display:flex;gap:8px;padding:10px;border-top:1px solid #e2e8f0;background:#fff}
        .avora-chat__input{flex:1;border:1px solid #cbd5e1;border-radius:20px;padding:9px 14px;font-size:14px;outline:none}
        .avora-chat__input:focus{border-color:#6366f1}
        .avora-chat__send{border:none;border-radius:50%;width:40px;height:40px;background:#6366f1;color:#fff;cursor:pointer;font-size:16px}
        .avora-chat__send:disabled{opacity:.5;cursor:not-allowed}
        .avora-chat__login{padding:12px;border-top:1px solid #e2e8f0;background:#fff;display:flex;justify-content:center}
        .avora-chat__login button{border:none;border-radius:24px;padding:11px 20px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;font-weight:600;cursor:pointer}
      `}</style>

            {open && (
                <div className="avora-chat__panel" role="dialog" aria-label="Trợ lý AI AVORA" id="avora-ai-chat-panel">
                    <div className="avora-chat__header">
                        <div>
                            <h3>Trợ lý AI AVORA</h3>
                            {geoStatus === 'denied' ? (
                                <small>
                                    <button type="button" className="avora-chat__geo" onClick={() => requestLocation(true)}>
                                        {LOCATION_LABEL[geoStatus]} – bấm để cấp quyền lại
                                    </button>
                                </small>
                            ) : (
                                <small>{LOCATION_LABEL[geoStatus]}</small>
                            )}
                        </div>
                        <button type="button" className="avora-chat__close" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
                    </div>

                    <div className="avora-chat__body">
                        {messages.map((m, idx) => (
                            <div key={idx} className={`avora-chat__msg avora-chat__msg--${m.role}`}>
                                {renderContent(m.content)}
                            </div>
                        ))}

                        {isLoggedIn && messages.length === 1 && (
                            <div className="avora-chat__chips">
                                {QUICK_PROMPTS.map((q) => (
                                    <button key={q} type="button" className="avora-chat__chip" onClick={() => sendMessage(q)}>
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        {loading && <div className="avora-chat__typing">Trợ lý đang soạn câu trả lời…</div>}
                        <div ref={endRef} />
                    </div>

                    {isLoggedIn ? (
                        <div className="avora-chat__footer">
                            <input
                                id="avora-ai-chat-input"
                                className="avora-chat__input"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder="Nhập câu hỏi của bạn…"
                                disabled={loading}
                                maxLength={1000}
                            />
                            <button
                                type="button"
                                id="avora-ai-chat-send"
                                className="avora-chat__send"
                                onClick={() => sendMessage()}
                                disabled={loading || !input.trim()}
                                aria-label="Gửi"
                            >
                                ➤
                            </button>
                        </div>
                    ) : (
                        <div className="avora-chat__login">
                            <button type="button" id="avora-ai-chat-login" onClick={goToSignIn}>
                                Yêu cầu đăng nhập để sử dụng Trợ lý AI
                            </button>
                        </div>
                    )}
                </div>
            )}

            <button
                type="button"
                id="avora-ai-chat-fab"
                className="avora-chat__fab"
                onClick={() => setOpen((v) => !v)}
                aria-label="Mở Trợ lý AI AVORA"
            >
                {open ? '✕' : '💬'}
            </button>
        </>
    );
};

export default AIChatWidget;
