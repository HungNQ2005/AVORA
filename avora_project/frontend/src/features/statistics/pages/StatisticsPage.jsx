import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchStatisticsHotels, fetchStatisticsOverview } from '../../../services/statisticsApi';
import { exportStatisticsToExcel, getStatisticsExcelFilename } from '../../../utils/exportStatisticsToExcel';
import StatsChart, { CHART_COLORS } from '../components/StatsChart';
import StatisticsExportModal from '../components/StatisticsExportModal';
import {
  addDays,
  buildTimeSeries,
  formatCurrency,
  formatDisplayDate,
  formatNumber,
  getMonthRange,
  getYearRange,
  getStatusLabel,
  toDateKey,
  validateRange,
} from '../statisticsHelpers';
import './StatisticsPage.css';

const DATASETS = [
  { value: 'STATUS', label: 'Đơn theo trạng thái' },
  { value: 'ROOM', label: 'Phòng theo loại phòng' },
  { value: 'TIME', label: 'Doanh thu theo thời gian' },
];

const PRESETS = [
  { label: '7 ngày', days: 7 },
  { label: '30 ngày', days: 30 },
  { label: '90 ngày', days: 90 },
];

const defaultRange = (days = 30) => {
  const today = new Date();
  return { from: toDateKey(addDays(today, -(days - 1))), to: toDateKey(today) };
};

