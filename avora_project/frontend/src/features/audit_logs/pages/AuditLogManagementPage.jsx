import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchAuditLogs, fetchAuditLogById } from '../../../services/auditLogService';
import AuditLogFilterBar from '../components/AuditLogFilterBar';
import AuditLogTable from '../components/AuditLogTable';
import AuditLogDetailModal from '../components/AuditLogDetailModal';
import './AuditLogManagementPage.css';

const AuditLogManagementPage = () => {
  const { user, loading: authLoading } = useAuth();

  // All state hooks MUST be declared unconditionally at top
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // UI state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast({ message: '', type: 'success' });
    }, 3500);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Derive date validation directly during render
  const dateError = (startDate && endDate && startDate > endDate)
    ? 'Ngày bắt đầu không được lớn hơn ngày kết thúc.'
    : '';

  // Main data fetching effect
  useEffect(() => {
    let isMounted = true;

    // If date error exists, do not query
    if (startDate && endDate && startDate > endDate) {
      return undefined;
    }

    const fetchData = async () => {
      try {
        const data = await fetchAuditLogs({
          page,
          limit: pageSize,
          search: debouncedSearch,
          action_cd: actionFilter !== 'ALL' ? actionFilter : undefined,
          entity_name: entityFilter !== 'ALL' ? entityFilter : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        });

        if (isMounted && data) {
          setLogs(Array.isArray(data.items) ? data.items : []);
          setTotalItems(data.pagination?.total ?? (data.items ? data.items.length : 0));
        }
      } catch (err) {
        if (isMounted) {
          const msg = err.message || 'Không thể tải danh sách nhật ký kiểm toán.';
          setError(msg);
          showToast(msg, 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, debouncedSearch, actionFilter, entityFilter, startDate, endDate, showToast]);

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearch('');
    setActionFilter('ALL');
    setEntityFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
    showToast('Đã đặt lại toàn bộ bộ lọc.', 'info');
  }, [showToast]);

  // Manual refresh button click
  const handleRefreshClick = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) {
      showToast('Ngày bắt đầu không được lớn hơn ngày kết thúc.', 'error');
      return;
    }

    setIsRefreshing(true);
    try {
      const data = await fetchAuditLogs({
        page,
        limit: pageSize,
        search: debouncedSearch,
        action_cd: actionFilter !== 'ALL' ? actionFilter : undefined,
        entity_name: entityFilter !== 'ALL' ? entityFilter : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });

      if (data) {
        setLogs(Array.isArray(data.items) ? data.items : []);
        setTotalItems(data.pagination?.total ?? (data.items ? data.items.length : 0));
        showToast('Đã làm mới dữ liệu nhật ký kiểm toán.', 'success');
      }
    } catch (err) {
      const msg = err.message || 'Không thể tải danh sách nhật ký kiểm toán.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [page, pageSize, debouncedSearch, actionFilter, entityFilter, startDate, endDate, showToast]);

  // View detail modal handler (fetches detailed record if needed)
  const handleViewDetail = useCallback(async (logItem) => {
    if (!logItem) return;
    setSelectedLog(logItem);
    setIsDetailOpen(true);

    // Try fetching full detail with diff if log_id exists
    if (logItem.log_id) {
      try {
        const fullDetail = await fetchAuditLogById(logItem.log_id);
        if (fullDetail) {
          setSelectedLog(fullDetail);
        }
      } catch {
        // Fallback to currently selected item if detail API has issues
      }
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedLog(null);
  }, []);

  // Filter change handlers resetting page to 1
  const handleActionChange = useCallback((action) => {
    setActionFilter(action);
    setPage(1);
  }, []);

  const handleEntityChange = useCallback((entity) => {
    setEntityFilter(entity);
    setPage(1);
  }, []);

  const handleStartDateChange = useCallback((date) => {
    setStartDate(date);
    setPage(1);
  }, []);

  const handleEndDateChange = useCallback((date) => {
    setEndDate(date);
    setPage(1);
  }, []);

  // RBAC Guard
  const roleCode = String(user?.role_code_name || user?.role_name || user?.role || user?.role_cd || '')
    .trim().toUpperCase().replace(/[ -]+/g, '_');
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  const isAdmin = ['ADM', 'ADMIN', 'ADMINISTRATOR', 'SYSTEM_ADMIN'].includes(roleCode) || roleCd === '1';

  if (!authLoading && user && !isAdmin) {
    return <Navigate to="/forbidden" replace />;
  }

  return (
    <div className="audit-mgmt-page">
      {/* Toast Notification */}
      {toast.message && (
        <div className={`audit-toast audit-toast--${toast.type}`} role="alert">
          <div className="audit-toast__icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
          </div>
          <span className="audit-toast__message">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="audit-mgmt-header">
        <div className="audit-mgmt-header__left">
          {/* Breadcrumb */}
          <nav className="audit-breadcrumb" aria-label="Breadcrumb">
            <span>Hệ thống</span>
            <span className="audit-breadcrumb__sep">&gt;</span>
            <span>Nhật ký &amp; Giám sát</span>
            <span className="audit-breadcrumb__sep">&gt;</span>
            <span className="audit-breadcrumb__current">Nhật ký kiểm toán (Audit Log)</span>
          </nav>

          {/* Title & Badge */}
          <div className="audit-title-row">
            <h1 className="audit-main-title">Nhật ký kiểm toán hệ thống</h1>
            <span className="audit-main-badge">AUDIT LOG</span>
          </div>

          {/* Subtitle Description */}
          <p className="audit-subtitle">
            Theo dõi, đối soát và kiểm tra toàn bộ lịch sử thao tác, biến động dữ liệu và hoạt động đăng nhập
            của người dùng trên toàn hệ thống Avora.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <AuditLogFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        actionFilter={actionFilter}
        onActionChange={handleActionChange}
        entityFilter={entityFilter}
        onEntityChange={handleEntityChange}
        startDate={startDate}
        onStartDateChange={handleStartDateChange}
        endDate={endDate}
        onEndDateChange={handleEndDateChange}
        dateError={dateError}
        onReset={handleResetFilters}
        onRefresh={handleRefreshClick}
        isLoading={isRefreshing || loading}
      />

      {/* Table & Pagination */}
      <AuditLogTable
        logs={logs}
        loading={loading}
        error={error}
        onRetry={handleRefreshClick}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        onViewDetail={handleViewDetail}
      />

      {/* Detail Modal */}
      <AuditLogDetailModal
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        log={selectedLog}
      />
    </div>
  );
};

export default AuditLogManagementPage;
