import React, { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import SystemCodeTable from './SystemCodeTable';
import './TestConnectionPage.css';

// ─── Connection status constants ──────────────────────────────────────────────
const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

const STATUS_CONFIG = {
  [STATUS.IDLE]: { icon: '⚪', label: 'Chưa kết nối', className: 'idle' },
  [STATUS.LOADING]: { icon: '🟡', label: 'Đang kết nối...', className: 'loading' },
  [STATUS.SUCCESS]: { icon: '🟢', label: 'Kết nối Backend & DB thành công!', className: 'success' },
  [STATUS.ERROR]: { icon: '🔴', label: 'Lỗi kết nối', className: 'error' },
};

/**
 * TestConnectionPage — verifies backend + Supabase DB connectivity.
 * Displays connection status and fetched system code data.
 */
const TestConnectionPage = () => {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [systemCodes, setSystemCodes] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const fetchSystemCodes = useCallback(async () => {
    setStatus(STATUS.LOADING);
    setSystemCodes([]);
    setErrorMessage('');

    try {
      const response = await fetch(API_ENDPOINTS.SYSTEM_CODES);
      const json = await response.json();

      if (!response.ok || json.status === 'error') {
        throw new Error(json.message || `HTTP ${response.status}`);
      }

      setSystemCodes(json.data || []);
      setLastFetchedAt(new Date().toLocaleTimeString('vi-VN'));
      setStatus(STATUS.SUCCESS);
    } catch (err) {
      setErrorMessage(err.message || 'Không thể kết nối đến server.');
      setStatus(STATUS.ERROR);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchSystemCodes();
  }, [fetchSystemCodes]);

  const currentStatus = STATUS_CONFIG[status];

  return (
    <div className="tcp-page">
      {/* Page Title */}
      <div className="tcp-page__header">
        <h1 className="tcp-page__title">Kiểm tra kết nối hệ thống</h1>
        <p className="tcp-page__subtitle">
          Kiểm tra kết nối từ Frontend → Backend (Express) → Database (Supabase PostgreSQL)
        </p>
      </div>

      {/* Connection Status Card */}
      <div className={`tcp-status-card tcp-status-card--${currentStatus.className}`}>
        <div className="tcp-status-card__left">
          <span className="tcp-status-card__icon" role="img" aria-label="status">
            {currentStatus.icon}
          </span>
          <div>
            <p className="tcp-status-card__label">Trạng thái máy chủ</p>
            <p className="tcp-status-card__text">{currentStatus.label}</p>
            {status === STATUS.ERROR && errorMessage && (
              <p className="tcp-status-card__error">{errorMessage}</p>
            )}
            {status === STATUS.SUCCESS && lastFetchedAt && (
              <p className="tcp-status-card__time">Cập nhật lúc {lastFetchedAt}</p>
            )}
          </div>
        </div>
        <button
          className="tcp-status-card__btn"
          onClick={fetchSystemCodes}
          disabled={status === STATUS.LOADING}
          aria-label="Thử lại kết nối"
        >
          {status === STATUS.LOADING ? (
            <span className="tcp-spinner" />
          ) : (
            '↻ Thử lại'
          )}
        </button>
      </div>

      {/* Data Table Section */}
      {(status === STATUS.SUCCESS || systemCodes.length > 0) && (
        <section className="tcp-section">
          <h2 className="tcp-section__title">
            Dữ liệu từ <code>m_system_code</code>
          </h2>
          <SystemCodeTable data={systemCodes} />
        </section>
      )}
    </div>
  );
};

export default TestConnectionPage;
