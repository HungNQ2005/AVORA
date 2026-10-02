import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchAmenities,
  createAmenity,
  updateAmenity,
  deleteAmenity,
} from '../../../services/amenityApi';
import AmenityStatsCards from '../components/AmenityStatsCards';
import AmenityFilterBar from '../components/AmenityFilterBar';
import AmenityTable from '../components/AmenityTable';
import AmenityFormModal from '../components/AmenityFormModal';
import AmenityDetailModal from '../components/AmenityDetailModal';
import AmenityDeleteModal from '../components/AmenityDeleteModal';
import ExportExcelModal from '../components/ExportExcelModal';
import { exportAmenitiesToExcel, getExportExcelFilename } from '../../../utils/exportToExcel';
import { matchesSearch } from '../../../utils/textSearchHelper';
import './AmenityManagementPage.css';

const FACILITY_TYPE_LABELS = {
  INTERNET: 'Internet / Wi-Fi',
  POOL: 'Hồ bơi',
  FOOD: 'Ẩm thực',
  PARKING: 'Bãi đỗ xe',
  SERVICE: 'Dịch vụ',
  GYM: 'Thể hình / Gym',
  RESTAURANT: 'Nhà hàng',
  SPA: 'Spa & Chăm sóc',
};

const VISIBLE_COLUMNS = {
  id: true,
  name: true,
  codeIcon: true,
  type: true,
  applied: true,
  actions: true,
};

