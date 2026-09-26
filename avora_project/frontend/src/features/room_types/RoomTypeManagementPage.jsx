import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  createRoomType,
  fetchRoomTypes,
  fetchHotels,
  fetchFacilities,
  softDeleteRoomType,
  updateRoomType,
} from './services/roomTypeApi';
import RoomTypeStatsOverview from './components/RoomTypeStatsOverview';
import RoomTypeFilterBar from './components/RoomTypeFilterBar';
import RoomTypeTable from './components/RoomTypeTable';
import RoomTypeFormModal from './components/RoomTypeFormModal';
import RoomTypeDeleteModal from './components/RoomTypeDeleteModal';
import './RoomTypeManagementPage.css';

const RoomTypeManagementPage = () => {
  const [hotels, setHotels] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [facilitiesError, setFacilitiesError] = useState('');
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [selectedHotelId, setSelectedHotelId] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL | ACTIVE | INACTIVE
  const [sortBy, setSortBy] = useState('PRICE_DESC');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isFacilityOpen, setIsFacilityOpen] = useState(false);
  const facilityRef = useRef(null);
  const deletedRoomTypeIdsRef = useRef(new Set());

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Close facility dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (facilityRef.current && !facilityRef.current.contains(e.target)) {
        setIsFacilityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadFacilities = useCallback(async () => {
    try {
      const facilityList = await fetchFacilities();
      setFacilities(facilityList || []);
      setFacilitiesError('');
    } catch (err) {
      setFacilitiesError(err.message || 'Không thể tải danh sách tiện ích.');
    } finally {
      setFacilitiesLoading(false);
    }
  }, []);

  const retryFacilities = () => {
    setFacilitiesLoading(true);
    setFacilitiesError('');
    loadFacilities();
  };

  useEffect(() => {
    let isMounted = true;
    fetchFacilities()
      .then((facilityList) => {
        if (isMounted) {
          setFacilities(facilityList || []);
          setFacilitiesError('');
        }
      })
      .catch((err) => {
        if (isMounted) {
          setFacilitiesError(err.message || 'Không thể tải danh sách tiện ích.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setFacilitiesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Load hotels for facility selector
  useEffect(() => {
    let isMounted = true;
    const loadHotels = async () => {
      try {
        const hotelList = await fetchHotels();
        if (isMounted) {
          setHotels(hotelList || []);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách khách sạn:', err);
      }
    };
    loadHotels();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch room types based on facility filter
  const loadData = useCallback((isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    setError(null);

    let active = true;
    fetchRoomTypes({
      hotel_id: selectedHotelId,
      include_deleted: true,
    })
      .then((res) => {
        if (active) {
          setRoomTypes((res.room_types || []).filter(
            (roomType) => !deletedRoomTypeIdsRef.current.has(roomType.room_type_id)
          ));
          setStats(res.stats || null);
          setLoading(false);
          setRefreshing(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Không thể tải dữ liệu từ máy chủ.');
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedHotelId]);

  useEffect(() => {
    const cancel = loadData();
    return () => {
      if (cancel) cancel();
    };
  }, [loadData]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Filter & Search logic
  const filteredRoomTypes = useMemo(() => {
    let result = [...roomTypes];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((rt) => {
        const matchName = rt.type_name?.toLowerCase().includes(term);
        const matchSku = rt.sku?.toLowerCase().includes(term);
        const matchBed = rt.bed_type?.toLowerCase().includes(term);
        const matchHotel = rt.m_hotel?.name?.toLowerCase().includes(term);
        const matchFac = rt.facilities?.some((f) =>
          f.facility_name?.toLowerCase().includes(term)
        );
        return matchName || matchSku || matchBed || matchHotel || matchFac;
      });
    }

    // Quick filter pills
    if (activeFilter === 'ACTIVE') {
      result = result.filter((rt) => !rt.is_deleted);
    } else if (activeFilter === 'INACTIVE') {
      result = result.filter((rt) => rt.is_deleted === true);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'PRICE_DESC') {
        return Number(b.default_price || 0) - Number(a.default_price || 0);
      }
      if (sortBy === 'PRICE_ASC') {
        return Number(a.default_price || 0) - Number(b.default_price || 0);
      }
      if (sortBy === 'NAME_ASC') {
        return a.type_name.localeCompare(b.type_name, 'vi');
      }
      if (sortBy === 'ROOMS_DESC') {
        return (b.room_count || 0) - (a.room_count || 0);
      }
      return 0;
    });

    return result;
  }, [roomTypes, searchTerm, activeFilter, sortBy]);

  // Counts for pills
  const counts = useMemo(() => {
    const all = roomTypes.length;
    const active = roomTypes.filter((rt) => !rt.is_deleted).length;
    const inactive = roomTypes.filter((rt) => rt.is_deleted === true).length;
    return { all, active, inactive };
  }, [roomTypes]);

  // Pagination slice
  const totalPages = Math.ceil(filteredRoomTypes.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRoomTypes.slice(start, start + pageSize);
  }, [filteredRoomTypes, page, pageSize]);

  const handleCreateClick = () => {
    setSelectedRoomType(null);
    setSaveError('');
    setIsFormModalOpen(true);
  };

  const handleEditClick = (rt) => {
    setSelectedRoomType(rt);
    setSaveError('');
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (rt) => {
    setSelectedRoomType(rt);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleSaveRoomType = async (payload) => {
    setSaving(true);
    setSaveError('');
    try {
      if (selectedRoomType) {
        await updateRoomType(selectedRoomType.room_type_id, payload);
        showToast('Cập nhật hạng phòng thành công.');
      } else {
        await createRoomType(payload);
        showToast('Thêm hạng phòng thành công.');
      }
      setIsFormModalOpen(false);
      setPage(1);
      loadData(true);
    } catch (err) {
      setSaveError(err.message || 'Không thể lưu hạng phòng. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedRoomType) return;

    setDeleting(true);
    setDeleteError('');
    try {
      await softDeleteRoomType(selectedRoomType.room_type_id);
      deletedRoomTypeIdsRef.current.add(selectedRoomType.room_type_id);
      setRoomTypes((current) => current.filter(
        (roomType) => roomType.room_type_id !== selectedRoomType.room_type_id
      ));
      setIsDeleteModalOpen(false);
      setIsFormModalOpen(false);
      setSelectedRoomType(null);
      showToast('Đã đánh dấu hạng phòng là đã xóa.');
      setPage(1);
      loadData(true);
    } catch (err) {
      setDeleteError(err.message || 'Không thể xóa hạng phòng. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (rt) => {
    try {
      await updateRoomType(rt.room_type_id, { is_deleted: !rt.is_deleted });
      showToast(rt.is_deleted ? 'Đã kích hoạt lại hạng phòng.' : 'Đã dừng mở bán hạng phòng.');
      setPage(1);
      loadData(true);
    } catch (err) {
      showToast(err.message || 'Không thể cập nhật trạng thái hạng phòng.');
    }
  };

  return (
    <div className="rt-page">
      {toastMessage && <div className="rt-toast">{toastMessage}</div>}

      {/* Breadcrumb */}
      <nav className="rt-page__breadcrumb">
        <span>Quản lý phòng & Lưu trú</span>
        <span className="rt-page__breadcrumb-sep">&gt;</span>
        <span className="rt-page__breadcrumb-active">Quản lý loại phòng</span>
      </nav>

      {/* Main Page Header */}
      <div className="rt-page__header">
        <div className="rt-page__title-area">
          <div className="rt-page__title-row">
            <h1 className="rt-page__title">Danh mục Hạng phòng & Cấu hình Lưu trú</h1>
            <span className="rt-badge-sync">
              <span className="rt-badge-sync__dot"></span>
              PMS LIVE SYNC
            </span>
          </div>
          <p className="rt-page__subtitle">
            Thiết lập cơ cấu phòng, giường ngủ, chính sách extra-bed và giá niêm yết tiêu chuẩn theo từng cơ sở.
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="rt-page__top-actions">
          {/* Facility Custom Dropdown */}
          <div className="rt-facility-selector" ref={facilityRef}>
            <div className="rt-facility-selector__icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
              </svg>
            </div>
            <div className="rt-facility-selector__content">
              <span className="rt-facility-selector__label">CƠ SỞ LƯU TRÚ HIỆN TẠI</span>
              <button
                type="button"
                className={`rt-facility-selector__btn ${isFacilityOpen ? 'rt-facility-selector__btn--open' : ''}`}
                onClick={() => setIsFacilityOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isFacilityOpen}
              >
                <span className="rt-facility-selector__value">
                  {selectedHotelId === 'ALL'
                    ? `Tất cả cơ sở lưu trú (${hotels.length} khách sạn)`
                    : hotels.find((h) => h.hotel_id === selectedHotelId)?.name || 'Đang tải...'}
                </span>
                <svg
                  className={`rt-facility-chevron ${isFacilityOpen ? 'rt-facility-chevron--up' : ''}`}
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

            {isFacilityOpen && (
              <div className="rt-facility-menu" role="listbox">
                <button
                  type="button"
                  className={`rt-facility-menu__item ${selectedHotelId === 'ALL' ? 'rt-facility-menu__item--active' : ''}`}
                  onClick={() => { setSelectedHotelId('ALL'); setPage(1); setIsFacilityOpen(false); }}
                  role="option"
                  aria-selected={selectedHotelId === 'ALL'}
                >
                  <span>Tất cả cơ sở lưu trú ({hotels.length} khách sạn)</span>
                  {selectedHotelId === 'ALL' && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </button>
                {hotels.map((h) => (
                  <button
                    key={h.hotel_id}
                    type="button"
                    className={`rt-facility-menu__item ${selectedHotelId === h.hotel_id ? 'rt-facility-menu__item--active' : ''}`}
                    onClick={() => { setSelectedHotelId(h.hotel_id); setPage(1); setIsFacilityOpen(false); }}
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
          {/* Add new room type button */}
          <button
            className="rt-btn-action rt-btn-action--primary"
            onClick={handleCreateClick}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Thêm loại phòng mới
          </button>
        </div>
      </div>

      {/* Error state alert if any */}
      {error && (
        <div className="rt-alert rt-alert--error">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            {error}
          </span>
          <button onClick={() => loadData()} className="rt-alert__retry-btn">
            Thử lại
          </button>
        </div>
      )}

      {/* 4 Overview Stat Cards */}
      <RoomTypeStatsOverview stats={stats} loading={loading} />

      {/* Search & Filter Bar */}
      <RoomTypeFilterBar
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setPage(1);
        }}
        activeFilter={activeFilter}
        onFilterChange={(val) => {
          setActiveFilter(val);
          setPage(1);
        }}
        counts={counts}
        sortBy={sortBy}
        onSortChange={(val) => setSortBy(val)}
      />

      {/* Table Section */}
      {loading ? (
        <div className="rt-loading-box">
          <div className="rt-loading-spinner"></div>
          <p className="rt-loading-text">Đang tải dữ liệu hạng phòng từ hệ thống...</p>
        </div>
      ) : (
        <RoomTypeTable
          roomTypes={paginatedData}
          onToggleStatus={handleToggleStatus}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
        />
      )}

      {/* Pagination & Footer summary */}
      <div className="rt-footer-bar">
        <div className="rt-footer-bar__info">
          <span>
            Hiển thị {paginatedData.length} trên {filteredRoomTypes.length} hạng phòng theo cấu hình cơ sở
          </span>
          <span className="rt-footer-bar__dot">•</span>
          <button
            className="rt-footer-bar__sync-btn"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Đang đồng bộ...' : 'Tải lại dữ liệu OTA chống overbooking'}
          </button>
        </div>

        <div className="rt-pagination">
          <button
            className="rt-pagination__btn"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1}
          >
            Trước
          </button>
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
            <button
              key={p}
              className={`rt-pagination__num ${p === page ? 'rt-pagination__num--active' : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            className="rt-pagination__btn"
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages}
          >
            Tiếp
          </button>
        </div>
      </div>
      {/* Form Modal */}
      {isFormModalOpen && (
        <RoomTypeFormModal
          key={selectedRoomType?.room_type_id || `new-${selectedHotelId}`}
          isOpen
          onClose={() => setIsFormModalOpen(false)}
          hotels={hotels}
          facilities={facilities}
          facilitiesError={facilitiesError}
          facilitiesLoading={facilitiesLoading}
          onRetryFacilities={retryFacilities}
          defaultHotelId={selectedHotelId === 'ALL' ? '' : selectedHotelId}
          initialData={selectedRoomType}
          saving={saving}
          submitError={saveError}
          onSubmit={handleSaveRoomType}
          onOpenDeleteModal={() => {
            setIsFormModalOpen(false);
            setDeleteError('');
            setIsDeleteModalOpen(true);
          }}
        />
      )}

      <RoomTypeDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        roomTypeName={selectedRoomType?.type_name}
        deleting={deleting}
        error={deleteError}
      />

    </div>
  );
};

export default RoomTypeManagementPage;
