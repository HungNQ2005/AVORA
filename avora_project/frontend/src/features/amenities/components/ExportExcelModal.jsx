import React from 'react';
import './ExportExcelModal.css';

/**
 * Luxury confirmation modal for exporting amenities to Excel/CSV.
 * Follows AVORA Navy & Gold luxury hospitality aesthetic.
 */
const ExportExcelModal = ({
  isOpen,
  onClose,
  onConfirm,
  totalRecords = 0,
  filename = 'AVORA_Danh_muc_tien_nghi.xlsx',
  isExporting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="rt-modal-overlay" onClick={isExporting ? undefined : onClose}>
      <div
        className="avora-export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          className="avora-export-modal__close"
          onClick={onClose}
          disabled={isExporting}
          aria-label="Đóng"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Modal Header with Luxury Gold & Navy Icon */}
        <div className="avora-export-modal__header">
          <div className="avora-export-modal__icon-badge">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="16" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h2 id="export-modal-title" className="avora-export-modal__title">
            Xuất Danh Mục Tiện Nghi
          </h2>
          <p className="avora-export-modal__subtitle">
            Hệ thống quản lý lưu trú & khách sạn cao cấp AVORA
          </p>
        </div>

        {/* Modal Body / Information Card */}
        <div className="avora-export-modal__body">
          <div className="avora-export-details">
            <div className="avora-export-detail-item">
              <span className="avora-export-detail-label">Tên tệp tin:</span>
              <div className="avora-export-detail-val avora-export-filename">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
                <span>{filename}</span>
              </div>
            </div>

            <div className="avora-export-detail-item">
              <span className="avora-export-detail-label">Số lượng bản ghi:</span>
              <span className="avora-export-detail-val avora-export-badge-count">
                <strong>{totalRecords}</strong> tiện nghi
              </span>
            </div>

            <div className="avora-export-detail-item">
              <span className="avora-export-detail-label">Định dạng xuất:</span>
              <span className="avora-export-detail-val">
                Microsoft Excel Spreadsheet (.xlsx)
              </span>
            </div>

            <div className="avora-export-detail-item">
              <span className="avora-export-detail-label">Trạng thái dữ liệu:</span>
              <span className="avora-export-detail-val text-success">
                ● Đã đồng bộ từ Cloud Database
              </span>
            </div>
          </div>

          <div className="avora-export-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Tệp tin sẽ tự động tải về thiết bị của bạn ngay sau khi xác nhận.</span>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="avora-export-modal__footer">
          <button
            type="button"
            className="avora-export-btn avora-export-btn--cancel"
            onClick={onClose}
            disabled={isExporting}
          >
            Hủy
          </button>
          <button
            type="button"
            className="avora-export-btn avora-export-btn--confirm"
            onClick={onConfirm}
            disabled={isExporting || totalRecords === 0}
          >
            {isExporting ? (
              <>
                <svg className="avora-btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                <span>Đang xuất dữ liệu...</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Xuất Excel</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportExcelModal;
