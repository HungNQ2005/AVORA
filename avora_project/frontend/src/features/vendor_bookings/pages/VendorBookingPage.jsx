import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchVendorBookings,
  fetchVendorBookingById,
  updateVendorBookingStatus,
} from '../../../services/vendorBookingApi';
import VendorBookingStats from '../components/VendorBookingStats';
import VendorBookingFilterBar from '../components/VendorBookingFilterBar';
import VendorBookingTable from '../components/VendorBookingTable';
import VendorBookingDetailModal from '../components/VendorBookingDetailModal';
import VendorBookingCancelModal from '../components/VendorBookingCancelModal';
import './VendorBookingPage.css';

const VendorBookingPage = () => {
  // State Dữ liệu
  const [bookings, setBookings] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pnd: 0, cfm: 0, can: 0 });
  const [hotels, setHotels] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // State Bộ lọc
  const [activeStatus, setActiveStatus] = useState('all');
  const [selectedHotelId, setSelectedHotelId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // State Modals & Actions
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const searchTimerRef = useRef(null);

  // Hiển thị thông báo Toast thân thiện
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Debounce ô tìm kiếm 400ms để giảm tải gọi API
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm]);

  // Tải danh sách đơn đặt phòng từ Backend
  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchVendorBookings({
        page,
        limit: 10,
        status: activeStatus,
        hotelId: selectedHotelId,
        search: debouncedSearch,
        startDate,
        endDate,
      });

      setBookings(res.bookings || []);
      setCounts(res.counts || { all: 0, pnd: 0, cfm: 0, can: 0 });
      setPagination(res.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
      if (res.hotels && res.hotels.length > 0) {
        setHotels(res.hotels);
      }
    } catch (err) {
      console.error('[VendorBookingPage] loadBookings error:', err);
      showToast(err.message || 'Không thể tải danh sách đơn đặt phòng. Vui lòng thử lại sau.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, activeStatus, selectedHotelId, debouncedSearch, startDate, endDate]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Xử lý đổi Tab trạng thái
  const handleStatusChange = (newStatus) => {
    setActiveStatus(newStatus);
    setPage(1);
  };

  // Xử lý đổi khách sạn
  const handleHotelChange = (newHotelId) => {
    setSelectedHotelId(newHotelId);
    setPage(1);
  };

  // Đặt lại toàn bộ bộ lọc
  const handleResetFilters = () => {
    setActiveStatus('all');
    setSelectedHotelId('all');
    setSearchTerm('');
    setDebouncedSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Xem chi tiết đơn
  const handleViewDetail = async (booking) => {
    try {
      setSelectedBooking(booking);
      setIsDetailModalOpen(true);
      // Gọi API lấy dữ liệu chi tiết mới nhất
      const fullDetail = await fetchVendorBookingById(booking.booking_id);
      setSelectedBooking(fullDetail);
    } catch (err) {
      console.error('[VendorBookingPage] fetchDetail error:', err);
      // Vẫn giữ dữ liệu tóm tắt hiện có để xem
    }
  };

  // Xác nhận đơn phòng
  const handleConfirmBooking = async (booking) => {
    try {
      setActionLoadingId(booking.booking_id);
      setIsProcessing(true);
      const res = await updateVendorBookingStatus(booking.booking_id, {
        status: 'CFM',
      });

      showToast(res.message || 'Đã xác nhận đơn đặt phòng thành công!', 'success');
      setIsDetailModalOpen(false);
      loadBookings();
    } catch (err) {
      console.error('[VendorBookingPage] confirm error:', err);
      showToast(err.message || 'Không thể xác nhận đơn đặt phòng.', 'error');
    } finally {
      setActionLoadingId(null);
      setIsProcessing(false);
    }
  };

  // Mở modal hủy đơn
  const handleOpenCancelModal = (booking) => {
    setSelectedBooking(booking);
    setIsCancelModalOpen(true);
  };

  // Xác nhận hủy đơn với lý do
  const handleConfirmCancel = async (booking, reason) => {
    try {
      setActionLoadingId(booking.booking_id);
      setIsProcessing(true);
      const res = await updateVendorBookingStatus(booking.booking_id, {
        status: 'CAN',
        reason,
      });

      showToast(res.message || 'Đã hủy đơn đặt phòng thành công.', 'success');
      setIsCancelModalOpen(false);
      setIsDetailModalOpen(false);
      loadBookings();
    } catch (err) {
      console.error('[VendorBookingPage] cancel error:', err);
      showToast(err.message || 'Không thể hủy đơn đặt phòng.', 'error');
    } finally {
      setActionLoadingId(null);
      setIsProcessing(false);
    }
  };

  return (
    <div className="vbooking-page">
      {/* Toast thông báo */}
      {toast.show && (
        <div className={`vbooking-toast vbooking-toast--${toast.type}`}>
          <span className="vbooking-toast-icon">
            {toast.type === 'success' ? '✓' : '⚠️'}
          </span>
          <span className="vbooking-toast-text">{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb điều hướng */}
      <div className="vbooking-breadcrumb">
        <span>Bảng điều khiển</span>
        <span className="vbooking-breadcrumb__sep">/</span>
        <span>Hệ thống khách sạn</span>
        <span className="vbooking-breadcrumb__sep">/</span>
        <span className="vbooking-breadcrumb__active">Quản lý đặt phòng</span>
      </div>

      {/* Header trang */}
      <div className="vbooking-page__header">
        <div className="vbooking-page__title-area">
          <div className="vbooking-page__title-row">
            <h1 className="vbooking-page__title">Quản lý đặt phòng</h1>
            <span className="vbooking-badge-tag">CỔNG VẬN HÀNH</span>
          </div>
          <p className="vbooking-page__subtitle">
            Theo dõi, kiểm tra lịch ở và xác nhận các đơn đặt phòng của khách tại các cơ sở lưu trú của bạn.
          </p>
        </div>
      </div>

      {/* Thẻ Thống kê nhanh */}
      <VendorBookingStats counts={counts} loading={loading} />

      {/* Thanh Lọc & Tìm kiếm */}
      <VendorBookingFilterBar
        activeStatus={activeStatus}
        onStatusChange={handleStatusChange}
        counts={counts}
        hotels={hotels}
        selectedHotelId={selectedHotelId}
        onHotelChange={handleHotelChange}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={startDate}
        onStartDateChange={(val) => { setStartDate(val); setPage(1); }}
        endDate={endDate}
        onEndDateChange={(val) => { setEndDate(val); setPage(1); }}
        onResetFilters={handleResetFilters}
        onRefresh={loadBookings}
        loading={loading}
      />

      {/* Bảng Danh sách Đơn đặt phòng */}
      <VendorBookingTable
        bookings={bookings}
        loading={loading}
        pagination={pagination}
        onPageChange={(newPage) => setPage(newPage)}
        onViewDetail={handleViewDetail}
        onQuickConfirm={handleConfirmBooking}
        onQuickCancel={handleOpenCancelModal}
        actionLoadingId={actionLoadingId}
      />

      {/* Modal Chi tiết đơn */}
      <VendorBookingDetailModal
        isOpen={isDetailModalOpen}
        booking={selectedBooking}
        onClose={() => setIsDetailModalOpen(false)}
        onConfirm={handleConfirmBooking}
        onCancel={handleOpenCancelModal}
        isProcessing={isProcessing}
      />

      {/* Modal Xác nhận hủy đơn */}
      <VendorBookingCancelModal
        isOpen={isCancelModalOpen}
        booking={selectedBooking}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirmCancel={handleConfirmCancel}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default VendorBookingPage;
