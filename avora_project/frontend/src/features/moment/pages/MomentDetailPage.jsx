
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { HeartIcon } from '../../../common/components/icons';
import { useAuth } from '../../../context/AuthContext';
import {
  getMoment,
  setMomentVisibility,
  toggleMomentLike,
} from '../../../services/momentApi';
import EditMomentDialog from '../components/EditMomentDialog';
import '../MomentShared.css';
import './MomentDetailPage.css';

const MomentDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [detail, setDetail] = useState({
    id: null,
    moment: null,
    error: '',
  });

  const [likeLoading, setLikeLoading] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    let active = true;

    getMoment(id)
      .then((data) => {
        if (active) setDetail({ id, moment: data, error: '' });
      })
      .catch((loadError) => {
        if (active) {
          setDetail({
            id,
            moment: null,
            error: loadError.message || 'Không thể tải moment.',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  const isCurrentDetail = detail.id === id;
  const moment = isCurrentDetail ? detail.moment : null;
  const loading = !isCurrentDetail;
  const error = isCurrentDetail ? detail.error : '';

  const isOwner = Boolean(
    user?.user_id &&
    moment &&
    String(user.user_id) === String(moment.user_id)
  );

  const handleLike = async () => {
    if (!user) {
      navigate('/signin', {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }

    if (likeLoading || !moment) return;

    setLikeLoading(true);
    setDetail((current) => ({ ...current, error: '' }));

    try {
      const result = await toggleMomentLike(moment.moment_id);

      setDetail((current) => ({
        ...current,
        moment: {
          ...current.moment,
          liked_by_me: result.liked,
          likes_count: result.likes_count,
        },
      }));
    } catch (likeError) {
      setDetail((current) => ({
        ...current,
        error: likeError.message || 'Không thể cập nhật lượt thích.',
      }));
    } finally {
      setLikeLoading(false);
    }
  };

  const handleVisibility = async () => {
    if (!moment || !isOwner || visibilityLoading) return;

    const nextHidden = !moment.is_hidden;

    if (
      nextHidden &&
      !window.confirm(
        'Ẩn moment này? Người khác sẽ không còn thấy bài đăng, nhưng bạn có thể hiển thị lại sau.'
      )
    ) {
      return;
    }

    setVisibilityLoading(true);
    setDetail((current) => ({ ...current, error: '' }));

    try {
      await setMomentVisibility(moment.moment_id, nextHidden);

      setDetail((current) => ({
        ...current,
        moment: {
          ...current.moment,
          is_hidden: nextHidden,
        },
      }));
    } catch (visibilityError) {
      setDetail((current) => ({
        ...current,
        error:
          visibilityError.message ||
          'Không thể thay đổi trạng thái moment.',
      }));
    } finally {
      setVisibilityLoading(false);
    }
  };

  const handleUpdated = (updatedMoment) => {
    setDetail((current) => ({
      ...current,
      moment: updatedMoment,
      error: '',
    }));

    setShowEdit(false);
  };

  if (loading) {
    return (
      <main className="moment-detail-page">
        <div className="moment-detail-loading">
          <div className="moment-detail-loading__image" />
          <div className="moment-detail-loading__content">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </main>
    );
  }

  if (error && !moment) {
    return (
      <main className="moment-detail-page">
        <div className="moment-detail-state">
          {/* <div className="moment-detail-state__icon">✦</div> */}
          <span className="moment-eyebrow">AVORA MOMENTS</span>
          <h1>Không thể mở khoảnh khắc này</h1>
          <p>{error}</p>
          <Link to="/moment" className="moment-detail-state__link">
            <span>←</span> Quay lại Moment
          </Link>
        </div>
      </main>
    );
  }

  if (!moment) return null;

  return (
    <main className="moment-detail-page">
      <div className="moment-detail-topbar">
        <Link to="/moment" className="moment-detail-page__back">
          <span className="moment-detail-page__back-icon">←</span>
          <span>Tất cả khoảnh khắc</span>
        </Link>

        {/* <span className="moment-detail-topbar__brand">
          AVORA <span>JOURNAL</span>
        </span> */}
      </div>

      {error && (
        <div className="moment-detail-error" role="alert">
          <span>!</span>
          {error}
        </div>
      )}

      {moment.is_hidden && isOwner && (
        <div className="moment-hidden-notice" role="status">
          <span className="moment-hidden-notice__icon">◈</span>
          <div>
            <strong>Khoảnh khắc đang được ẩn</strong>
            <p>
              Chỉ bạn có thể nhìn thấy bài đăng này. Bạn có thể hiển thị lại
              bất cứ lúc nào.
            </p>
          </div>
        </div>
      )}

      <article className="moment-detail">
        <section className="moment-detail__visual">
          <div className="moment-detail__image">
            <img
              src={moment.image_url}
              alt={`Khoảnh khắc tại ${moment.hotel_name || 'AVORA'}`}
            />
            <div className="moment-detail__image-overlay" />

            {/* <div className="moment-detail__image-caption">
              <span className="moment-detail__image-caption-line" />
              <span>MEMORIES WORTH KEEPING</span>
            </div> */}

            {moment.is_hidden && (
              <span className="moment-detail__image-status">
                PRIVATE MOMENT
              </span>
            )}
          </div>

          {/* <div className="moment-detail__visual-footer">
            <span>AVORA TRAVEL JOURNAL</span>
            <span>EST. 2026</span>
          </div> */}
        </section>

        <section className="moment-detail__content">
          <div className="moment-detail__content-top">
            <span className="moment-eyebrow">
              AVORA MOMENTS
              {moment.hotel_name && (
                <>
                  <span className="moment-detail__eyebrow-divider">/</span>
                  {moment.hotel_name}
                </>
              )}
            </span>

            {/* <span className="moment-detail__ornament">✳</span> */}
          </div>

          {/* <div className="moment-detail__story">
            <span className="moment-detail__story-label">
              A TRAVEL STORY
            </span>

            <h1 className="moment-detail__title">
              Every journey leaves
              <br />
              something behind.
            </h1>
          </div> */}

          <div className="moment-detail__author">
            <div className="moment-detail__author-avatar">
              {moment.creator_avatar_url ? (
                <img src={moment.creator_avatar_url} alt="" />
              ) : (
                <span>
                  {moment.creator_name?.slice(0, 1) || 'A'}
                </span>
              )}
            </div>

            <div className="moment-detail__author-info">
              <strong>{moment.creator_name || 'AVORA Traveler'}</strong>
              <time dateTime={moment.created_at}>
                {moment.created_at
                  ? new Date(moment.created_at).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : ''}
              </time>
            </div>

            {/* <span className="moment-detail__author-mark">✦</span> */}
          </div>

          <div className="moment-detail__separator">
            <span />
            <span>✳</span>
            <span />
          </div>

          <div className="moment-detail__message">
            {moment.message}
          </div>

          <div className="moment-detail__content-bottom">
            <div className="moment-detail__actions">
              {!moment.is_hidden && (
                <button
                  type="button"
                  className={`moment-detail__like ${moment.liked_by_me ? 'is-liked' : ''
                    }`}
                  onClick={handleLike}
                  disabled={likeLoading}
                  aria-pressed={Boolean(moment.liked_by_me)}
                  aria-label="Thích khoảnh khắc"
                >
                  <span className="moment-detail__like-icon">
                    <HeartIcon
                      size={19}
                      filled={Boolean(moment.liked_by_me)}
                    />
                  </span>

                  <span className="moment-detail__like-count">
                    {moment.likes_count || 0}
                  </span>

                  <span className="moment-detail__like-label">
                    {moment.liked_by_me ? 'Đã yêu thích' : 'Yêu thích'}
                  </span>
                </button>
              )}

              {isOwner && (
                <div className="moment-owner-actions">
                  <button
                    type="button"
                    className="moment-button moment-button--secondary"
                    onClick={() => setShowEdit(true)}
                  >
                    Chỉnh sửa
                  </button>

                  <button
                    type="button"
                    className={`moment-button ${moment.is_hidden
                        ? 'moment-button--primary'
                        : 'moment-button--hide'
                      }`}
                    onClick={handleVisibility}
                    disabled={visibilityLoading}
                  >
                    {visibilityLoading
                      ? 'Đang cập nhật…'
                      : moment.is_hidden
                        ? 'Hiển thị lại'
                        : 'Ẩn Bài Đăng'}
                  </button>
                </div>
              )}
            </div>

            {/* <div className="moment-detail__signature">
              <span>COLLECT MOMENTS.</span>
              <span>NOT THINGS.</span>
            </div> */}
          </div>
        </section>
      </article>

      {showEdit && (
        <EditMomentDialog
          moment={moment}
          onClose={() => setShowEdit(false)}
          onUpdated={handleUpdated}
        />
      )}
    </main>
  );
};

export default MomentDetailPage;
