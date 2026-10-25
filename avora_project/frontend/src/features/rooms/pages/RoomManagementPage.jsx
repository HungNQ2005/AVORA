import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fetchRooms,
  fetchRoomHotels,
  createRoom,
  updateRoom,
  deleteRoom,
} from '../../../services/roomApi';
import RoomStatsOverview from '../components/RoomStatsOverview';
import RoomQuickFilterTabs from '../components/RoomQuickFilterTabs';
import RoomFilterBar from '../components/RoomFilterBar';
import RoomTable from '../components/RoomTable';
import RoomFloorMatrixModal from '../components/RoomFloorMatrixModal';
import RoomFormModal from '../components/RoomFormModal';
import RoomDetailModal from '../components/RoomDetailModal';
import RoomDeleteModal from '../components/RoomDeleteModal';
import ExportExcelModal from '../../amenities/components/ExportExcelModal';
import { exportRoomsToExcel, getRoomExportExcelFilename } from '../../../utils/exportRoomExcel';
import { useAuth } from '../../../context/AuthContext';
import { EyeIcon, FileTextIcon, GridIcon, PlusIcon, AlertTriangleIcon, SpinnerIcon } from '../../../common/components/icons';
import './RoomManagementPage.css';

const RoomManagementPage = () => {
  // Role: Hotel Manager (VEN) can create/update/delete.
  // System Admin (ADM) has view-only rights (can view rooms, details, floor layout, export report).
  const { user } = useAuth();
  const roleCode = String(user?.role_code_name || user?.role_name || user?.role || user?.role_cd || '')
    .trim().toUpperCase().replace(/[ -]+/g, '_');
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  const isVendor = ['VEN', 'VENDOR'].includes(roleCode) || roleCd === '4';
  const canEdit = isVendor;

  // Data State
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Filters State
  const [selectedHotelId, setSelectedHotelId] = useState('ALL');
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('ROOM_NUM_ASC');
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'MATRIX'

  // Pagination & Selection
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalError, setModalError] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Load accessible hotels on mount
  useEffect(() => {
    let isMounted = true;
    fetchRoomHotels()
      .then((hotelList) => {
        if (isMounted && Array.isArray(hotelList)) {
          setHotels(hotelList);
          // If only 1 hotel assigned, default to it
          if (hotelList.length === 1) {
            setSelectedHotelId(hotelList[0].hotel_id);
          }
        }
      })
      .catch((err) => {
        console.error('Lỗi khi tải danh sách khách sạn:', err);
      });

    return () => { isMounted = false; };
  }, []);

  const loadData = useCallback(() => {
    setRefreshing(true);
    fetchRooms({
      hotel_id: selectedHotelId,
    })
      .then((res) => {
        setRooms(res?.rooms || []);
        setStats(res?.stats || null);
        if (res?.hotels && res.hotels.length > 0) {
          setHotels(res.hotels);
        }
        if (res?.floors) {
          setFloors(res.floors);
        }
        if (Array.isArray(res?.room_types)) {
          setRoomTypes(res.room_types);
        }
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải dữ liệu buồng phòng từ máy chủ.');
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [selectedHotelId]);

  useEffect(() => {
    let active = true;
    fetchRooms({
      hotel_id: selectedHotelId,
    })
      .then((res) => {
        if (active) {
          setRooms(res?.rooms || []);
          setStats(res?.stats || null);
          if (res?.hotels && res.hotels.length > 0) {
            setHotels(res.hotels);
          }
          if (res?.floors) {
            setFloors(res.floors);
          }
          if (Array.isArray(res?.room_types)) {
            setRoomTypes(res.room_types);
          }
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Không thể tải dữ liệu buồng phòng từ máy chủ.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => { active = false; };
  }, [selectedHotelId]);

  // Dynamic Room Type Categories for Filter Tabs
  const roomTypeCategories = useMemo(() => {
    const catMap = {};
    rooms.forEach((r) => {
      const typeName = r.m_room_type?.type_name || 'Khác';
      let catKey = 'OTHER';
      let catLabel = typeName;

      if (typeName.toLowerCase().includes('villa') || typeName.toLowerCase().includes('biệt thự')) {
        catKey = 'CAT_VILLA';
        catLabel = 'Villa & Biệt thự';
      } else if (typeName.toLowerCase().includes('suite')) {
        catKey = 'CAT_SUITE';
        catLabel = 'Phòng Suite';
      } else if (typeName.toLowerCase().includes('deluxe')) {
        catKey = 'CAT_DELUXE';
        catLabel = 'Phòng Deluxe';
      }

      if (!catMap[catKey]) {
        catMap[catKey] = { id: catKey, name: catLabel, count: 0 };
      }
      catMap[catKey].count += 1;
    });

    return Object.values(catMap);
  }, [rooms]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const total = rooms.length;
    const available = rooms.filter((r) => !r.is_deleted && r.status_cd === 'AVAILABLE').length;
    const locked = rooms.filter((r) => r.is_deleted || r.status_cd === 'LOCKED' || r.status_cd === 'MAINTENANCE').length;
    return { total, available, locked };
  }, [rooms]);

  // Filter & Search & Sort logic
  const filteredRooms = useMemo(() => {
    let result = [...rooms];

    // Quick Tab filter
    if (activeTab === 'STATUS_AVAILABLE') {
      result = result.filter((r) => !r.is_deleted && r.status_cd === 'AVAILABLE');
    } else if (activeTab === 'STATUS_LOCKED') {
      result = result.filter((r) => r.is_deleted || r.status_cd === 'LOCKED' || r.status_cd === 'MAINTENANCE');
    } else if (activeTab === 'CAT_VILLA') {
      result = result.filter((r) => {
        const name = (r.m_room_type?.type_name || '').toLowerCase();
        return name.includes('villa') || name.includes('biệt thự');
      });
    } else if (activeTab === 'CAT_SUITE') {
      result = result.filter((r) => (r.m_room_type?.type_name || '').toLowerCase().includes('suite'));
    } else if (activeTab === 'CAT_DELUXE') {
      result = result.filter((r) => (r.m_room_type?.type_name || '').toLowerCase().includes('deluxe'));
    }

    // Search query filter
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((r) => {
        const matchNum = r.room_number?.toLowerCase().includes(term);
        const matchType = r.m_room_type?.type_name?.toLowerCase().includes(term);
        const matchBed = r.m_room_type?.bed_type?.toLowerCase().includes(term);
        const matchFloor = r.floor?.toLowerCase().includes(term);
        const matchSku = r.sku?.toLowerCase().includes(term);
        const matchFac = r.facilities?.some((f) => f.facility_name?.toLowerCase().includes(term));
        const matchHotel = r.m_hotel?.name?.toLowerCase().includes(term);
        const matchHotelAddress = r.m_hotel?.address?.toLowerCase().includes(term);
        return matchNum || matchType || matchBed || matchFloor || matchSku || matchFac || matchHotel || matchHotelAddress;
      });
    }

    // Floor filter
    if (selectedFloor !== 'ALL') {
      result = result.filter((r) => r.floor === selectedFloor);
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((r) => r.status_cd === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'PRICE_DESC') {
        return Number(b.m_room_type?.default_price || 0) - Number(a.m_room_type?.default_price || 0);
      }
      if (sortBy === 'PRICE_ASC') {
        return Number(a.m_room_type?.default_price || 0) - Number(b.m_room_type?.default_price || 0);
      }
      if (sortBy === 'NAME_ASC') {
        return (a.m_room_type?.type_name || '').localeCompare(b.m_room_type?.type_name || '', 'vi');
      }
      if (sortBy === 'ROOM_NUM_ASC') {
        return (a.room_number || '').localeCompare(b.room_number || '', 'vi', { numeric: true });
      }
      return 0;
    });

    return result;
  }, [rooms, activeTab, searchTerm, selectedFloor, statusFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredRooms.length / pageSize) || 1;
  const paginatedRooms = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRooms.slice(start, start + pageSize);
  }, [filteredRooms, page, pageSize]);

  // Reset Filters / Khôi phục mẫu
  const handleResetFilters = () => {
    setActiveTab('ALL');
    setSearchTerm('');
    setSelectedFloor('ALL');
    setStatusFilter('ALL');
    setSortBy('ROOM_NUM_ASC');
    setPage(1);
    setSelectedIds([]);
    showToast('Đã khôi phục các bộ lọc về mặc định.');
  };

  // Selection handlers
  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      setSelectedIds(filteredRooms.map((r) => r.room_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (roomId) => {
    setSelectedIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  // Status Toggle (Đóng/Mở bán)
  const handleToggleStatus = async (room) => {
    if (!canEdit) {
      showToast('Tài khoản Quản trị viên chỉ có quyền xem, không được chỉnh sửa buồng phòng.');
      return;
    }
    const statusUpper = String(room?.status_cd || '').toUpperCase();
    if (statusUpper === 'OCCUPIED' || statusUpper === 'BOOKED') {
      const statusText = statusUpper === 'OCCUPIED' ? 'đang có khách lưu trú' : 'đã được đặt trước';
      showToast(`Không thể thay đổi trạng thái đóng/mở bán khi buồng phòng ${statusText}.`);
      return;
    }

    const isCurrentlyAvailable = !room.is_deleted && statusUpper === 'AVAILABLE';
    const nextStatus = isCurrentlyAvailable ? 'LOCKED' : 'AVAILABLE';
    const nextDeleted = false;

    try {
      await updateRoom(room.room_id, {
        status_cd: nextStatus,
        is_deleted: nextDeleted,
      });
      showToast(
        isCurrentlyAvailable
          ? `Đã tạm khóa buồng phòng ${room.room_number}.`
          : `Đã mở bán trực tuyến buồng phòng ${room.room_number}.`
      );
      loadData();
    } catch (err) {
      showToast(err.message || 'Không thể cập nhật trạng thái phòng.');
    }
  };

  // Excel Export (Luxury Modal & Report matching Users & Amenities)
  const handleOpenExportModal = () => {
    if (!filteredRooms || filteredRooms.length === 0) {
      showToast('Không có dữ liệu buồng phòng để xuất file Excel.');
      return;
    }
    setIsExportModalOpen(true);
  };

  const handleConfirmExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const exportFilename = getRoomExportExcelFilename();
      const activeHotelName = stats?.hotel_name || 'Tất cả cơ sở lưu trú';
      const exportList = filteredRooms.length > 0 ? filteredRooms : rooms;
      const result = await exportRoomsToExcel(exportList, activeHotelName, exportFilename);
      if (result && result.success) {
        if (result.incompleteRoomsCount > 0) {
          showToast(
            `Đã xuất ${result.count || exportList.length} buồng phòng. Cảnh báo: Có ${result.incompleteRoomsCount} phòng chưa đầy đủ dữ liệu.`
          );
        } else {
          showToast(`Đã xuất thành công ${result.count || exportList.length} buồng phòng ra file Excel!`);
        }
        setIsExportModalOpen(false);
      } else {
        showToast(result?.message || 'Không thể xuất file Excel.');
        setIsExportModalOpen(false);
      }
    } catch (err) {
      console.error('Export Excel failed:', err);
      showToast(err.message || 'Có lỗi xảy ra trong quá trình xuất file Excel.');
      setIsExportModalOpen(false);
    } finally {
      setIsExporting(false);
    }
  };
  // Modal Handlers
  const handleOpenCreateModal = () => {
    if (!canEdit) {
      showToast('Tài khoản Quản trị viên chỉ có quyền xem, không được thêm buồng phòng.');
      return;
    }
    setActiveRoom(null);
    setModalError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (room) => {
    if (!canEdit) {
      showToast('Tài khoản Quản trị viên chỉ có quyền xem, không được chỉnh sửa buồng phòng.');
      return;
    }
    setActiveRoom(room);
    setModalError('');
    setIsFormModalOpen(true);
  };

  const handleOpenDetailModal = (room) => {
    setActiveRoom(room);
    setIsDetailModalOpen(true);
  };

  const handleOpenDeleteModal = (room) => {
    if (!canEdit) {
      showToast('Tài khoản Quản trị viên chỉ có quyền xem, không được xóa buồng phòng.');
      return;
    }
    setActiveRoom(room);
    setModalError('');
    setIsDeleteModalOpen(true);
  };

  const handleSaveRoom = async (formData) => {
    if (!canEdit) {
      setModalError('Tài khoản Quản trị viên chỉ có quyền xem, không được lưu dữ liệu buồng phòng.');
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      if (activeRoom) {
        const updated = await updateRoom(activeRoom.room_id, formData);
        if (updated) {
          setRooms((prev) =>
            prev.map((r) => (r.room_id === activeRoom.room_id ? { ...r, ...updated } : r))
          );
        }
        showToast(`Cập nhật buồng phòng ${formData.room_number} thành công.`);
      } else {
        const created = await createRoom(formData);
        if (created) {
          setRooms((prev) => [created, ...prev]);
        }
        showToast(`Thêm mới buồng phòng ${formData.room_number} thành công.`);
      }
      setIsFormModalOpen(false);
      setActiveRoom(null);
      loadData();
    } catch (err) {
      setModalError(err.message || 'Không thể lưu buồng phòng. Vui lòng kiểm tra lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeRoom) return;
    if (!canEdit) {
      setModalError('Tài khoản Quản trị viên chỉ có quyền xem, không được xóa buồng phòng.');
      return;
    }
    setDeleting(true);
    setModalError('');
    try {
      const deletedId = activeRoom.room_id;
      const deletedNum = activeRoom.room_number;
      await deleteRoom(deletedId);
      setRooms((prev) => prev.filter((r) => r.room_id !== deletedId));
      setSelectedIds((prev) => prev.filter((id) => id !== deletedId));
      showToast(`Đã xóa buồng phòng ${deletedNum} thành công.`);
      setIsDeleteModalOpen(false);
      setIsDetailModalOpen(false);
      setActiveRoom(null);
      loadData();
    } catch (err) {
      setModalError(err.message || 'Không thể xóa buồng phòng. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="room-page">
      {/* Toast Notification */}
      {toastMessage && <div className="room-toast">{toastMessage}</div>}

      {/* Breadcrumb */}
      <nav className="room-breadcrumb">
        <span>Quản lý phòng &amp; Lưu trú</span>
        <span className="room-breadcrumb__sep">&gt;</span>
        <span>Quản lí buồng phòng</span>
      </nav>

      {/* Main Header */}
      <div className="room-page__header">
        <div className="room-page__title-area">
          <div className="room-page__title-row">
            <h1 className="room-page__title">Quản lý Buồng phòng</h1>
            {!canEdit && (
              <span
                className="room-page__badge-readonly"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#64748b',
                  background: '#f1f5f9',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  marginLeft: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Chế độ chỉ xem dành cho Quản trị viên hệ thống"
              >
                <EyeIcon size={12} />
                Chế độ chỉ xem
              </span>
            )}
          </div>
          <p className="room-page__subtitle">
            Quản trị cơ cấu các hạng phòng, phân bổ buồng phòng thực tế, định giá niêm yết &amp; khuyến mãi, sức chứa, quy cách giường ngủ và đóng/mở bán thời gian thực theo vai trò chuẩn.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="room-page__top-actions">
          {/* Button: Xuất Excel (Luxury Hotel Style - Navy & Gold, Synchronized with Amenities) */}
          <button
            type="button"
            className="room-btn-excel"
            onClick={handleOpenExportModal}
            disabled={loading || isExporting}
            title="Xuất danh sách buồng phòng ra tệp Excel"
          >
            {isExporting ? (
              <>
                <SpinnerIcon size={16} />
                <span>Đang xuất...</span>
              </>
            ) : (
              <>
                <FileTextIcon size={16} className="room-excel-icon" />
                <span>Xuất Excel</span>
                {filteredRooms.length > 0 && (
                  <span className="room-excel-badge">{filteredRooms.length}</span>
                )}
              </>
            )}
          </button>
          <button
            type="button"
            className="room-btn-action room-btn-action--outline"
            onClick={() => setIsMatrixModalOpen(true)}
            title="Xem sơ đồ trực quan các buồng phòng theo tầng"
          >
            <GridIcon size={15} />
            Sơ đồ buồng phòng
          </button>

          {canEdit && (
            <button
              type="button"
              className="room-btn-action room-btn-action--primary"
              onClick={handleOpenCreateModal}
            >
              <PlusIcon size={15} strokeWidth={2.5} />
              Thêm buồng phòng mới
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="room-alert room-alert--error">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangleIcon size={16} />
            {error}
          </span>
          <button onClick={() => loadData()} className="room-alert__retry-btn">
            Thử lại
          </button>
        </div>
      )}

      {/* 4 Overview Stat Cards */}
      <RoomStatsOverview stats={stats} loading={loading} />

      {/* Quick Category / Status Filter Tabs */}
      <RoomQuickFilterTabs
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setPage(1);
        }}
        counts={tabCounts}
        roomTypeCategories={roomTypeCategories}
      />

      {/* Search & Filter Bar */}
      <RoomFilterBar
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setPage(1);
        }}
        hotels={hotels}
        selectedHotelId={selectedHotelId}
        onHotelChange={(hId) => {
          setSelectedHotelId(hId);
          setPage(1);
        }}
        floors={floors}
        selectedFloor={selectedFloor}
        onFloorChange={(fl) => {
          setSelectedFloor(fl);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(st) => {
          setStatusFilter(st);
          setPage(1);
        }}
        sortBy={sortBy}
        onSortChange={(sb) => setSortBy(sb)}
        viewMode={viewMode}
        onViewModeChange={(vm) => setViewMode(vm)}
      />

      {/* Content: Table or Inline Matrix */}
      {loading ? (
        <div className="room-loading-box">
          <div className="room-loading-spinner"></div>
          <p className="room-loading-text">Đang tải dữ liệu buồng phòng từ hệ thống...</p>
        </div>
      ) : viewMode === 'MATRIX' ? (
        /* Inline Matrix View */
        <div className="room-inline-matrix">
          <div className="room-inline-matrix__header">
            <span className="room-inline-matrix__title">
              Sơ đồ bố trí buồng phòng theo tầng ({filteredRooms.length} phòng)
            </span>
            <button
              type="button"
              className="room-btn-action room-btn-action--outline"
              onClick={() => setViewMode('TABLE')}
            >
              Xem dạng bảng
            </button>
          </div>
          {floors.map((floor) => {
            const floorRooms = filteredRooms.filter((r) => r.floor === floor);
            if (floorRooms.length === 0) return null;
            return (
              <div key={floor} className="matrix-floor-row" style={{ padding: '16px 0' }}>
                <div className="matrix-floor-info">
                  <span className="matrix-floor-name">{floor}</span>
                  <span className="matrix-floor-summary">
                    {floorRooms.filter((r) => r.status_cd === 'AVAILABLE' && !r.is_deleted).length}/
                    {floorRooms.length} trống
                  </span>
                </div>
                <div className="matrix-room-cards">
                  {floorRooms.map((room) => (
                    <div
                      key={room.room_id}
                      className={`matrix-room-card ${room.is_deleted || room.status_cd === 'LOCKED'
                        ? 'matrix-room--locked'
                        : room.status_cd === 'MAINTENANCE'
                          ? 'matrix-room--maintenance'
                          : room.status_cd === 'OCCUPIED' || room.status_cd === 'BOOKED'
                            ? 'matrix-room--occupied'
                            : 'matrix-room--available'
                        }`}
                      onClick={() => handleOpenDetailModal(room)}
                      title={`Xem chi tiết phòng ${room.room_number}`}
                    >
                      <div className="matrix-room-card__header">
                        <span className="matrix-room-card__num">{room.room_number}</span>
                        <span className="matrix-room-card__status">
                          {room.is_deleted || room.status_cd === 'LOCKED'
                            ? 'Tạm khóa'
                            : room.status_cd === 'MAINTENANCE'
                              ? 'Bảo trì'
                              : room.status_cd === 'OCCUPIED'
                                ? 'Có khách'
                                : 'Khả dụng'}
                        </span>
                      </div>
                      <div className="matrix-room-card__type">
                        {room.m_room_type?.type_name || 'Chưa cập nhật'}
                      </div>
                      <div className="matrix-room-card__price">
                        {Number(room.m_room_type?.default_price || 0).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <RoomTable
          rooms={paginatedRooms}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          onToggleStatus={handleToggleStatus}
          onViewClick={handleOpenDetailModal}
          onEditClick={handleOpenEditModal}
          onDeleteClick={handleOpenDeleteModal}
          readOnly={!canEdit}
        />
      )}

      {/* Footer Bar & Pagination */}
      <div className="room-footer-bar">
        <div className="room-footer-bar__info">
          <span>
            Hiển thị {paginatedRooms.length} trên {filteredRooms.length} buồng phòng theo cấu hình cơ sở
          </span>
          <span className="room-footer-bar__dot">•</span>
          <button
            type="button"
            className="room-footer-bar__sync-btn"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Đang đồng bộ...' : 'Tải lại dữ liệu OTA chống overbooking'}
          </button>
        </div>

        <div className="room-pagination">
          <button
            type="button"
            className="room-pagination__btn"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1}
          >
            Trước
          </button>
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
            <button
              key={p}
              type="button"
              className={`room-pagination__num ${p === page ? 'room-pagination__num--active' : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className="room-pagination__btn"
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages}
          >
            Tiếp
          </button>
        </div>
      </div>

      {/* Form Modal (Add / Edit) */}
      {canEdit && isFormModalOpen && (
        <RoomFormModal
          isOpen
          onClose={() => setIsFormModalOpen(false)}
          initialData={activeRoom}
          hotels={hotels}
          roomTypes={roomTypes}
          defaultHotelId={selectedHotelId}
          saving={saving}
          error={modalError}
          onSubmit={handleSaveRoom}
        />
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && (
        <RoomDetailModal
          isOpen
          onClose={() => setIsDetailModalOpen(false)}
          room={activeRoom}
          onEditClick={canEdit ? (room) => {
            setIsDetailModalOpen(false);
            handleOpenEditModal(room);
          } : undefined}
          onDeleteClick={canEdit ? (room) => {
            setIsDetailModalOpen(false);
            handleOpenDeleteModal(room);
          } : undefined}
        />
      )}

      {/* Delete Modal */}
      {canEdit && isDeleteModalOpen && (
        <RoomDeleteModal
          isOpen
          onClose={() => setIsDeleteModalOpen(false)}
          room={activeRoom}
          deleting={deleting}
          error={modalError}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Sơ đồ buồng phòng Modal */}
      {isMatrixModalOpen && (
        <RoomFloorMatrixModal
          isOpen
          onClose={() => setIsMatrixModalOpen(false)}
          rooms={filteredRooms}
          hotelName={stats?.hotel_name || 'Cơ sở hiện tại'}
          onSelectRoom={(room) => {
            setIsMatrixModalOpen(false);
            handleOpenDetailModal(room);
          }}
        />
      )}

      {/* Export Excel Confirmation Modal */}
      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => !isExporting && setIsExportModalOpen(false)}
        onConfirm={handleConfirmExport}
        totalRecords={filteredRooms.length}
        filename={getRoomExportExcelFilename()}
        isExporting={isExporting}
        title="Xuất Danh Sách Buồng Phòng"
        unitLabel="buồng phòng"
      />
    </div>
  );
};

export default RoomManagementPage;
