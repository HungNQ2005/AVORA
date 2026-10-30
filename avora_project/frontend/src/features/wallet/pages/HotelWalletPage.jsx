import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { codeNameParser } from '../../../utils/codeNameParser';
import {
  fetchWalletBanks,
  fetchWalletHotels,
  fetchHotelWallet,
  linkHotelBankAccount,
} from '../../../services/walletApi';
import ConfirmLinkModal from '../components/ConfirmLinkModal';
import WalletBalanceCards from '../components/WalletBalanceCards';
import LinkedBankCard from '../components/LinkedBankCard';
import LinkBankForm from '../components/LinkBankForm';
import './HotelWalletPage.css';

const isSequentialDigits = (str) => {
  if (!str || str.length < 6) return false;
  const asc = '01234567890123456789';
  const desc = '98765432109876543210';
  return asc.includes(str) || desc.includes(str);
};

export const validateBankFormFields = (formData, banks = []) => {
  const errors = {};

  // 1. Validate bank_cd
  const bankCd = String(formData.bank_cd ?? '').trim();
  if (!bankCd) {
    errors.bank_cd = 'Vui lòng chọn ngân hàng thụ hưởng.';
  } else if (banks.length > 0 && !banks.some((b) => String(b.code_cd || b.bank_cd) === bankCd)) {
    errors.bank_cd = 'Ngân hàng đã chọn không hợp lệ.';
  }

  // 2. Validate account_number
  const accNum = String(formData.account_number ?? '').trim();
  if (!accNum) {
    errors.account_number = 'Vui lòng nhập số tài khoản ngân hàng.';
  } else if (!/^\d{6,20}$/.test(accNum)) {
    errors.account_number = `Số tài khoản phải gồm từ 6 đến 20 chữ số (hiện có: ${accNum.length}).`;
  } else if (/^(\d)\1+$/.test(accNum)) {
    errors.account_number = 'Số tài khoản không được trùng lặp toàn bộ một chữ số.';
  } else if (isSequentialDigits(accNum)) {
    errors.account_number = 'Số tài khoản không được là dãy số tiến hoặc lùi liên tiếp.';
  } else if (/^0{6,}/.test(accNum)) {
    errors.account_number = 'Số tài khoản không được bắt đầu bằng chuỗi số 0 liên tiếp.';
  }

  // 3. Validate account_holder
  const holder = String(formData.account_holder ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
  if (!holder) {
    errors.account_holder = 'Vui lòng nhập tên chủ tài khoản.';
  } else if (holder.length < 5 || holder.length > 100) {
    errors.account_holder = `Tên chủ tài khoản phải từ 5 đến 100 ký tự (hiện có: ${holder.length}).`;
  } else if (!/^[A-Z\s]+$/.test(holder)) {
    errors.account_holder = 'Tên chủ tài khoản chỉ được chứa chữ cái in hoa không dấu (A-Z).';
  } else {
    const words = holder.split(' ').filter(Boolean);
    if (words.length < 2 || words.length > 10) {
      errors.account_holder = 'Vui lòng nhập đầy đủ cả Họ và Tên (từ 2 đến 10 từ).';
    } else if (words.some((w) => w.length < 2 || w.length > 25)) {
      errors.account_holder = 'Mỗi từ trong tên chủ tài khoản phải dài từ 2 đến 25 ký tự.';
    } else if (words.some((w) => /([A-Z])\1{2,}/.test(w))) {
      errors.account_holder = 'Tên chủ tài khoản chứa các ký tự lặp lại bất thường.';
    } else if (words.some((w) => !/[AEIOUY]/.test(w))) {
      errors.account_holder = 'Mỗi từ trong tên chủ tài khoản phải là từ có nghĩa.';
    }
  }

  // 4. Validate bank_branch (optional, validated if non-empty)
  const rawBranch = String(formData.bank_branch ?? '').trim().replace(/\s+/g, ' ');
  if (rawBranch) {
    if (/<[^>]*>/.test(rawBranch)) {
      errors.bank_branch = 'Chi nhánh ngân hàng không được chứa thẻ HTML.';
    } else if (rawBranch.length < 3 || rawBranch.length > 150) {
      errors.bank_branch = 'Tên chi nhánh ngân hàng phải từ 3 đến 150 ký tự.';
    } else if (!/^[\p{L}\p{N}\s.,\-/()]+$/u.test(rawBranch)) {
      errors.bank_branch = 'Chỉ được chứa chữ cái, chữ số và các dấu câu cơ bản (.,-/()).';
    } else if ((rawBranch.match(/\p{L}/gu) || []).length < 2) {
      errors.bank_branch = 'Tên chi nhánh ngân hàng phải chứa tối thiểu 2 chữ cái.';
    }
  }

  return errors;
};

const HotelWalletPage = () => {
  const { user, loading: authLoading } = useAuth();

  const roleCode = String(user?.role_code_name || '').trim().toUpperCase();
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  const isVendor = roleCode === 'VEN' || roleCd === '4';

  // Guard: Strictly Vendor-only
  if (!authLoading && user && !isVendor) {
    return <Navigate to="/forbidden" replace />;
  }

  const [hotels, setHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(true);
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [isHotelOpen, setIsHotelOpen] = useState(false);
  const hotelDropdownRef = useRef(null);

  const [banks, setBanks] = useState([]);
  const [walletData, setWalletData] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [pageError, setPageError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    bank_cd: '',
    bin_code: '',
    account_number: '',
    account_holder: '',
    bank_branch: '',
  });
  const [touchedFields, setTouchedFields] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 4000);
  }, []);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

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

  // Load supported banks & vendor hotels
  useEffect(() => {
    let active = true;
    setHotelsLoading(true);
    setPageError('');

    Promise.all([fetchWalletHotels(), fetchWalletBanks()])
      .then(([hotelList, bankList]) => {
        if (!active) return;
        setHotels(hotelList);
        setBanks(bankList);
        if (hotelList.length > 0) {
          const savedHotelId = sessionStorage.getItem('avora_wallet_selected_hotel');
          const matchedHotel = hotelList.find((h) => h.hotel_id === savedHotelId);
          setSelectedHotelId(matchedHotel ? matchedHotel.hotel_id : hotelList[0].hotel_id);
        }
      })
      .catch((err) => {
        if (!active) return;
        setPageError(err.message || 'Không thể tải dữ liệu khởi tạo.');
      })
      .finally(() => {
        if (active) setHotelsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Load wallet & bank account for selected hotel (with AbortController to prevent stale race conditions)
  const abortControllerRef = useRef(null);

  const loadHotelWallet = useCallback((hotelId) => {
    if (!hotelId) return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingWallet(true);
    setPageError('');

    fetchHotelWallet(hotelId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setWalletData(data);
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError' || controller.signal.aborted) return;
        setPageError(err.message || 'Không thể tải thông tin ví của khách sạn.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingWallet(false);
        }
      });
  }, []);

  useEffect(() => {
    if (selectedHotelId) {
      setConfirmDialogOpen(false);
      setTouchedFields({});
      setFormData({
        bank_cd: '',
        bin_code: '',
        account_number: '',
        account_holder: '',
        bank_branch: '',
      });
      loadHotelWallet(selectedHotelId);
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedHotelId, loadHotelWallet]);

  const fieldErrors = validateBankFormFields(formData, banks);

  const handleFieldBlur = (e) => {
    const { name } = e.target;
    if (name) {
      setTouchedFields((prev) => ({ ...prev, [name]: true }));
    }
  };

  const handleBankChange = (e) => {
    const selectedBankCd = e.target.value;
    const foundBank = banks.find((b) => String(b.code_cd || b.bank_cd) === String(selectedBankCd));
    setTouchedFields((prev) => ({ ...prev, bank_cd: true }));
    setPageError('');
    setFormData((prev) => ({
      ...prev,
      bank_cd: selectedBankCd,
      bin_code: foundBank?.bin_code || '',
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    setPageError('');
    if (name === 'account_number') {
      // Chỉ nhận chữ số, tối đa 20 số
      const digitsOnly = value.replace(/\D/g, '').slice(0, 20);
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
    } else if (name === 'account_holder') {
      // Tự động bỏ dấu tiếng Việt, chỉ giữ chữ cái A-Z và khoảng trắng, in hoa
      const cleanUpper = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z\s]/g, '')
        .toUpperCase();
      setFormData((prev) => ({ ...prev, [name]: cleanUpper }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouchedFields({
      bank_cd: true,
      account_number: true,
      account_holder: true,
      bank_branch: true,
    });

    const currentErrors = validateBankFormFields(formData, banks);
    const firstError =
      currentErrors.bank_cd ||
      currentErrors.account_number ||
      currentErrors.account_holder ||
      currentErrors.bank_branch;

    if (firstError) {
      setPageError(firstError);
      return;
    }

    setPageError('');
    setConfirmDialogOpen(true);
  };

  const handleConfirmLink = async () => {
    setConfirmDialogOpen(false);
    setFormSubmitting(true);
    setPageError('');

    try {
      await linkHotelBankAccount(selectedHotelId, {
        bank_cd: formData.bank_cd,
        account_number: formData.account_number.trim(),
        account_holder: formData.account_holder.trim().replace(/\s+/g, ' ').toUpperCase(),
        bank_branch: formData.bank_branch?.trim().replace(/\s+/g, ' ') || undefined,
      });

      showToast('Liên kết tài khoản ngân hàng với ví khách sạn thành công!');
      setTouchedFields({});
      setFormData({
        bank_cd: '',
        bin_code: '',
        account_number: '',
        account_holder: '',
        bank_branch: '',
      });
      loadHotelWallet(selectedHotelId);
    } catch (err) {
      setPageError(err.message || 'Không thể liên kết tài khoản ngân hàng.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleQuickFillSavedAccount = (savedAcc) => {
    if (!savedAcc) return;
    const foundBank = banks.find((b) => String(b.code_cd || b.bank_cd) === String(savedAcc.bank_cd));
    setFormData({
      bank_cd: String(savedAcc.bank_cd || ''),
      bin_code: savedAcc.bin_code || foundBank?.bin_code || '',
      account_number: String(savedAcc.account_number || ''),
      account_holder: String(savedAcc.account_holder || '').toUpperCase(),
      bank_branch: String(savedAcc.bank_branch || ''),
    });
    setTouchedFields({
      bank_cd: true,
      account_number: true,
      account_holder: true,
      bank_branch: Boolean(savedAcc.bank_branch),
    });
    setPageError('');
    showToast(`Đã điền nhanh thông tin tài khoản từ khách sạn "${savedAcc.source_hotel_name}".`);
  };

  const handleRequestChangeBank = () => {
    showToast('Hệ thống hỗ trợ gửi ticket thay đổi tài khoản ngân hàng thụ hưởng đang được chuẩn bị. Vui lòng liên hệ Admin để đổi tài khoản.');
  };

  const selectedHotel = hotels.find((h) => h.hotel_id === selectedHotelId);
  const linkedBank = walletData?.bank_account;
  const vendorSavedAccounts = walletData?.vendor_saved_accounts || [];
  const isLinked = Boolean(linkedBank && linkedBank.is_verify);

  return (
    <div className="hw-page">
      {/* Breadcrumb */}
      <nav className="hw-breadcrumb" aria-label="Breadcrumb">
        <span>Marketing & Doanh Thu</span>
        <span className="hw-breadcrumb-sep">&gt;</span>
        <span className="hw-breadcrumb-active">Ví & Liên kết ngân hàng</span>
      </nav>

      {/* Header with Hotel Switcher */}
      <div className="hw-header">
        <div className="hw-header__title">
          <h1>Ví khách sạn & Tài khoản thụ hưởng</h1>
          <p>Quản lý số dư và liên kết tài khoản ngân hàng nhận tiền cho khách sạn của bạn</p>
        </div>

        {hotels.length > 0 && (
          <div className="hw-hotel-select" ref={hotelDropdownRef}>
            <button
              type="button"
              className="hw-hotel-select-btn"
              onClick={() => setIsHotelOpen(!isHotelOpen)}
            >
              <span>{selectedHotel?.name || 'Chọn khách sạn'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {isHotelOpen && (
              <div className="hw-hotel-dropdown">
                {hotels.map((h) => (
                  <button
                    key={h.hotel_id}
                    type="button"
                    className={`hw-hotel-dropdown-item ${h.hotel_id === selectedHotelId ? 'hw-hotel-dropdown-item--active' : ''}`}
                    onClick={() => {
                      setSelectedHotelId(h.hotel_id);
                      sessionStorage.setItem('avora_wallet_selected_hotel', h.hotel_id);
                      setIsHotelOpen(false);
                    }}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {pageError && <div className="hw-notice-error">{pageError}</div>}
      {toastMessage && <div className="hotel-toast" role="status">{toastMessage}</div>}

      {hotelsLoading || loadingWallet ? (
        <div className="hw-empty-state">Đang tải thông tin ví khách sạn...</div>
      ) : hotels.length === 0 ? (
        <div className="hw-empty-state">
          <h3>Bạn chưa có khách sạn nào được phê duyệt.</h3>
          <p>Vui lòng đăng ký khách sạn trước khi liên kết tài khoản ngân hàng.</p>
        </div>
      ) : (
        <>
          {/* Balance Cards Component */}
          <WalletBalanceCards
            availableBalance={walletData?.wallet?.available_balance || 0}
            pendingBalance={walletData?.wallet?.pending_balance || 0}
          />

          {/* Bank Account Linking Section */}
          <section className="hw-bank-section">
            <div className="hw-bank-section__header">
              <h2>Tài khoản ngân hàng thụ hưởng</h2>
              <span
                className={`hw-status-badge ${isLinked ? 'hw-status-badge--linked' : 'hw-status-badge--unlinked'}`}
              >
                {isLinked ? '● Đã liên kết' : '○ Chưa liên kết'}
              </span>
            </div>

            {isLinked ? (
              <LinkedBankCard
                linkedBank={linkedBank}
                banks={banks}
                onChangeClick={handleRequestChangeBank}
              />
            ) : (
              <LinkBankForm
                formData={formData}
                banks={banks}
                vendorSavedAccounts={vendorSavedAccounts}
                onQuickFillSavedAccount={handleQuickFillSavedAccount}
                fieldErrors={fieldErrors}
                touchedFields={touchedFields}
                onBankChange={handleBankChange}
                onFormChange={handleFormChange}
                onFieldBlur={handleFieldBlur}
                onSubmit={handleSubmit}
                isSubmitting={formSubmitting}
              />
            )}
          </section>
        </>
      )}

      {/* Confirmation Modal */}
      <ConfirmLinkModal
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmLink}
        hotelName={selectedHotel?.name}
        bankName={(() => {
          const b = banks.find((item) => String(item.code_cd || item.bank_cd) === String(formData.bank_cd));
          return b ? `${codeNameParser(b.code_name)} (${b.code_name})` : '';
        })()}
        binCode={formData.bin_code}
        accountNumber={formData.account_number}
        accountHolder={formData.account_holder.trim().replace(/\s+/g, ' ').toUpperCase()}
        bankBranch={formData.bank_branch?.trim().replace(/\s+/g, ' ')}
        isLoading={formSubmitting}
      />
    </div>
  );
};

export default HotelWalletPage;
