import React, { useEffect } from 'react';
import './Dialog.css';

/**
 * Reusable modal dialog component.
 * Supports info, warning, and confirm variants.
 *
 * Props:
 *   isOpen     {boolean}  - controls visibility
 *   onClose    {function} - called when overlay or cancel is clicked
 *   onConfirm  {function} - called when primary action button is clicked
 *   title      {string}
 *   message    {string}
 *   variant    {'info' | 'warning' | 'confirm'} - default 'info'
 *   confirmLabel {string} - default 'OK'
 *   cancelLabel  {string} - only shown when variant is 'confirm'
 */
const Dialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'info',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className={`dialog-card dialog-card--${variant}`} onClick={(e) => e.stopPropagation()}>
        <div className={`dialog-icon dialog-icon--${variant}`}>
          {variant === 'warning' && '⚠'}
          {variant === 'confirm' && '!'}
          {variant === 'info' && 'i'}
        </div>
        <h2 className="dialog-title">{title}</h2>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          {variant === 'confirm' && (
            <button id="dialog-cancel-btn" className="dialog-btn dialog-btn--cancel" onClick={onClose}>
              {cancelLabel}
            </button>
          )}
          <button
            id="dialog-confirm-btn"
            className={`dialog-btn dialog-btn--${variant === 'confirm' ? 'danger' : 'primary'}`}
            onClick={onConfirm || onClose}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dialog;
