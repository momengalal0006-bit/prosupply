import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { normalizeImageUrl, starsArray, formatPrice } from '../utils/helpers';
import Spinner from '../components/common/Spinner';
import Pagination from '../components/common/Pagination';
import { useAuth } from '../hooks/useAuth';
import '../styles/pages/seller-profile.css';
import '../styles/pages/category.css';
import '../styles/pages/product-detail.css';

const PLACEHOLDER = 'https://placehold.co/300x300/e2e8f0/1f2b3e?text=Product';

function TrustBadge({ score }) {
  if (score === null || score === undefined) return null;
  const s = parseFloat(score);
  let label, className;
  if (s >= 80) { label = 'Highly Trusted'; className = 'trust-high'; }
  else if (s >= 60) { label = 'Trusted'; className = 'trust-good'; }
  else if (s >= 40) { label = 'Moderate'; className = 'trust-moderate'; }
  else if (s >= 20) { label = 'Low Trust'; className = 'trust-low'; }
  else { label = 'Flagged'; className = 'trust-flagged'; }
  return <span className={`trust-badge ${className}`} title={`Trust Score: ${s}/100`}>🛡️ {label}</span>;
}

export default function SellerProfilePage() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [seller, setSeller] = useState(null);
  const [ads, setAds] = useState([]);
  const [adsPagination, setAdsPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  const [sortBy, setSortBy] = useState('newest');
  const [adsPage, setAdsPage] = useState(1);

  
  const [comparisonProducts, setComparisonProducts] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [compareError, setCompareError] = useState('');

  const loadData = useCallback(async (page = 1) => {
    const res = await apiFetch(`/api/sellers/${sellerId}/profile?page=${page}&limit=12`);
    if (res && res.success) {
      setSeller(res.data.seller);
      setAds(res.data.ads.items || []);
      setAdsPagination(res.data.ads.pagination || { page: 1, totalPages: 1, totalItems: 0 });
      setReviews(res.data.reviews || []);
      setReviewStats(res.data.reviewStats || { average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
      setError(false);
    } else {
      setError(true);
    }
    setLoading(false);
  }, [sellerId]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setSeller(null);
    setAds([]);
    setAdsPage(1);
    setComparisonProducts([]);
    setShowComparison(false);
    setCompareError('');
    loadData(1);
  }, [sellerId, loadData]);

  
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (!authLoading && user && user.role !== 'user') {
      navigate(user.role === 'admin' ? '/admin' : '/');
    }
  }, [user, authLoading, navigate]);

  const selectedCount = comparisonProducts.length;
  const canCompare = selectedCount >= 2;

  const toComparisonShape = (ad) => ({
    id: ad.id,
    name: ad.title,
    brand: ad.brand || '—',
    price: Number(ad.price) || 0,
    rating: Number(ad.avgRating) || 0,
    category: ad.category || '—',
    origin: ad.countryOfOrigin || '—',
    warrantyMonths: Number(ad.warrantyMonths) || 0,
    specs: ad.specs && typeof ad.specs === 'object' ? ad.specs : {},
    availability: Number(ad.quantity) > 0 ? 'In stock' : 'Out of stock',
    quantity: Number(ad.quantity) || 0,
  });

  function toggleComparisonProduct(ad) {
    const exists = comparisonProducts.some((p) => p.id === ad.id);
    if (exists) {
      setComparisonProducts((prev) => prev.filter((p) => p.id !== ad.id));
      setCompareError('');
      return;
    }

    if (comparisonProducts.length >= 3) {
      setCompareError('You can compare up to 3 products.');
      return;
    }

    setComparisonProducts((prev) => [...prev, toComparisonShape(ad)]);
    setCompareError('');
  }

  function removeFromComparison(productId) {
    setComparisonProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  const bestPrice = comparisonProducts.length > 0 ? Math.min(...comparisonProducts.map((p) => p.price)) : null;
  const bestRating = comparisonProducts.length > 0 ? Math.max(...comparisonProducts.map((p) => p.rating)) : null;
  const bestQuantity = comparisonProducts.length > 0 ? Math.max(...comparisonProducts.map((p) => p.quantity)) : null;

  const specKeys = [...new Set(comparisonProducts.flatMap((p) => Object.keys(p.specs || {})))];

  function handlePageChange(newPage) {
    setAdsPage(newPage);
    loadData(newPage);
    
    document.getElementById('seller-listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  
  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
      case 'highest': return b.rating - a.rating;
      case 'lowest': return a.rating - b.rating;
      default: return new Date(b.createdAt) - new Date(a.createdAt); 
    }
  });

  
  if (loading || authLoading || !user || user.role !== 'user') {
    return (
      <>
        <div className="seller-profile-header">
          <div className="seller-profile-header-inner">
            <div className="seller-avatar seller-profile-skeleton" style={{ background: 'rgba(255,255,255,0.08)' }}></div>
            <div className="seller-header-info">
              <div className="seller-profile-skeleton" style={{ height: '32px', width: '220px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', marginBottom: '0.5rem' }}></div>
              <div className="seller-profile-skeleton" style={{ height: '20px', width: '160px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px' }}></div>
            </div>
          </div>
        </div>
        <div className="seller-profile-body">
          <Spinner text={authLoading ? "Verifying access..." : "Loading seller profile..."} />
        </div>
      </>
    );
  }

  
  if (error || !seller) {
    return (
      <div className="empty-state">
        <h2>Seller not found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>This seller profile doesn't exist or is no longer available.</p>
        <Link to="/" style={{ color: 'var(--cyan-bright)', fontWeight: 700 }}>← Back to Home</Link>
      </div>
    );
  }

  const initials = seller.fullName ? seller.fullName.charAt(0) : '?';
  const memberSince = new Date(seller.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  const overallStars = starsArray(reviewStats.average);

  return (
    <>
      
      <div className="seller-profile-header">
        <div className="seller-profile-header-inner">
          <div className="seller-avatar">{initials}</div>
          <div className="seller-header-info">
            <h1 className="seller-header-name">{seller.fullName}</h1>
            <div className="seller-header-meta">
              <span className="seller-member-since">📅 Member since {memberSince}</span>
              <div className="seller-header-rating">
                <span className="rating-star">★</span>
                <span className="rating-value">
                  {seller.avgSellerRating ? parseFloat(seller.avgSellerRating).toFixed(1) : '—'}
                </span>
                <span className="rating-count">({reviewStats.total} reviews)</span>
              </div>
              <TrustBadge score={seller.trustScore} />
            </div>
          </div>
        </div>
      </div>

      <div className="seller-profile-body">
        
        <section className="seller-section" id="seller-listings">
          <h2 className="seller-section-heading">
            📦 Active Listings
            <span className="section-count">{adsPagination.totalItems}</span>
          </h2>

          {ads.length === 0 ? (
            <div className="seller-empty-state">
              <span className="empty-icon">📭</span>
              <p>No active listings</p>
              <small>This seller doesn't have any active listings right now.</small>
            </div>
          ) : (
            <>
              {selectedCount > 0 && (
                <div className="compare-toolbar">
                  <span className="compare-toolbar-text">
                    {selectedCount} selected (max 3)
                  </span>
                  <div className="compare-toolbar-actions">
                    <button
                      className="compare-btn clear"
                      type="button"
                      onClick={() => {
                        setComparisonProducts([]);
                        setShowComparison(false);
                        setCompareError('');
                      }}
                    >
                      Clear
                    </button>
                    <button
                      className="compare-btn"
                      type="button"
                      disabled={!canCompare}
                      onClick={() => setShowComparison(true)}
                    >
                      Compare
                    </button>
                  </div>
                </div>
              )}
              {compareError && <p className="compare-error">{compareError}</p>}
              <div className="products-grid">
                {ads.map((ad) => {
                  const imgSrc = ad.images?.length > 0 ? normalizeImageUrl(ad.images[0], PLACEHOLDER) : PLACEHOLDER;
                  const sellerName = ad.seller?.fullName || seller.fullName;
                  const sellerRatingVal = ad.seller?.avgSellerRating
                    ? parseFloat(ad.seller.avgSellerRating).toFixed(1)
                    : seller.avgSellerRating
                      ? parseFloat(seller.avgSellerRating).toFixed(1)
                      : '—';
                  const stars = starsArray(ad.avgRating || 0);

                  return (
                    <Link to={`/product/${ad.id}`} className="product-card" key={ad.id}>
                      <div className="product-img-wrap">
                        <label
                          className="compare-check"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={comparisonProducts.some((p) => p.id === ad.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleComparisonProduct(ad)}
                          />
                          Compare
                        </label>
                        <img src={imgSrc} alt={ad.title} loading="lazy" />
                      </div>
                      <div className="product-info">
                        <span className="product-name">{ad.title}</span>
                        <span className="product-price">EGP {parseFloat(ad.price).toFixed(2)}</span>
                        <div className="product-stars">
                          {stars.map((s) => (
                            <span key={s.index} className={s.filled ? '' : 'empty'}>★</span>
                          ))}
                        </div>
                        <span className="seller-badge">
                          <span
                            className={`seller-name-link${user?.id === (ad.seller?.id || sellerId) ? ' disabled' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (user?.id === (ad.seller?.id || sellerId)) return;
                              navigate(`/seller/${ad.seller?.id || sellerId}`);
                            }}
                          >
                            {sellerName}
                          </span>
                          {' '}<span className="mini-star">★</span> {sellerRatingVal}
                          {(ad.seller?.trustScore != null) && (() => {
                            const ts = parseFloat(ad.seller.trustScore);
                            let label, cls;
                            if (ts >= 80) { label = '✓ Trusted'; cls = 'trust-tag-good'; }
                            else if (ts >= 60) { label = '✓'; cls = 'trust-tag-ok'; }
                            else if (ts < 40) { label = '⚠'; cls = 'trust-tag-warn'; }
                            else return null;
                            return <span className={`trust-tag ${cls}`}>{label}</span>;
                          })()}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <Pagination
                page={adsPage}
                totalPages={adsPagination.totalPages}
                onPageChange={handlePageChange}
              />
              {showComparison && (
                <section className="compare-panel" style={{ marginTop: '2rem' }}>
                  <div className="compare-panel-head">
                    <h3>Product Comparison</h3>
                    <button
                      type="button"
                      className="compare-btn clear"
                      onClick={() => setShowComparison(false)}
                    >
                      Close
                    </button>
                  </div>

                  {comparisonProducts.length < 2 ? (
                    <p className="compare-empty">Select at least 2 products to compare.</p>
                  ) : (
                    <div className="compare-table-wrap">
                      <table className="compare-table">
                        <thead>
                          <tr>
                            <th>Attribute</th>
                            {comparisonProducts.map((p) => (
                              <th key={p.id}>
                                <div className="compare-col-head">
                                  <span>{p.name}</span>
                                  <button type="button" onClick={() => removeFromComparison(p.id)}>Remove</button>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Name</td>
                            {comparisonProducts.map((p) => <td key={`name-${p.id}`}>{p.name}</td>)}
                          </tr>
                          <tr>
                            <td>Price</td>
                            {comparisonProducts.map((p) => (
                              <td key={`price-${p.id}`} className={p.price === bestPrice ? 'best-value' : ''}>
                                EGP {p.price.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td>Rating</td>
                            {comparisonProducts.map((p) => (
                              <td key={`rating-${p.id}`} className={p.rating === bestRating ? 'best-value' : ''}>
                                {p.rating.toFixed(1)} / 5
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td>Brand</td>
                            {comparisonProducts.map((p) => <td key={`brand-${p.id}`}>{p.brand}</td>)}
                          </tr>
                          <tr>
                            <td>Origin</td>
                            {comparisonProducts.map((p) => <td key={`origin-${p.id}`}>{p.origin}</td>)}
                          </tr>
                          <tr>
                            <td>Warranty</td>
                            {comparisonProducts.map((p) => (
                              <td key={`warranty-${p.id}`}>{p.warrantyMonths > 0 ? `${p.warrantyMonths} months` : 'No warranty'}</td>
                            ))}
                          </tr>
                          <tr>
                            <td>Availability</td>
                            {comparisonProducts.map((p) => (
                              <td key={`availability-${p.id}`} className={p.quantity === bestQuantity ? 'best-value' : ''}>
                                {p.availability} ({p.quantity})
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td>Category</td>
                            {comparisonProducts.map((p) => <td key={`category-${p.id}`}>{p.category}</td>)}
                          </tr>
                          {specKeys.map((specKey) => {
                            const specValues = comparisonProducts.map((p) => p.specs?.[specKey]);
                            const numericValues = specValues.map((v) => Number(v)).filter((v) => !Number.isNaN(v));
                            const bestSpec = numericValues.length === comparisonProducts.length ? Math.max(...numericValues) : null;

                            return (
                              <tr key={`spec-${specKey}`}>
                                <td>{specKey}</td>
                                {comparisonProducts.map((p) => {
                                  const value = p.specs?.[specKey];
                                  const numericValue = Number(value);
                                  const isBest = bestSpec !== null && !Number.isNaN(numericValue) && numericValue === bestSpec;
                                  return (
                                    <td key={`${p.id}-${specKey}`} className={isBest ? 'best-value' : ''}>
                                      {value == null || value === '' ? '—' : String(value)}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </section>

        
        <section className="seller-section" id="seller-reviews">
          <h2 className="seller-section-heading">
            ⭐ Ratings & Reviews
            <span className="section-count">{reviewStats.total}</span>
          </h2>

          
          {reviewStats.total > 0 && (
            <div className="rating-distribution">
              <div className="rating-overview">
                <div className="rating-big-number">
                  <span className="big-value">{reviewStats.average.toFixed(1)}</span>
                  <span className="big-stars">
                    {overallStars.map((s) => (
                      <span key={s.index} className={s.filled ? '' : 'empty'}>★</span>
                    ))}
                  </span>
                  <span className="big-total">{reviewStats.total} reviews</span>
                </div>
                <div className="rating-bars">
                  {[5, 4, 3, 2, 1].map((level) => {
                    const count = reviewStats.distribution[level] || 0;
                    const pct = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                    return (
                      <div className="rating-bar-row" key={level}>
                        <span className="rating-bar-label">{level}★</span>
                        <div className="rating-bar-track">
                          <div className="rating-bar-fill" style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="rating-bar-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          
          {reviewStats.total === 0 ? (
            <div className="seller-empty-state">
              <span className="empty-icon">💬</span>
              <p>No reviews yet</p>
              <small>This seller hasn't received any reviews yet. Be the first to share your experience!</small>
            </div>
          ) : (
            <>
              <div className="reviews-toolbar">
                <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Showing {sortedReviews.length} reviews
                </span>
                <select
                  className="reviews-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest">Highest Rated</option>
                  <option value="lowest">Lowest Rated</option>
                </select>
              </div>

              <div className="seller-reviews-list">
                {sortedReviews.map((review) => {
                  const reviewStars = starsArray(review.rating);
                  return (
                    <div key={review.id} className="seller-review-card">
                      <div className="seller-review-header">
                        <strong>{review.buyer?.fullName || 'Anonymous'}</strong>
                        <div className="seller-review-stars">
                          {reviewStars.map((s) => (
                            <span key={s.index} className={s.filled ? '' : 'empty'}>★</span>
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="seller-review-comment">{review.comment}</p>}
                      <span className="seller-review-date">
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