const StatisticsPage = () => {
  const { user, loading: authLoading } = useAuth();

  const roleCode = String(user?.role_code_name || '').trim().toUpperCase();
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  const canAccess = roleCode === 'VEN' || roleCd === '4' || roleCode === 'ADM' || roleCd === '1';

  // Guard: Chỉ tài khoản Vendor (VEN) hoặc Quản trị viên (ADM) mới có quyền truy cập Bảng thống kê
  if (!authLoading && user && !canAccess) {
    return <Navigate to="/forbidden" replace />;
  }

  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonthStr = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }, [today]);

  const prevMonthStr = useMemo(() => {
    const d = new Date(today);
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [today]);

  const initialMonthRange = useMemo(() => {
    const [y, m] = currentMonthStr.split('-').map(Number);
    return getMonthRange(y, m);
  }, [currentMonthStr]);

  // Kỳ thống kê: 'MONTH' (mặc định theo tháng), 'YEAR' (theo năm), 'CUSTOM' (tùy chỉnh khoảng ngày)
  const [periodMode, setPeriodMode] = useState('MONTH');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [hotels, setHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(true);
  const [hotelsError, setHotelsError] = useState('');
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [isHotelOpen, setIsHotelOpen] = useState(false);
  const hotelRef = useRef(null);

  const [from, setFrom] = useState(initialMonthRange.from);
  const [to, setTo] = useState(initialMonthRange.to);
  const rangeError = validateRange(from, to);

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [chartType, setChartType] = useState('bar');
  const [dataset, setDataset] = useState('STATUS');

  const [exporting, setExporting] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 3500);
  }, []);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // Close hotel dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (hotelRef.current && !hotelRef.current.contains(e.target)) setIsHotelOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load hotels
  const loadHotels = useCallback(async () => {
    setHotelsLoading(true);
    setHotelsError('');
    try {
      const list = await fetchStatisticsHotels();
      setHotels(list);
      setSelectedHotelId((current) => (list.some((h) => h.hotel_id === current) ? current : (list[0]?.hotel_id || '')));
    } catch (err) {
      setHotelsError(err.message || 'Không thể tải danh sách khách sạn.');
    } finally {
      setHotelsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHotels();
  }, [loadHotels]);

  // Load statistics whenever hotel / range / periodMode changes (stale requests are aborted)
  useEffect(() => {
    if (!selectedHotelId || rangeError) return undefined;

    const controller = new AbortController();
    setLoading(true);
    setError('');

    const periodTypeParam = periodMode.toLowerCase();

    fetchStatisticsOverview(
      { hotelId: selectedHotelId, from, to, periodType: periodTypeParam },
      controller.signal
    )
      .then((data) => {
        setOverview(data);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setOverview(null);
        setError(err.message || 'Không thể tải dữ liệu thống kê.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedHotelId, from, to, periodMode, rangeError, reloadKey]);

  const selectedHotel = hotels.find((h) => h.hotel_id === selectedHotelId) || null;

  const chartData = useMemo(() => {
    if (!overview) return { items: [], format: formatNumber, unit: 'đơn' };
    if (dataset === 'ROOM') {
      return {
        items: overview.by_room_type.map((r) => ({ label: r.name, value: r.quantity })),
        format: formatNumber,
        unit: 'phòng',
      };
    }
    if (dataset === 'TIME') {
      return {
        items: buildTimeSeries(overview.by_day, overview.range.days, overview.range.from, overview.range.to).map((r) => ({ label: r.label, value: r.revenue })),
        format: formatCurrency,
        unit: 'đ',
      };
    }
    return {
      items: overview.by_status.map((r) => ({ label: getStatusLabel(r.code), value: r.count })),
      format: formatNumber,
      unit: 'đơn',
    };
  }, [overview, dataset]);

  // Chuyển đổi chế độ kỳ (Tháng / Năm / Tùy chỉnh)
  const handlePeriodModeChange = (mode) => {
    setPeriodMode(mode);
    if (mode === 'MONTH') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const r = getMonthRange(y, m);
      setFrom(r.from);
      setTo(r.to);
    } else if (mode === 'YEAR') {
      const r = getYearRange(selectedYear);
      setFrom(r.from);
      setTo(r.to);
    } else {
      const r = defaultRange(30);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  const handleMonthChange = (newMonth) => {
    if (!newMonth) return;
    setSelectedMonth(newMonth);
    const [y, m] = newMonth.split('-').map(Number);
    const r = getMonthRange(y, m);
    setFrom(r.from);
    setTo(r.to);
  };

  const selectCurrentMonth = () => {
    handleMonthChange(currentMonthStr);
  };

  const selectPreviousMonth = () => {
    handleMonthChange(prevMonthStr);
  };

  const handleYearChange = (newYear) => {
    const y = Number(newYear);
    setSelectedYear(y);
    const r = getYearRange(y);
    setFrom(r.from);
    setTo(r.to);
  };

  const selectCurrentYear = () => {
    handleYearChange(currentYear);
  };

  const selectPreviousYear = () => {
    handleYearChange(currentYear - 1);
  };

  const yearOptions = useMemo(() => {
    const list = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const applyPreset = (days) => {
    const range = defaultRange(days);
    setFrom(range.from);
    setTo(range.to);
  };

  const isPresetActive = (days) => {
    const pRange = defaultRange(days);
    return from === pRange.from && to === pRange.to;
  };

  const handleExport = async () => {
    if (!overview || exporting) return;
    setExporting(true);
    const result = await exportStatisticsToExcel(overview);
    setExporting(false);
    if (result.success) setIsExportOpen(false);
    showToast(result.success ? `Đã xuất file ${result.filename}` : result.message);
  };

  const summary = overview?.summary;
  const rating = overview?.rating;
  const comparison = overview?.comparison;

  // Nhãn so sánh động theo kỳ chọn: tháng -> "so với tháng trước", năm -> "so với năm trước"
  const comparisonLabel = overview?.comparison_label || (
    periodMode === 'MONTH'
      ? 'so với tháng trước'
      : periodMode === 'YEAR'
      ? 'so với năm trước'
      : 'so với kỳ trước'
  );

  return (
    <div className="st-page">
      {toastMessage && <div className="st-toast">{toastMessage}</div>}

      {/* Breadcrumb */}
      <nav className="st-page__breadcrumb">
        <span>Báo cáo doanh thu</span>
        <span className="st-page__breadcrumb-sep">&gt;</span>
        <span className="st-page__breadcrumb-active">Bảng thống kê</span>
      </nav>

      {/* Top row: hotel name + rating inline (left) · Excel button + hotel dropdown (right) */}
      <div className="st-top">
        <div className="st-top__left">
          <div className="st-title-area">
            <div className="st-title-row">
              <h1 className="st-page__title">{overview?.hotel?.name || selectedHotel?.name || 'Bảng thống kê'}</h1>
              {rating && rating.average !== null && rating.average !== undefined && (
                <div className="st-rating-pill" aria-label="Điểm đánh giá khách sạn">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#c9a227" stroke="#c9a227" strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <span className="st-rating-pill__score">
                    {rating.average.toFixed(1)}
                  </span>
                  <span className="st-rating-pill__count">
                    ({rating.count > 0 ? `${formatNumber(rating.count)} đánh giá` : 'Chưa có đánh giá'})
                  </span>
                </div>
              )}
            </div>
            {(overview?.hotel?.address || selectedHotel?.address) && (
              <p className="st-page__subtitle">{overview?.hotel?.address || selectedHotel?.address}</p>
            )}
          </div>
        </div>

        <div className="st-top__right">
          {/* Nút Xuất Excel (Đồng bộ với Danh mục Tiện nghi) */}
          <button
            type="button"
            className="st-btn-excel"
            onClick={() => setIsExportOpen(true)}
            disabled={!overview || loading || exporting}
            title="Xuất báo cáo thống kê khách sạn ra tệp Excel"
          >
            {exporting ? (
              <>
                <svg className="avora-btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                <span>Đang xuất...</span>
              </>
            ) : (
              <>
                <svg className="amenity-excel-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Xuất Excel</span>
              </>
            )}
          </button>

          {/* Bộ chọn khách sạn trực thuộc */}
          <div className="st-hotel-selector" ref={hotelRef}>
            <div className="st-hotel-selector__icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
              </svg>
            </div>
            <div className="st-hotel-selector__content">
              <span className="st-hotel-selector__label">KHÁCH SẠN</span>
              <button
                type="button"
                className={`st-hotel-selector__btn ${isHotelOpen ? 'st-hotel-selector__btn--open' : ''}`}
                onClick={() => setIsHotelOpen((prev) => !prev)}
                disabled={hotelsLoading || hotels.length === 0}
                aria-haspopup="listbox"
                aria-expanded={isHotelOpen}
              >
                <span className="st-hotel-selector__value">
                  {hotelsLoading ? 'Đang tải...' : selectedHotel?.name || 'Không có khách sạn'}
                </span>
                <svg
                  className={`st-chevron ${isHotelOpen ? 'st-chevron--up' : ''}`}
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            {isHotelOpen && (
              <div className="st-hotel-menu" role="listbox">
                {hotels.map((h) => (
                  <button
                    key={h.hotel_id}
                    type="button"
                    className={`st-hotel-menu__item ${selectedHotelId === h.hotel_id ? 'st-hotel-menu__item--active' : ''}`}
                    onClick={() => { setSelectedHotelId(h.hotel_id); setIsHotelOpen(false); }}
                    role="option"
                    aria-selected={selectedHotelId === h.hotel_id}
                  >
                    <span>{h.name}</span>
                    {selectedHotelId === h.hotel_id && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {hotelsError && (
        <div className="st-alert st-alert--error">
          <span>{hotelsError}</span>
          <button type="button" className="st-alert__retry-btn" onClick={loadHotels}>Thử lại</button>
        </div>
      )}

      {!hotelsLoading && !hotelsError && hotels.length === 0 && (
        <div className="st-empty">Chưa có khách sạn nào đang hoạt động để thống kê.</div>
      )}

      {/* Date & Period Selection Card */}
      <section className="st-card st-period-section">
        <div className="st-period-section__header">
          <div className="st-period-toggle" role="group" aria-label="Chọn kỳ thống kê">
            <button
              type="button"
              className={`st-period-toggle__btn ${periodMode === 'MONTH' ? 'st-period-toggle__btn--active' : ''}`}
              onClick={() => handlePeriodModeChange('MONTH')}
            >
              Theo Tháng
            </button>
            <button
              type="button"
              className={`st-period-toggle__btn ${periodMode === 'YEAR' ? 'st-period-toggle__btn--active' : ''}`}
              onClick={() => handlePeriodModeChange('YEAR')}
            >
              Theo Năm
            </button>
            <button
              type="button"
              className={`st-period-toggle__btn ${periodMode === 'CUSTOM' ? 'st-period-toggle__btn--active' : ''}`}
              onClick={() => handlePeriodModeChange('CUSTOM')}
            >
              Tùy chỉnh ngày
            </button>
          </div>

          <div className="st-period-info">
            <span className="st-period-info__range">
              {formatDisplayDate(from)} &ndash; {formatDisplayDate(to)}
            </span>
            {overview?.previous_period && (
              <span className="st-period-info__compare">
                ({comparisonLabel}: {overview.previous_period.label || `${formatDisplayDate(overview.previous_period.from)} - ${formatDisplayDate(overview.previous_period.to)}`})
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Controls based on periodMode */}
        {periodMode === 'MONTH' && (
          <div className="st-range">
            <div className="st-range__fields">
              <label className="st-field">
                <span className="st-field__label">CHỌN THÁNG</span>
                <input
                  type="month"
                  className="st-field__input st-field__input--month"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                />
              </label>
            </div>
            <div className="st-range__presets">
              <span className="st-range__presets-label">CHỌN NHANH:</span>
              <button
                type="button"
                className={`st-pill ${selectedMonth === currentMonthStr ? 'st-pill--active' : ''}`}
                onClick={selectCurrentMonth}
              >
                Tháng này
              </button>
              <button
                type="button"
                className={`st-pill ${selectedMonth === prevMonthStr ? 'st-pill--active' : ''}`}
                onClick={selectPreviousMonth}
              >
                Tháng trước
              </button>
            </div>
            {rangeError && <p className="st-range__error" role="alert">{rangeError}</p>}
          </div>
        )}

        {periodMode === 'YEAR' && (
          <div className="st-range">
            <div className="st-range__fields">
              <label className="st-field">
                <span className="st-field__label">CHỌN NĂM</span>
                <select
                  className="st-field__input st-field__select"
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="st-range__presets">
              <span className="st-range__presets-label">CHỌN NHANH:</span>
              <button
                type="button"
                className={`st-pill ${selectedYear === currentYear ? 'st-pill--active' : ''}`}
                onClick={selectCurrentYear}
              >
                Năm nay
              </button>
              <button
                type="button"
                className={`st-pill ${selectedYear === currentYear - 1 ? 'st-pill--active' : ''}`}
                onClick={selectPreviousYear}
              >
                Năm trước
              </button>
            </div>
            {rangeError && <p className="st-range__error" role="alert">{rangeError}</p>}
          </div>
        )}

        {periodMode === 'CUSTOM' && (
          <div className="st-range">
            <div className="st-range__fields">
              <label className="st-field">
                <span className="st-field__label">Từ ngày</span>
                <input
                  type="date"
                  className="st-field__input"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="st-field">
                <span className="st-field__label">Đến ngày</span>
                <input
                  type="date"
                  className="st-field__input"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </div>
            <div className="st-range__presets">
              <span className="st-range__presets-label">CHỌN NHANH:</span>
              {PRESETS.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  className={`st-pill ${isPresetActive(p.days) ? 'st-pill--active' : ''}`}
                  onClick={() => applyPreset(p.days)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {rangeError && <p className="st-range__error" role="alert">{rangeError}</p>}
          </div>
        )}
      </section>

      {/* Summary cards with comparison to previous period */}
      <section className="st-summary" aria-busy={loading}>
        <div className="st-stat">
          <span className="st-stat__label">TỔNG ĐƠN ĐẶT PHÒNG</span>
          <span className="st-stat__value">{summary ? formatNumber(summary.total_bookings) : '—'}</span>
          {comparison?.total_bookings && (
            <div className={`st-stat__comparison ${comparison.total_bookings.change_pct > 0 ? 'st-stat__comparison--up' : comparison.total_bookings.change_pct < 0 ? 'st-stat__comparison--down' : 'st-stat__comparison--neutral'}`}>
              <span className="st-stat__arrow">{comparison.total_bookings.change_pct > 0 ? '▲' : comparison.total_bookings.change_pct < 0 ? '▼' : '■'}</span>
              <span className="st-stat__pct">{comparison.total_bookings.change_pct > 0 ? `+${comparison.total_bookings.change_pct}%` : `${comparison.total_bookings.change_pct}%`}</span>
              <span className="st-stat__prev-label">{comparisonLabel}</span>
            </div>
          )}
        </div>
        <div className="st-stat">
          <span className="st-stat__label">DOANH THU</span>
          <span className="st-stat__value st-stat__value--blue">{summary ? formatCurrency(summary.revenue) : '—'}</span>
          {comparison?.revenue && (
            <div className={`st-stat__comparison ${comparison.revenue.change_pct > 0 ? 'st-stat__comparison--up' : comparison.revenue.change_pct < 0 ? 'st-stat__comparison--down' : 'st-stat__comparison--neutral'}`}>
              <span className="st-stat__arrow">{comparison.revenue.change_pct > 0 ? '▲' : comparison.revenue.change_pct < 0 ? '▼' : '■'}</span>
              <span className="st-stat__pct">{comparison.revenue.change_pct > 0 ? `+${comparison.revenue.change_pct}%` : `${comparison.revenue.change_pct}%`}</span>
              <span className="st-stat__prev-label">{comparisonLabel}</span>
            </div>
          )}
        </div>
        <div className="st-stat">
          <span className="st-stat__label">SỐ PHÒNG ĐÃ ĐẶT</span>
          <span className="st-stat__value">{summary ? formatNumber(summary.rooms_booked) : '—'}</span>
          {comparison?.rooms_booked && (
            <div className={`st-stat__comparison ${comparison.rooms_booked.change_pct > 0 ? 'st-stat__comparison--up' : comparison.rooms_booked.change_pct < 0 ? 'st-stat__comparison--down' : 'st-stat__comparison--neutral'}`}>
              <span className="st-stat__arrow">{comparison.rooms_booked.change_pct > 0 ? '▲' : comparison.rooms_booked.change_pct < 0 ? '▼' : '■'}</span>
              <span className="st-stat__pct">{comparison.rooms_booked.change_pct > 0 ? `+${comparison.rooms_booked.change_pct}%` : `${comparison.rooms_booked.change_pct}%`}</span>
              <span className="st-stat__prev-label">{comparisonLabel}</span>
            </div>
          )}
        </div>
        <div className="st-stat">
          <span className="st-stat__label">ĐƠN ĐÃ HỦY</span>
          <span className="st-stat__value st-stat__value--red">{summary ? formatNumber(summary.cancelled_bookings) : '—'}</span>
          {comparison?.cancelled_bookings && (
            <div className={`st-stat__comparison ${comparison.cancelled_bookings.change_pct > 0 ? 'st-stat__comparison--down' : comparison.cancelled_bookings.change_pct < 0 ? 'st-stat__comparison--up' : 'st-stat__comparison--neutral'}`}>
              <span className="st-stat__arrow">{comparison.cancelled_bookings.change_pct > 0 ? '▲' : comparison.cancelled_bookings.change_pct < 0 ? '▼' : '■'}</span>
              <span className="st-stat__pct">{comparison.cancelled_bookings.change_pct > 0 ? `+${comparison.cancelled_bookings.change_pct}%` : `${comparison.cancelled_bookings.change_pct}%`}</span>
              <span className="st-stat__prev-label">{comparisonLabel}</span>
            </div>
          )}
        </div>
      </section>

      {/* Chart: chart (left) · controls (right) */}
      <section className="st-card st-chart-card">
        {error && (
          <div className="st-alert st-alert--error">
            <span>{error}</span>
            <button type="button" className="st-alert__retry-btn" onClick={() => setReloadKey((k) => k + 1)}>Thử lại</button>
          </div>
        )}

        <div className="st-chart-card__body">
          <div className="st-chart-card__chart">
            {loading ? (
              <div className="st-loading-box">
                <div className="st-loading-spinner"></div>
                <p className="st-loading-text">Đang tải dữ liệu thống kê...</p>
              </div>
            ) : overview ? (
              <StatsChart type={chartType} data={chartData.items} formatValue={chartData.format} />
            ) : (
              !error && <div className="st-empty">Chọn khách sạn và khoảng thời gian hợp lệ để xem thống kê.</div>
            )}
          </div>

          <aside className="st-chart-card__controls">
            <div className="st-control">
              <span className="st-control__label">DẠNG BIỂU ĐỒ</span>
              <div className="st-toggle" role="group" aria-label="Dạng biểu đồ">
                <button
                  type="button"
                  className={`st-toggle__btn ${chartType === 'bar' ? 'st-toggle__btn--active' : ''}`}
                  onClick={() => setChartType('bar')}
                  aria-pressed={chartType === 'bar'}
                >
                  Cột
                </button>
                <button
                  type="button"
                  className={`st-toggle__btn ${chartType === 'pie' ? 'st-toggle__btn--active' : ''}`}
                  onClick={() => setChartType('pie')}
                  aria-pressed={chartType === 'pie'}
                >
                  Tròn
                </button>
              </div>
            </div>

            <div className="st-control">
              <span className="st-control__label">SỐ LIỆU HIỂN THỊ</span>
              <div className="st-dataset-list">
                {DATASETS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`st-dataset ${dataset === d.value ? 'st-dataset--active' : ''}`}
                    onClick={() => setDataset(d.value)}
                    aria-pressed={dataset === d.value}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {overview && !loading && chartData.items.length > 0 && (dataset !== 'TIME' || chartData.items.length <= 15) && (
              <div className="st-control">
                <span className="st-control__label">CHÚ GIẢI</span>
                <ul className="st-legend">
                  {chartData.items.map((item, i) => (
                    <li key={item.label + i} className="st-legend__item">
                      <span className="st-legend__dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}></span>
                      <span className="st-legend__name">{item.label}</span>
                      <span className="st-legend__value">{chartData.format(item.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>

        {overview && (
          <p className="st-note">
            Doanh thu tính trên các đơn không bị hủy, theo ngày tạo đơn
            ({formatDisplayDate(overview.range.from)} - {formatDisplayDate(overview.range.to)}).
            {overview.previous_period && (
              <span> So sánh {comparisonLabel} ({formatDisplayDate(overview.previous_period.from)} - {formatDisplayDate(overview.previous_period.to)}).</span>
            )}
            {' '}Điểm đánh giá là điểm trung bình toàn thời gian của khách sạn.
          </p>
        )}
      </section>

      <StatisticsExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onConfirm={handleExport}
        isExporting={exporting}
        hotelName={overview?.hotel?.name || ''}
        rangeLabel={overview ? `${formatDisplayDate(overview.range.from)} - ${formatDisplayDate(overview.range.to)}` : ''}
        totalRecords={summary?.total_bookings ?? 0}
        filename={overview ? getStatisticsExcelFilename(overview) : undefined}
      />
    </div>
  );
};

export default StatisticsPage;