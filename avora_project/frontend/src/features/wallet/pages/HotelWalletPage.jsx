import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
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

  // Load wallet & bank account for selected hotel
  const loadHotelWallet = useCallback((hotelId) => {
    if (!hotelId) return;
    setLoadingWallet(true);
    setPageError('');

    fetchHotelWallet(hotelId)
      .then((data) => {
        setWalletData(data);
      })
      .catch((err) => {
        setPageError(err.message || 'Không thể tải thông tin ví của khách sạn.');
      })
      .finally(() => {
        setLoadingWallet(false);
      });
  }, []);

  useEffect(() => {
    if (selectedHotelId) {
      loadHotelWallet(selectedHotelId);
    }
  }, [selectedHotelId, loadHotelWallet]);

  const handleBankChange = (e) => {
    const selectedBankCd = e.target.value;
    const foundBank = banks.find((b) => String(b.bank_cd) === String(selectedBankCd));
    setFormData((prev) => ({
      ...prev,
      bank_cd: selectedBankCd,
      bin_code: foundBank?.bin_code || '',
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
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
    if (!formData.bank_cd) {
      setPageError('Vui lòng chọn ngân hàng thụ hưởng.');
      return;
    }

    const trimmedAcc = formData.account_number.trim();
    if (!trimmedAcc || !/^\d{6,20}$/.test(trimmedAcc)) {
      setPageError('Số tài khoản ngân hàng phải gồm từ 6 đến 20 chữ số.');
      return;
    }
    if (/^(\d)\1+$/.test(trimmedAcc)) {
      setPageError('Số tài khoản không hợp lệ (không được trùng lặp toàn bộ một chữ số).');
      return;
    }

    const trimmedHolder = formData.account_holder.trim().replace(/\s+/g, ' ');
    if (trimmedHolder.length < 5 || trimmedHolder.length > 100) {
      setPageError('Tên chủ tài khoản phải từ 5 đến 100 ký tự.');
      return;
    }

    const nameWords = trimmedHolder.split(' ').filter(Boolean);
    if (nameWords.length < 2) {
      setPageError('Tên chủ tài khoản phải bao gồm cả Họ và Tên (tối thiểu 2 từ).');
      return;
    }
    if (nameWords.some((w) => w.length < 2)) {
      setPageError('Mỗi từ trong tên chủ tài khoản phải có từ 2 ký tự trở lên.');
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
        bin_code: formData.bin_code || undefined,
        account_number: formData.account_number.trim(),
        account_holder: formData.account_holder.trim().toUpperCase(),
        bank_branch: formData.bank_branch?.trim() || undefined,
      });

      showToast('Liên kết tài khoản ngân hàng với ví khách sạn thành công!');
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

  const handleRequestChangeBank = () => {
    showToast('Hệ thống hỗ trợ gửi ticket thay đổi tài khoản ngân hàng thụ hưởng đang được chuẩn bị. Vui lòng liên hệ Admin để đổi tài khoản.');
  };

  const selectedHotel = hotels.find((h) => h.hotel_id === selectedHotelId);
  const linkedBank = walletData?.bank_account;
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
                onBankChange={handleBankChange}
                onFormChange={handleFormChange}
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
        accountNumber={formData.account_number}
        accountHolder={formData.account_holder}
        isLoading={formSubmitting}
      />
    </div>
  );
};

export default HotelWalletPage;
