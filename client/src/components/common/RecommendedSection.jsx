import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { normalizeImageUrl, starsArray } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/pages/recommended.css';

const PLACEHOLDER = 'https://placehold.co/300x300/e2e8f0/1f2b3e?text=Product';

export default function RecommendedSection() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch('/api/ads/recommendations/personal?limit=15');
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setProducts(res.data);
        } else {
          setProducts([]);
        }
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  
  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const timer = setTimeout(updateScrollState, 100);
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [products]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.rec-card')?.offsetWidth || 280;
    const amount = cardWidth * 3;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  
  if (!loading && products.length === 0) return null;

  return (
    <section className="rec-section" id="recommended-for-you">
      <div className="rec-header">
        <div className="rec-title-group">
          <span className="rec-icon">✦</span>
          <h2 className="rec-title">Recommended for You</h2>
        </div>
        <p className="rec-subtitle">
          Handpicked products based on your interests and purchase history
        </p>
      </div>

      {loading ? (
        <div className="rec-loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <div className="rec-skeleton" key={i}>
              <div className="rec-skeleton-img" />
              <div className="rec-skeleton-lines">
                <div className="rec-skeleton-line w80" />
                <div className="rec-skeleton-line w50" />
                <div className="rec-skeleton-line w60" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rec-carousel-wrapper">
          
          <button
            className={`rec-arrow rec-arrow-left ${canScrollLeft ? 'visible' : ''}`}
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          
          <div className="rec-scroll" ref={scrollRef}>
            {products.map((ad) => {
              const imgSrc = ad.images?.length > 0
                ? normalizeImageUrl(ad.images[0], PLACEHOLDER)
                : PLACEHOLDER;
              const stars = starsArray(ad.avgRating || 0);
              const sellerName = ad.seller?.fullName || 'Unknown';
              const sellerRatingVal = ad.seller?.avgSellerRating
                ? parseFloat(ad.seller.avgSellerRating).toFixed(1)
                : '—';

              return (
                <Link to={`/product/${ad.id}`} className="rec-card" key={ad.id}>
                  <div className="rec-card-img">
                    <img src={imgSrc} alt={ad.title} loading="lazy" />
                    {ad.category && (
                      <span className="rec-card-badge">{ad.category}</span>
                    )}
                  </div>
                  <div className="rec-card-body">
                    <span className="rec-card-name">{ad.title}</span>
                    <span className="rec-card-price">
                      EGP {parseFloat(ad.price).toFixed(2)}
                    </span>
                    <div className="rec-card-stars">
                      {stars.map((s) => (
                        <span key={s.index} className={s.filled ? '' : 'empty'}>★</span>
                      ))}
                    </div>
                    <span className="rec-card-seller">
                      <span
                        className={`seller-name-link${user?.id === ad.seller?.id ? ' disabled' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (user?.id === ad.seller?.id) return;
                          navigate(`/seller/${ad.seller?.id}`);
                        }}
                      >
                        {sellerName}
                      </span>
                      <span className="rec-mini-star">★</span>
                      {sellerRatingVal}
                      {ad.seller?.trustScore != null && (() => {
                        const ts = parseFloat(ad.seller.trustScore);
                        if (ts >= 80) return <span className="trust-tag trust-tag-good">✓ Trusted</span>;
                        if (ts >= 60) return <span className="trust-tag trust-tag-ok">✓</span>;
                        if (ts < 40) return <span className="trust-tag trust-tag-warn">⚠</span>;
                        return null;
                      })()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          
          <button
            className={`rec-arrow rec-arrow-right ${canScrollRight ? 'visible' : ''}`}
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
