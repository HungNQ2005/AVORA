import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import HotelCard from '../components/hotelCard';
import EditHotelPopup from '../components/editHotelPopup';
import HotelDeleteOtpModal from '../components/hotelDeleteOtpModal';
import Dialog from '../../../common/components/Dialog';
import { useAuth } from '../../../context/AuthContext';
import { approveHotel, createHotel, deleteHotel, getHotels, requestHotelDeleteOtp, updateHotel } from '../../../services/hotelManagementService';
import './hotelManagementPage.css';

const HotelManagementPage = () => {
	const location = useLocation();
	const { user } = useAuth();
	const [hotels, setHotels] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, page_size: 10, total_items: 0, total_pages: 0 });
	const [refreshKey, setRefreshKey] = useState(0);
	const [filters, setFilters] = useState({ keyword: '', city_id: '', star_rating: '' });
	const [debouncedKeyword, setDebouncedKeyword] = useState('');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [editingHotel, setEditingHotel] = useState(null);
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [otpDeleteTarget, setOtpDeleteTarget] = useState(null);
	const [deleteError, setDeleteError] = useState('');
	const [toast, setToast] = useState(() => location.state?.notice || '');
	const userRole = String(user?.role_code_name || user?.role_cd || '').trim().toUpperCase();
	const hasActiveFilters = Boolean(debouncedKeyword || filters.city_id || filters.star_rating);
	const isVendor = ['VEN', 'VENDOR'].includes(userRole);
	const canApprove = ['ADM', 'ADMIN', 'ADMINISTRATOR', 'SYSTEM_ADMIN', 'BMR', 'BUSINESS_MANAGER'].includes(userRole);
	const vendorHasNoHotels = isVendor && !hasActiveFilters;

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedKeyword(filters.keyword.trim()), 300);
		return () => clearTimeout(timer);
	}, [filters.keyword]);

	useEffect(() => {
		let active = true;
		getHotels({
			page: pagination.page,
			keyword: debouncedKeyword,
			city_id: filters.city_id,
			star_rating: filters.star_rating,
		})
			.then(({ items, pagination: resultPagination }) => {
				if (!active) return;
				setHotels(items);
				setPagination((current) => ({ ...current, ...resultPagination }));
			})
			.catch((err) => {
				if (active) setError(err.response?.data?.message || 'Could not load hotels. Please try again.');
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => { active = false; };
	}, [pagination.page, debouncedKeyword, filters.city_id, filters.star_rating, refreshKey]);

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
		setToast(isVendor ? `${result.name} was submitted for approval.` : `${result.name} was created.`);
		setPagination((current) => ({ ...current, page: 1 }));
		setDebouncedKeyword('');
		setFilters((current) => ({ ...current, keyword: '' }));
		setLoading(true);
		setRefreshKey((current) => current + 1);
	};

	const handleDeleteRequest = async (hotel) => {
		setDeleteError('');
		if (isVendor) {
			try {
				await requestHotelDeleteOtp(hotel.hotel_id);
				setOtpDeleteTarget(hotel);
			} catch (err) {
				setError(err.response?.data?.message || 'Could not send the deletion OTP.');
			}
			return;
		}
		setDeleteTarget(hotel);
	};

	const handleVendorDelete = async (otp) => {
		await deleteHotel(otpDeleteTarget.hotel_id, otp);
		setHotels((current) => current.filter((hotel) => hotel.hotel_id !== otpDeleteTarget.hotel_id));
		setPagination((current) => ({ ...current, total_items: Math.max(0, current.total_items - 1) }));
		setOtpDeleteTarget(null);
		setToast(`${otpDeleteTarget.name} was deleted.`);
	};

	const handleApprove = async (hotel) => {
		try {
			const restored = await approveHotel(hotel.hotel_id);
			setHotels((current) => current.map((item) => item.hotel_id === restored.hotel_id ? restored : item));
			setToast(`${hotel.name} was approved/restored.`);
		} catch (err) {
			setError(err.response?.data?.message || 'Could not approve or restore this hotel.');
		}
	};

	const handleUpdate = async (payload) => {
		const result = await updateHotel(editingHotel.hotel_id, payload);
		setHotels((current) => current.map((hotel) => hotel.hotel_id === result.hotel_id ? result : hotel));
		setEditingHotel(null);
		setToast('Hotel details saved.');
	};

	const handleDelete = async () => {
		setDeleteError('');
		try {
			await deleteHotel(deleteTarget.hotel_id);
			setHotels((current) => current.filter((hotel) => hotel.hotel_id !== deleteTarget.hotel_id));
			setPagination((current) => ({ ...current, total_items: Math.max(0, current.total_items - 1) }));
			setToast(`${deleteTarget.name} was removed.`);
			setDeleteTarget(null);
		} catch (err) {
			setDeleteError(err.response?.data?.message || 'Hotel could not be deleted.');
		}
	};

	return (
		<section className="hotel-management">
			<header className="hotel-management__header">
				<div>
					<p className="hotel-management__eyebrow">HOTEL SYSTEM / INVENTORY</p>
					<h1>Manage hotels</h1>
					<p className="hotel-management__lede">Review property details, status, and room inventory.</p>
				</div>
				<button className="hotel-button hotel-button--primary" type="button" onClick={() => setCreateOpen(true)}>
					<span aria-hidden="true">+</span> Add New Hotel
				</button>
			</header>

			<div className="hotel-toolbar" role="search">
				<label className="hotel-search">
					<span className="sr-only">Search hotels by name, address, or hotel ID</span>
					<span className="hotel-search__icon" aria-hidden="true">⌕</span>
					<input name="keyword" value={filters.keyword} onChange={updateFilter} placeholder="Search name, address, or hotel ID" />
				</label>
				<label className="hotel-filter">
					<span>City ID</span>
					<input name="city_id" value={filters.city_id} onChange={updateFilter} placeholder="All cities" />
				</label>
				<label className="hotel-filter">
					<span>Star rating</span>
					<select name="star_rating" value={filters.star_rating} onChange={updateFilter}>
						<option value="">All ratings</option>
						{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
					</select>
				</label>
				<Link className="hotel-management__all-link" to="/hotel-management">Hotel list</Link>
			</div>

			<div className="hotel-results-heading">
				<h2>Properties <span>{pagination.total_items}</span></h2>
				<p>Showing up to 10 properties per page</p>
			</div>

			{error && <div className="hotel-notice hotel-notice--error" role="alert">{error}</div>}
			{loading ? (
				<div className="hotel-state" role="status"><span className="hotel-spinner" />Loading hotel records</div>
			) : hotels.length ? (
				<div className="hotel-grid">
					{hotels.map((hotel) => (
						<HotelCard
							key={hotel.hotel_id}
							hotel={hotel}
							canApprove={canApprove}
							onEdit={() => setEditingHotel(hotel)}
							onDelete={() => handleDeleteRequest(hotel)}
							onApprove={() => handleApprove(hotel)}
						/>
					))}
				</div>
			) : (
				<div className="hotel-state hotel-state--empty">
					<span className="hotel-state__mark" aria-hidden="true">⌂</span>
					<h2>{vendorHasNoHotels ? 'No approved hotels yet' : 'No hotels found'}</h2>
					<p>{vendorHasNoHotels ? 'New hotels appear here after Admin or Business Manager approval.' : 'Try changing the search or filters, or create a new hotel.'}</p>
				</div>
			)}

			<footer className="hotel-pagination">
				<span>Page {pagination.page} of {Math.max(pagination.total_pages, 1)}</span>
				<div>
					  <button type="button" aria-label="Previous page" disabled={pagination.page <= 1 || loading} onClick={() => { setLoading(true); setPagination((current) => ({ ...current, page: current.page - 1 })); }}>←</button>
					  <button type="button" aria-label="Next page" disabled={pagination.page >= pagination.total_pages || loading} onClick={() => { setLoading(true); setPagination((current) => ({ ...current, page: current.page + 1 })); }}>→</button>
				</div>
			</footer>

			{toast && <div className="hotel-toast" role="status">{toast}</div>}
			{createOpen && <EditHotelPopup isOpen mode="create" submitLabel={isVendor ? 'Submit for approval' : 'Create hotel'} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />}
			{editingHotel && <EditHotelPopup isOpen mode="edit" hotel={editingHotel} onClose={() => setEditingHotel(null)} onSubmit={handleUpdate} />}
			{otpDeleteTarget && <HotelDeleteOtpModal hotel={otpDeleteTarget} onClose={() => setOtpDeleteTarget(null)} onConfirm={handleVendorDelete} />}
			<Dialog
				isOpen={Boolean(deleteTarget) && !isVendor}
				onClose={() => { setDeleteTarget(null); setDeleteError(''); }}
				onConfirm={handleDelete}
				title="Delete this hotel?"
				message={deleteError || `“${deleteTarget?.name || ''}” will be removed from the management list. This cannot proceed while active bookings or occupied/reserved rooms remain.`}
				variant="confirm"
				confirmLabel="Delete hotel"
			/>
		</section>
	);
};

export default HotelManagementPage;