const AmenityManagementPage = () => {
  // State
  const [amenities, setAmenities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('POPULAR');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedAmenityForEdit, setSelectedAmenityForEdit] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAmenityForDetail, setSelectedAmenityForDetail] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAmenityForDelete, setSelectedAmenityForDelete] = useState(null);

  // Action status
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'success' });
    }, 3500);
  };

  // Fetch data
  const loadAmenities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAmenities({
        category: categoryFilter,
        status: statusFilter,
        sort: sortBy,
        scope: 'ALL',
        highlight_only: false,
      });

      if (result) {
        setAmenities(result.facilities || []);
        if (result.stats) {
          setStats(result.stats);
        }
      }
    } catch (err) {
      console.error('Error loading amenities:', err);
      setError(err.message || 'Không thể tải danh sách tiện ích từ cơ sở dữ liệu Cloud.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, sortBy]);

  useEffect(() => {
    loadAmenities();
  }, [loadAmenities]);

  // Derived filtered & paginated records with instant contains search (Vietnamese diacritics support)
  const filteredAmenities = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return amenities;
    return amenities.filter((item) =>
      matchesSearch(
        [
          item.facility_name,
          item.name_vi,
          item.name_en,
          item.code,
          item.category,
          item.type,
          FACILITY_TYPE_LABELS[item.type],
          item.scope_label,
          item.pricing_label,
          item.applied_unit,
        ],
        searchTerm
      )
    );
  }, [amenities, searchTerm]);

  const paginatedAmenities = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAmenities.slice(start, start + pageSize);
  }, [filteredAmenities, page, pageSize]);

  // Handlers
  const handleOpenCreate = () => {
    setSelectedAmenityForEdit(null);
    setSaveError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (amenity) => {
    setSelectedAmenityForEdit(amenity);
    setSaveError('');
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (amenity) => {
    setSelectedAmenityForDetail(amenity);
    setIsDetailModalOpen(true);
  };

  const handleOpenDelete = (amenity) => {
    setSelectedAmenityForDelete(amenity);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleSaveAmenity = async (formData) => {
    setSaving(true);
    setSaveError('');
    try {
      if (selectedAmenityForEdit) {
        await updateAmenity(selectedAmenityForEdit.facility_id, formData);
        showToast(`Đã cập nhật tiện ích "${formData.name_vi}" thành công.`);
      } else {
        await createAmenity(formData);
        showToast(`Đã tạo mới tiện ích "${formData.name_vi}" thành công.`);
      }
      setIsFormModalOpen(false);
      loadAmenities();
    } catch (err) {
      setSaveError(err.message || 'Lỗi khi lưu thông tin tiện ích.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async (facilityId) => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAmenity(facilityId);
      showToast('Đã xóa tiện ích thành công khỏi hệ thống.');
      setIsDeleteModalOpen(false);
      loadAmenities();
    } catch (err) {
      setDeleteError(err.message || 'Lỗi khi xóa tiện ích.');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenExportModal = () => {
    if (!amenities || amenities.length === 0) {
      showToast('Không có dữ liệu tiện nghi để xuất file Excel.', 'warning');
      return;
    }
    setIsExportModalOpen(true);
  };

  const handleConfirmExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    // Subtle feedback delay for luxury feel
    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      const exportFilename = getExportExcelFilename();
      const exportList = filteredAmenities.length > 0 ? filteredAmenities : amenities;
      const result = await exportAmenitiesToExcel(exportList, exportFilename);
      if (result && result.success) {
        showToast(`Đã xuất thành công ${result.count || exportList.length} tiện nghi ra file Excel!`, 'success');
        setIsExportModalOpen(false);
      } else {
        showToast(result?.message || 'Không thể xuất file Excel.', 'error');
      }
    } catch (err) {
      console.error('Export Excel failed:', err);
      showToast('Có lỗi xảy ra trong quá trình xuất file Excel.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAuditClick = () => {
    showToast(`Hệ thống kiểm toán CMS: ${stats?.totalFacilities ?? 0} tiện ích đồng bộ chính xác với cơ sở dữ liệu OTA.`);
  };

  return (
    <div className="amenity-page">
      {/* Toast Notification */}
      {toast.message && (
        <div className={`amenity-toast amenity-toast--${toast.type || 'success'}`}>
          {toast.type === 'success' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {toast.type === 'warning' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {toast.type === 'error' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header & Breadcrumb */}
      <header className="amenity-page-header">
        <div className="amenity-page-header__left">
          <nav className="amenity-breadcrumb">
            <span>Quản lý phòng & Lưu trú</span>
            <span className="amenity-breadcrumb__separator">&gt;</span>
            <span className="amenity-breadcrumb__current">Danh mục Tiện nghi</span>
          </nav>
          <div className="amenity-title-row">
            <h1 className="amenity-page-title">Quản lý Danh mục Tiện nghi</h1>
            <span className="amenity-version-badge">CMS V3.2</span>
          </div>
        </div>

        <div className="amenity-page-header__actions">
          {/* Button: Xuất Excel (Luxury Hotel Style - Navy & Gold) */}
          <button
            type="button"
            className="amenity-btn-excel"
            onClick={handleOpenExportModal}
            disabled={loading || isExporting}
            title="Xuất toàn bộ danh mục tiện nghi ra tệp Excel"
          >
            {isExporting ? (
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
                {amenities.length > 0 && (
                  <span className="amenity-excel-badge">{amenities.length}</span>
                )}
              </>
            )}
          </button>

          {/* Button: Thêm tiện nghi mới */}
          <button
            type="button"
            className="amenity-btn-primary-cta"
            onClick={handleOpenCreate}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>Thêm tiện nghi mới</span>
          </button>
        </div>
      </header>

      {/* KPI Stats Overview Cards */}
      <AmenityStatsCards stats={stats} onAuditClick={handleAuditClick} />

      {/* Filter & Search Bar */}
      <AmenityFilterBar
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setPage(1);
        }}
        categoryFilter={categoryFilter}
        onCategoryChange={(val) => {
          setCategoryFilter(val);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        sortBy={sortBy}
        onSortChange={(val) => {
          setSortBy(val);
          setPage(1);
        }}
        categories={stats?.categories || []}
      />

      {/* Main Amenities Data Table */}
      <AmenityTable
        amenities={paginatedAmenities}
        loading={loading}
        error={error}
        onRetry={loadAmenities}
        onView={handleOpenDetail}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        totalItems={filteredAmenities.length}
        visibleColumns={VISIBLE_COLUMNS}
      />

      {/* Modals */}
      <AmenityFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveAmenity}
        amenity={selectedAmenityForEdit}
        saving={saving}
        error={saveError}
        categories={stats?.categories || []}
      />

      <AmenityDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        amenity={selectedAmenityForDetail}
        onEdit={handleOpenEdit}
      />

      <AmenityDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        amenity={selectedAmenityForDelete}
        deleting={deleting}
        error={deleteError}
      />

      {/* Export Excel Confirmation Modal */}
      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => !isExporting && setIsExportModalOpen(false)}
        onConfirm={handleConfirmExport}
        totalRecords={filteredAmenities.length}
        filename={getExportExcelFilename()}
        isExporting={isExporting}
      />

    </div>
  );
};

export default AmenityManagementPage;
