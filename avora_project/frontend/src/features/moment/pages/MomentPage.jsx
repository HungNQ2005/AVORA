
import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../context/AuthContext';
import {
  getEligibleMomentBookings,
  listMoments,
  toggleMomentLike,
} from '../../../services/momentApi';

import CreateMomentDialog from '../components/CreateMomentDialog';
import MomentCard from '../components/MomentCard';

import '../MomentShared.css';
import './MomentPage.css';

const PAGE_SIZE = 10;

/* ==========================================
   LOADING SKELETON
========================================== */

const MomentSkeleton = () => (
  <div className="moment-page__skeleton" aria-hidden="true">
    <div className="moment-page__skeleton-image">
      <span />
    </div>
    <div className="moment-page__skeleton-content">
      <span className="moment-page__skeleton-line" />
      <span className="moment-page__skeleton-line moment-page__skeleton-line--short" />
      <div className="moment-page__skeleton-author">
        <span className="moment-page__skeleton-avatar" />
        <span className="moment-page__skeleton-line" />
      </div>
    </div>
  </div>
);

const MomentPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [moments, setMoments] = useState([]);
  const [pagination, setPagination] = useState({
    page: 0,
    total_pages: 0,
    total: 0,
  });

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [likeLoadingId, setLikeLoadingId] = useState('');

  const [eligibleBookings, setEligibleBookings] = useState([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingRetry, setBookingRetry] = useState(0);

  const [showCreate, setShowCreate] = useState(false);

  /* ==========================================
     LOAD MOMENTS
  ========================================== */

  const loadPage = useCallback(async (page, append) => {
    if (append) setLoadingMore(true);

    try {
      const result = await listMoments({
        page,
        limit: PAGE_SIZE,
      });

      setError('');

      setMoments((current) => {
        if (!append) return result.items || [];

        const byId = new Map(
          current.map((moment) => [moment.moment_id, moment])
        );

        (result.items || []).forEach((moment) => {
          byId.set(moment.moment_id, moment);
        });

        return [...byId.values()];
      });

      setPagination(
        result.pagination || {
          page,
          total_pages: 0,
          total: 0,
        }
      );
    } catch (loadError) {
      setError(
        loadError.message || 'Không thể tải danh sách moment.'
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    listMoments({
      page: 1,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (!active) return;

        setMoments(result.items || []);

        setPagination(
          result.pagination || {
            page: 1,
            total_pages: 0,
            total: 0,
          }
        );
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError.message || 'Không thể tải danh sách moment.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  /* ==========================================
     ELIGIBLE BOOKINGS
  ========================================== */

  useEffect(() => {
    if (authLoading || !user) return undefined;

    let active = true;

    getEligibleMomentBookings()
      .then((bookings) => {
        if (active) {
          setEligibleBookings(
            Array.isArray(bookings) ? bookings : []
          );
        }
      })
      .catch((loadError) => {
        if (active) {
          setBookingError(
            loadError.message ||
            'Không thể kiểm tra đơn đặt phòng đủ điều kiện.'
          );
        }
      })
      .finally(() => {
        if (active) setBookingsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [authLoading, bookingRetry, user]);

  /* ==========================================
     LIKE MOMENT
  ========================================== */

  const handleLike = async (moment) => {
    if (!user) {
      navigate('/signin', {
        state: {
          from: `${location.pathname}${location.search}`,
        },
      });

      return;
    }

    if (likeLoadingId) return;

    setLikeLoadingId(moment.moment_id);
    setError('');

    try {
      const result = await toggleMomentLike(moment.moment_id);

      setMoments((current) =>
        current.map((item) =>
          item.moment_id === moment.moment_id
            ? {
              ...item,
              liked_by_me: result.liked,
              likes_count: result.likes_count,
            }
            : item
        )
      );
    } catch (likeError) {
      setError(
        likeError.message || 'Không thể cập nhật lượt thích.'
      );
    } finally {
      setLikeLoadingId('');
    }
  };

  /* ==========================================
     CREATE MOMENT
  ========================================== */

  const handleCreated = (moment) => {
    setShowCreate(false);

    setEligibleBookings((current) =>
      current.filter(
        (booking) => booking.booking_id !== moment.booking_id
      )
    );

    navigate(`/moment/${moment.moment_id}`);
  };

  /* ==========================================
     RENDER
  ========================================== */

  return (
    <main className="moment-page">

      {/* ======================================
          HERO SECTION
      ======================================= */}

      <header className="moment-page__header">

        <div className="moment-page__hero-decoration" aria-hidden="true">
          <span className="moment-page__hero-ring moment-page__hero-ring--one" />
          <span className="moment-page__hero-ring moment-page__hero-ring--two" />
          <span className="moment-page__hero-glow" />
        </div>

        <div className="moment-page__hero-content">

          {/* <div className="moment-page__eyebrow">
            <span className="moment-page__eyebrow-line" />
            AVORA COMMUNITY
            <span className="moment-page__eyebrow-line" />
          </div> */}

          <h1>
            Mỗi chuyến đi
            <br />
            <span>là một câu chuyện để kể.</span>
          </h1>

          <p className="moment-page__hero-description">
            Khám phá những khoảnh khắc đáng nhớ, chia sẻ trải nghiệm
            và lưu giữ những câu chuyện tuyệt vời trong mỗi chuyến đi.
          </p>

          <div className="moment-page__hero-bottom">

            <div className="moment-page__hero-meta">
              <span className="moment-page__hero-star">✦</span>

              <span>
                Những Kỷ Niệm Đáng Nhớ
              </span>
            </div>

            {user && bookingsLoaded && eligibleBookings.length > 0 && (
              <button
                type="button"
                className="moment-page__create-button"
                onClick={() => setShowCreate(true)}
              >
                <span className="moment-page__create-icon">＋</span>
                <span>Tạo khoảnh khắc</span>
              </button>
            )}

          </div>
        </div>
      </header>

      {/* ======================================
          BOOKING NOTICE
      ======================================= */}

      {bookingError && (
        <div
          className="moment-page__notice"
          role="status"
        >
          <div className="moment-page__notice-icon">!</div>

          <div className="moment-page__notice-content">
            <strong>Không thể kiểm tra điều kiện tạo Moment</strong>
            <span>{bookingError}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setBookingsLoaded(false);
              setBookingError('');
              setBookingRetry((retry) => retry + 1);
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ======================================
          ERROR MESSAGE
      ======================================= */}

      {error && (
        <div
          className="moment-page__error"
          role="alert"
        >
          <span className="moment-page__error-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      {/* ======================================
          GALLERY HEADING
      ======================================= */}

      {!loading && moments.length > 0 && (
        <section className="moment-page__gallery-header">

          <div>
            <span className="moment-page__section-eyebrow">
              Khám Phá và Chia Sẻ
            </span>

            <h2>
              Những câu chuyện đáng nhớ
            </h2>

            <p>
              Mỗi khoảnh khắc là một hành trình riêng.
            </p>
          </div>

          {pagination.total > 0 && (
            <div className="moment-page__total">
              <span className="moment-page__total-number">
                {pagination.total.toLocaleString('vi-VN')}
              </span>
              <span>Khoảnh khắc</span>
            </div>
          )}

        </section>
      )}

      {/* ======================================
          LOADING STATE
      ======================================= */}

      {loading ? (
        <section
          className="moment-grid moment-grid--loading"
          aria-label="Đang tải khoảnh khắc"
          aria-busy="true"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <MomentSkeleton key={index} />
          ))}
        </section>
      ) : moments.length > 0 ? (

        /* ======================================
           MOMENT GALLERY
        ======================================= */

        <section
          className="moment-grid"
          aria-label="Danh sách khoảnh khắc"
        >
          {moments.map((moment) => (
            <MomentCard
              key={moment.moment_id}
              moment={moment}
              onLike={handleLike}
              likeLoading={
                likeLoadingId === moment.moment_id
              }
            />
          ))}
        </section>

      ) : (

        /* ======================================
           EMPTY STATE
        ======================================= */

        <section className="moment-page__empty">

          <div className="moment-page__empty-art">
            <span className="moment-page__empty-star">✦</span>
            <span className="moment-page__empty-orbit" />
            <span className="moment-page__empty-orbit moment-page__empty-orbit--inner" />
          </div>

          <span className="moment-page__empty-eyebrow">
            YOUR STORY STARTS HERE
          </span>

          <h2>
            Chưa có khoảnh khắc nào
          </h2>

          <p>
            Những hành trình tuyệt vời luôn bắt đầu bằng một câu chuyện.
            Hãy quay lại khám phá khi cộng đồng AVORA có thêm những
            khoảnh khắc mới nhé.
          </p>

          <span className="moment-page__empty-decoration">
            AVORA MOMENTS
          </span>

        </section>
      )}

      {/* ======================================
          LOAD MORE
      ======================================= */}

      {!loading && moments.length > 0 && (
        <div className="moment-page__more">

          {pagination.page < pagination.total_pages ? (
            <>
              <span className="moment-page__more-caption">
                Đang hiển thị {moments.length.toLocaleString('vi-VN')}
                {' / '}
                {pagination.total.toLocaleString('vi-VN')} khoảnh khắc
              </span>

              <button
                type="button"
                className="moment-page__more-button"
                onClick={() => loadPage(pagination.page + 1, true)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <span className="moment-page__spinner" />
                    Đang tải khoảnh khắc...
                  </>
                ) : (
                  <>
                    Khám phá thêm
                    <span aria-hidden="true">↓</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="moment-page__end">
              <span>✦</span>
              Bạn đã khám phá tất cả khoảnh khắc hiện có.
            </div>
          )}

        </div>
      )}

      {/* ======================================
          CREATE DIALOG
      ======================================= */}

      {showCreate && (
        <CreateMomentDialog
          bookings={eligibleBookings}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

    </main>
  );
};

export default MomentPage;
