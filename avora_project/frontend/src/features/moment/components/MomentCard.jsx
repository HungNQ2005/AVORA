
import React from 'react';
import { Link } from 'react-router-dom';
import { HeartIcon } from '../../../common/components/icons';

import '../MomentShared.css';
import './MomentCard.css';

const MESSAGE_LIMIT = 150;

const formatMomentDate = (value) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const MomentCard = ({ moment, onLike, likeLoading = false }) => {
  const message = String(moment.message ?? '').trim();

  const excerpt =
    message.length > MESSAGE_LIMIT
      ? `${message.slice(0, MESSAGE_LIMIT).trimEnd()}...`
      : message;

  const creatorName = moment.creator_name || 'Khách hàng Avora';

  const avatarInitial = creatorName.charAt(0).toUpperCase() || 'A';

  const createdDate = formatMomentDate(moment.created_at);

  const likesCount = Math.max(0, Number(moment.likes_count) || 0);

  const isLiked = Boolean(moment.liked_by_me);
  const isHidden = Boolean(moment.is_hidden);

  const handleLike = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!likeLoading && onLike) {
      onLike(moment);
    }
  };

  return (
    <article className="moment-card">

      <Link
        className="moment-card__link"
        to={`/moment/${moment.moment_id}`}
        aria-label={`Xem khoảnh khắc của ${creatorName}`}
      >

        {/* Full-bleed image */}
        <div className="moment-card__image-wrap">

          {moment.image_url && (
            <img
              className="moment-card__image"
              src={moment.image_url}
              alt={`Khoảnh khắc tại ${moment.hotel_name || 'AVORA'}`}
              loading="lazy"
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}

          {/* Dark gradient overlay */}
          <div className="moment-card__overlay">

            {/* Top information */}
            <div className="moment-card__top">

              {isHidden && (
                <span className="moment-card__hidden">
                  <span className="moment-card__status-dot" />
                  Riêng tư
                </span>
              )}

            </div>

            {/* Bottom information */}
            <div className="moment-card__content">

              {moment.hotel_name && (
                <div className="moment-card__hotel">
                  <h3 className="moment-card__hotel-name">
                    {moment.hotel_name}
                  </h3>
                </div>
              )}

              <p className="moment-card__message">
                {excerpt || 'Một khoảnh khắc đáng nhớ tại AVORA.'}
              </p>

              <div className="moment-card__author">

                <div className="moment-card__avatar">

                  <span className="moment-card__avatar-fallback">
                    {avatarInitial}
                  </span>

                  {moment.creator_avatar_url && (
                    <img
                      src={moment.creator_avatar_url}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  )}

                </div>

                <div className="moment-card__author-info">

                  <span className="moment-card__author-name">
                    {creatorName}
                  </span>

                </div>

                {createdDate && (
                  <time
                    className="moment-card__date"
                    dateTime={moment.created_at}
                  >
                    {createdDate}
                  </time>
                )}

              </div>

            </div>
          </div>
        </div>
      </Link>

      {/* Independent Like action */}
      {!isHidden && (
        <button
          type="button"
          className={`moment-card__like${isLiked ? ' is-liked' : ''}`}
          aria-label={
            isLiked
              ? `Bỏ thích khoảnh khắc, ${likesCount} lượt thích`
              : `Thích khoảnh khắc, ${likesCount} lượt thích`
          }
          aria-pressed={isLiked}
          disabled={likeLoading}
          onClick={handleLike}
        >
          <HeartIcon size={17} filled={isLiked} />

          <span>
            {likesCount.toLocaleString('vi-VN')}
          </span>
        </button>
      )}

    </article>
  );
};

export default MomentCard;
