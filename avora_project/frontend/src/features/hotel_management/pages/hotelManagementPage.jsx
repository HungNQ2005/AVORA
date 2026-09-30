import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import HotelCard from '../components/hotelCard';
import EditHotelPopup from '../components/editHotelPopup';
import Dialog from '../../../common/components/Dialog';
import { useAuth } from '../../../context/AuthContext';
import { approveHotel, createHotel, deleteHotel, getCities, getHotels, restoreHotel, updateHotel } from '../../../services/hotelManagementService';
import './hotelManagementPage.css';

const HotelManagementPage = () => {
	const location = useLocation();
	const { user } = useAuth();
	const [hotels, setHotels] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, page_size: 10, total_items: 0, total_pages: 0 });
	const [refreshKey, setRefreshKey] = useState(0);
	const [filters, setFilters] = useState({ keyword: '', city_id: '', star_quality: '' });
	const [debouncedKeyword, setDebouncedKeyword] = useState('');
	const [cities, setCities] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [editingHotel, setEditingHotel] = useState(null);
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleteError, setDeleteError] = useState('');
	const [toast, setToast] = useState(() => location.state?.notice || '');
	const userRole = String(user?.role_code_name || '').trim().toUpperCase();
	const hasActiveFilters = Boolean(debouncedKeyword || filters.city_id || filters.star_quality);
	const isVendor = userRole === 'VEN';
	const canApprove = userRole === 'ADM' || userRole === 'BMR';
	const vendorHasNoHotels = isVendor && !hasActiveFilters;

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedKeyword(filters.keyword.trim()), 300);
		return () => clearTimeout(timer);
	}, [filters.keyword]);

	useEffect(() => {
		let active = true;
		getCities().then((data) => { if (active) setCities(data); }).catch(() => {});
		return () => { active = false; };
	}, []);

	useEffect(() => {
		let active = true;
		getHotels({
			page: pagination.page,
			keyword: debouncedKeyword,
			city_id: filters.city_id,
			star_quality: filters.star_quality,
		})
			.then(({ items, pagination: resultPagination }) => {
				if (!active) return;
				setHotels(items);
				setPagination((current) => ({ ...current, ...resultPagination }));
			})
			.catch((err) => {
				if (active) setError(err.response?.data?.message || 'Không thể tải danh sách khách sạn. Vui lòng thử lại.');
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => { active = false; };
	}, [pagination.page, debouncedKeyword, filters.city_id, filters.star_quality, refreshKey]);

	useEffect(() => {
		if (!toast) return undefined;
		const timer = setTimeout(() => setToast(''), 3000);
		return () => clearTimeout(timer);
	}, [toast]);

	const updateFilter = (event) => {
		const { name, value } = event.target;
		setFilters((current) => ({ ...current, [name]: value }));
		setPagination((current) => ({ ...current, page: 1 }));
		setLoading(true);
		setError('');
	};

	const handleCreate = async (payload) => {
		const result = await createHotel(payload);
		setCreateOpen(false);
		setToast(isVendor ? `${result.name} đã được gửi để chờ duyệt.` : `${result.name} đã được tạo.`);
		setPagination((current) => ({ ...current, page: 1 }));
		setDebouncedKeyword('');
		setFilters((current) => ({ ...current, keyword: '' }));
		setLoading(true);
		setRefreshKey((current) => current + 1);
	};

	const handleDeleteRequest = (hotel) => {
		setDeleteError('');
		setDeleteTarget(hotel);
	};

	const handleApprove = async (hotel) => {
		try {
			const approved = await approveHotel(hotel.hotel_id);
			setHotels((current) => current.map((item) => item.hotel_id === approved.hotel_id ? approved : item));
			setToast(`${hotel.name} đã được phê duyệt.`);
		} catch (err) {
			setError(err.response?.data?.message || 'Không thể phê duyệt khách sạn này.');
		}
	};

	const handleRestore = async (hotel) => {
		try {
			const restored = await restoreHotel(hotel.hotel_id);
			setHotels((current) => current.map((item) => item.hotel_id === restored.hotel_id ? restored : item));
			setToast(`${hotel.name} đã được khôi phục.`);
		} catch (err) {
			setError(err.response?.data?.message || 'Không thể khôi phục khách sạn này.');
		}
	};

	const handleUpdate = async (payload) => {
		const result = await updateHotel(editingHotel.hotel_id, payload);
		setHotels((current) => current.map((hotel) => hotel.hotel_id === result.hotel_id ? result : hotel));
		setEditingHotel(null);
		setToast('Đã lưu thông tin khách sạn.');
	};

	const handleDelete = async () => {
		setDeleteError('');
		try {
			await deleteHotel(deleteTarget.hotel_id);
			setHotels((current) => current.filter((hotel) => hotel.hotel_id !== deleteTarget.hotel_id));
			setPagination((current) => ({ ...current, total_items: Math.max(0, current.total_items - 1) }));
			setToast(`${deleteTarget.name} đã được xóa.`);
			setDeleteTarget(null);
		} catch (err) {
			setDeleteError(err.response?.data?.message || 'Không thể xóa khách sạn này.');
		}
	};

	return (
		<section className="hotel-management">
			<header className="hotel-management__header">
				<div>
					<p className="hotel-management__eyebrow">HỆ THỐNG KHÁCH SẠN / KHO PHÒNG</p>
					<h1>Quản lý khách sạn</h1>
					<p className="hotel-management__lede">Xem thông tin chi tiết, trạng thái và kho phòng của từng khách sạn.</p>
				</div>
				{isVendor && (
					<button className="hotel-button hotel-button--primary" type="button" onClick={() => setCreateOpen(true)}>
						<span aria-hidden="true">+</span> Thêm khách sạn mới
					</button>
				)}
			</header>

			<div className="hotel-toolbar" role="search">
				<label className="hotel-search">
					<span className="sr-only">Tìm khách sạn theo tên, địa chỉ hoặc mã khách sạn</span>
					<span className="hotel-search__icon" aria-hidden="true">⌕</span>
					<input name="keyword" value={filters.keyword} onChange={updateFilter} placeholder="Tìm theo tên, địa chỉ hoặc mã khách sạn" />
				</label>
				<label className="hotel-filter">
					<span>Thành phố</span>
					<select name="city_id" value={filters.city_id} onChange={updateFilter}>
						<option value="">Tất cả thành phố</option>
						{cities.map((city) => <option key={city.city_id} value={city.city_id}>{city.city_name}</option>)}
					</select>
				</label>
				<label className="hotel-filter">
					<span>Hạng sao</span>
					<select name="star_quality" value={filters.star_quality} onChange={updateFilter}>
						<option value="">Tất cả hạng sao</option>
						{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}
					</select>
				</label>
			</div>

			<div className="hotel-results-heading">
				<h2>Khách sạn <span>{pagination.total_items}</span></h2>
				<p>Hiển thị tối đa 10 khách sạn mỗi trang</p>
			</div>

			{error && <div className="hotel-notice hotel-notice--error" role="alert">{error}</div>}
			{loading ? (
				<div className="hotel-state" role="status"><span className="hotel-spinner" />Đang tải dữ liệu khách sạn</div>
			) : hotels.length ? (
				<div className="hotel-list">
					{hotels.map((hotel) => (
						<HotelCard
							key={hotel.hotel_id}
							hotel={hotel}
							canApprove={canApprove}
							isVendor={isVendor}
							onEdit={() => setEditingHotel(hotel)}
							onDelete={() => handleDeleteRequest(hotel)}
							onApprove={() => handleApprove(hotel)}
							onRestore={() => handleRestore(hotel)}
						/>
					))}
				</div>
			) : (
				<div className="hotel-state hotel-state--empty">
					<span className="hotel-state__mark" aria-hidden="true">⌂</span>
					<h2>{vendorHasNoHotels ? 'Chưa có khách sạn nào' : 'Không tìm thấy khách sạn'}</h2>
					<p>{vendorHasNoHotels ? 'Khách sạn mới của bạn sẽ hiển thị tại đây, kể cả khi đang chờ duyệt.' : 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc, hoặc tạo khách sạn mới.'}</p>
				</div>
			)}

			<footer className="hotel-pagination">
				<span>Trang {pagination.page} / {Math.max(pagination.total_pages, 1)}</span>
				<div>
					<button type="button" aria-label="Trang trước" disabled={pagination.page <= 1 || loading} onClick={() => { setLoading(true); setPagination((current) => ({ ...current, page: current.page - 1 })); }}>←</button>
					<button type="button" aria-label="Trang sau" disabled={pagination.page >= pagination.total_pages || loading} onClick={() => { setLoading(true); setPagination((current) => ({ ...current, page: current.page + 1 })); }}>→</button>
				</div>
			</footer>

			{toast && <div className="hotel-toast" role="status">{toast}</div>}
			{createOpen && <EditHotelPopup isOpen mode="create" submitLabel={isVendor ? 'Gửi chờ duyệt' : 'Tạo khách sạn'} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />}
			{editingHotel && <EditHotelPopup isOpen mode="edit" hotel={editingHotel} onClose={() => setEditingHotel(null)} onSubmit={handleUpdate} />}
			<Dialog
				isOpen={Boolean(deleteTarget)}
				onClose={() => { setDeleteTarget(null); setDeleteError(''); }}
				onConfirm={handleDelete}
				title="Xóa khách sạn này?"
				message={deleteError || `"${deleteTarget?.name || ''}" sẽ bị xóa khỏi danh sách quản lý. Thao tác này không thể thực hiện nếu còn đặt phòng đang chờ/sắp tới hoặc phòng đang sử dụng/được giữ.`}
				variant="confirm"
				confirmLabel="Xóa khách sạn"
			/>
		</section>
	);
};

export default HotelManagementPage;

