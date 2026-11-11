
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../../common/components/icons';
import { getBannerMoments } from '../../../services/momentApi';
import './MomentBanner.css';

const MomentBanner = () => {
  const [moments, setMoments] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let active = true;

    getBannerMoments()
      .then((items) => {
        if (active) {
          setMoments(Array.isArray(items) ? items.slice(0, 5) : []);
        }
      })
      .catch((error) => {
        console.error('Could not load homepage moments:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (moments.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % moments.length);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [moments.length]);

  if (!moments.length) return null;

  const moment = moments[activeIndex];

  const move = (direction) => {
    setActiveIndex((index) => (
      (index + direction + moments.length) % moments.length
    ));
  };

  return (
    <section
      className="moment-banner-section"
      aria-label="Khoảnh khắc du lịch từ cộng đồng AVORA"
    >
      <div className="avora-homepage__container">
        <div className="moment-banner">

          {/* Full-bleed featured image */}
          <Link
            key={moment.moment_id}
            className="moment-banner__visual"
            to={`/moment/${moment.moment_id}`}
            aria-label={`Xem moment tại ${moment.hotel_name || 'AVORA'}`}
          >
            <img
              src={moment.image_url}
              alt={moment.hotel_name || 'Khoảnh khắc du lịch'}
            />
          </Link>

          {/* Cinematic overlays */}
          <div className="moment-banner__shade" aria-hidden="true" />
          <div className="moment-banner__decoration" aria-hidden="true">
            <span className="moment-banner__decoration-ring" />
            {/* <span className="moment-banner__decoration-star">✳</span> */}
          </div>

          {/* Editorial content */}
          <div className="moment-banner__content">
            {/* <div className="moment-banner__topline">
              <span>THE AVORA JOURNAL</span>
              <span>COMMUNITY STORIES</span>
            </div> */}

            <div className="moment-banner__story">
              <span className="moment-banner__kicker">
                Hơn cả một hành trình
              </span>

              <h2>
                Chuyến đi đẹp,
                <br />
                <em>khoảnh khắc</em>
                <br />
                đáng nhớ.
              </h2>

              <span className="moment-banner__title-mark" />

              <p
                className="moment-banner__description"
                key={moment.moment_id}
              >
                {moment.message}
              </p>

              <div className="moment-banner__author">
                <span className="moment-banner__author-line" />
                <div>
                  <strong>
                    {moment.hotel_name || 'Một khoảnh khắc đáng nhớ'}
                  </strong>
                  <small>
                    {moment.creator_name || 'AVORA Traveler'}
                  </small>
                </div>
              </div>

              <Link
                to={`/moment/${moment.moment_id}`}
                className="moment-banner__cta"
              >
                <span>Khám phá câu chuyện</span>
                <span className="moment-banner__cta-arrow">↗</span>
              </Link>
            </div>
          </div>

          {/* Slider navigation */}
          {moments.length > 1 && (
            <div className="moment-banner__controls">
              <div className="moment-banner__pagination">
                <span className="moment-banner__current">
                  {String(activeIndex + 1).padStart(2, '0')}
                </span>
                <span className="moment-banner__pagination-line" />
                <span className="moment-banner__total">
                  {String(moments.length).padStart(2, '0')}
                </span>
              </div>

              <div className="moment-banner__arrows">
                <button
                  type="button"
                  onClick={() => move(-1)}
                  aria-label="Moment trước"
                >
                  <ChevronLeftIcon size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => move(1)}
                  aria-label="Moment tiếp theo"
                >
                  <ChevronRightIcon size={18} />
                </button>
              </div>
            </div>
          )}

          <span className="moment-banner__frame" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
};

export default MomentBanner;
