import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchVenueWallet } from '../services/venueWalletApi';
import VenueWalletKpiCards from '../components/VenueWalletKpiCards';
import VenueTransactionsTable from '../components/VenueTransactionsTable';
import VenueTransactionDetailModal from '../components/VenueTransactionDetailModal';
import './VenueWalletPage.css';

const VenueWalletPage = () => {
  const { user } = useAuth();
  const storageKey = user?.user_id ? `avora_wallet_selected_hotel_${user.user_id}` : 'avora_wallet_selected_hotel';

  const [selectedHotelId, setSelectedHotelId] = useState(() => {
    return sessionStorage.getItem(storageKey) || 'default';
  });
  const [isHotelOpen, setIsHotelOpen] = useState(false);
  const hotelDropdownRef = useRef(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (hotelDropdownRef.current && !hotelDropdownRef.current.contains(e.target)) {
        setIsHotelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch venue wallet data
  useEffect(() => {
    let active = true;
    setPageError('');

    fetchVenueWallet(selectedHotelId)
      .then((res) => {
        if (!active) return;
        if (res && res.data) {
          setData(res.data);
          if (res.data.hotel && res.data.hotel.hotel_id) {
            setSelectedHotelId(res.data.hotel.hotel_id);
            sessionStorage.setItem(storageKey, res.data.hotel.hotel_id);
          }
        } else {
          throw new Error(res?.message || 'Không thể tải dữ liệu ví');
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('Error loading venue wallet:', err);
        // If current hotelId caused error (e.g. from previous session/hotel deleted), reset to default and retry once
        if (selectedHotelId !== 'default') {
          sessionStorage.removeItem(storageKey);
          setSelectedHotelId('default');
        } else {
          setPageError(err?.response?.data?.message || err.message || 'Lỗi khi tải thông tin ví chỗ nghỉ.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedHotelId, refreshing, storageKey]);

  const handleSelectHotel = (hotelId) => {
    setSelectedHotelId(hotelId);
    sessionStorage.setItem(storageKey, hotelId);
    setIsHotelOpen(false);
  };

  const handleRefresh = () => {
    setRefreshing((prev) => !prev);
  };

  const { hotel, availableHotels = [], balances = {}, summary = {}, policies = {}, transactions = {} } = data || {};
  const selectedHotelObj = availableHotels.find((h) => h.hotel_id === selectedHotelId) || hotel;

  return (
    <div className="vw-page-wrapper">
      {/* 1. Header matching rp-page-header & user-page-header */}
      <div className="vw-page-header">
        <div className="vw-page-header__left">
          {/* Breadcrumb */}
          <nav className="vw-breadcrumb" aria-label="Breadcrumb">
            <Link to="/dashboard" className="vw-breadcrumb__link">
              Marketing &amp; Doanh thu
            </Link>
            <span className="vw-breadcrumb__sep">&gt;</span>
            <span className="vw-breadcrumb__current">Ví doanh thu chỗ nghỉ</span>
          </nav>

          {/* Title Row */}
          <div className="vw-title-row">
            <h1 className="vw-main-title">Doanh Thu &amp; Ví Chỗ Nghỉ</h1>

          </div>

          {/* Subtitle */}
          <p className="vw-subtitle">
            Theo dõi chi tiết lịch sử biến động số dư ví (Tiền Vào từ booking &amp; Tiền Ra từ rút tiền) kèm giải trình kiểm toán theo chính sách chỗ nghỉ.
          </p>
        </div>

        {/* Header Actions */}
        <div className="vw-page-header__actions">
          {/* Hotel Switcher Dropdown */}
          {availableHotels.length > 0 && (
            <div className="vw-hotel-dropdown-wrap" ref={hotelDropdownRef}>
              <button
                type="button"
                className="vw-hotel-dropdown-btn"
                onClick={() => setIsHotelOpen(!isHotelOpen)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                </svg>
                <span className="vw-hotel-dropdown-btn__text">
                  {selectedHotelObj?.hotel_name || selectedHotelObj?.name || 'Chọn khách sạn'}
                </span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isHotelOpen && (
                <div className="vw-hotel-dropdown-menu">
                  <div className="vw-hotel-dropdown-menu__title">Chỗ nghỉ của bạn:</div>
                  {availableHotels.map((h) => (
                    <button
                      key={h.hotel_id}
                      type="button"
                      className={`vw-hotel-dropdown-item ${h.hotel_id === selectedHotelId ? 'vw-hotel-dropdown-item--active' : ''}`}
                      onClick={() => handleSelectHotel(h.hotel_id)}
                    >
                      <span className="vw-hotel-name-label">{h.hotel_name || h.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Refresh Action */}
          <button
            type="button"
            className="vw-btn vw-btn--outline"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Đồng bộ lại dữ liệu biến động ví"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={refreshing ? 'vw-spinner-spin' : ''}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          {/* Link to Bank Linking & Withdrawal */}
          <Link
            to="/dashboard/wallet"
            className="vw-btn vw-btn--primary"
            title="Quản lý tài khoản ngân hàng thụ hưởng và yêu cầu rút tiền"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span>Rút tiền &amp; Ngân hàng</span>
          </Link>
        </div>
      </div>

      {pageError && <div className="vw-alert-error">{pageError}</div>}

      {loading && !data ? (
        <div className="vw-loading-state">
          <div className="vw-loading-spinner" />
          <p>Đang tải dữ liệu biến động số dư ví...</p>
        </div>
      ) : availableHotels.length === 0 ? (
        <div className="vw-empty-state">
          <h3>Bạn chưa có chỗ nghỉ nào ở trạng thái hoạt động (ACTIVE).</h3>
          <p>Vui lòng đăng ký cơ sở lưu trú và chờ phê duyệt để kích hoạt ví doanh thu.</p>
        </div>
      ) : (
        <>
          {/* 2. 4 Thẻ Thống Kê KPI Cards */}
          <VenueWalletKpiCards balances={balances} summary={summary} policies={policies} />

          {/* 3. Bảng Dữ Liệu 2 Tab Tiền Vào & Tiền Ra */}
          <VenueTransactionsTable
            inflow={transactions?.inflow || []}
            outflow={transactions?.outflow || []}
            onSelectTransaction={(tx) => setSelectedTransaction(tx)}
          />
        </>
      )}

      {/* 4. Modal Kiểm Toán Chi Tiết */}
      {selectedTransaction && (
        <VenueTransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
};

export default VenueWalletPage;
