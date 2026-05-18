import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch, apiPost } from '../services/api';
import { normalizeImageUrl, starsArray, formatPrice } from '../utils/helpers';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/common/Spinner';
import '../styles/pages/product-detail.css';

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

function RecommendationCard({ ad, placeholder }) {
  const imgSrc = ad.images?.length > 0 ? normalizeImageUrl(ad.images[0]) : placeholder;
  const stars = starsArray(ad.avgRating || 0);
  return (
    <Link to={`/product/${ad.id}`} className="rec-card">
      <div className="rec-card-img">
        <img src={imgSrc} alt={ad.title} loading="lazy" />
      </div>
      <div className="rec-card-info">
        <span className="rec-card-title">{ad.title}</span>
        <span className="rec-card-price">{formatPrice(ad.price)}</span>
        <div className="rec-card-stars">
          {stars.map(s => <span key={s.index} className={s.filled ? '' : 'empty'}>★</span>)}
        </div>
        {ad.seller && (
          <span className="rec-card-seller">
            {ad.seller.fullName}
            <TrustBadge score={ad.seller.trustScore} />
          </span>
        )}
      </div>
    </Link>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const showToast = useToast();
  const { refreshCartBadge, user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [sellerReviewRating, setSellerReviewRating] = useState(0);
  const [sellerReviewComment, setSellerReviewComment] = useState('');
  const [submittingSellerReview, setSubmittingSellerReview] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [alternatives, setAlternatives] = useState([]);

  useEffect(() => {
    let cancelled = false;

    // Clear old product data and show spinner when navigating to a new product ID
    setProduct(null);
    setLoading(true);
    setQuantity(1);
    setReviewRating(0);
    setReviewComment('');
    setSimilarProducts([]);
    setAlternatives([]);

    async function load() {
      const res = await apiFetch(`/api/ads/${id}`);
      if (cancelled) return;
      if (res && res.success) {
        setProduct(res.data);
        const imgs = res.data.images || [];
        setMainImage(imgs.length > 0 ? normalizeImageUrl(imgs[0]) : 'https://placehold.co/500x500/e2e8f0/1f2b3e?text=Product');
      } else {
        setProduct(null);
      }
      setLoading(false);

      // Load recommendations in background
      const [simRes, altRes] = await Promise.all([
        apiFetch(`/api/ads/${id}/similar?limit=6`),
        apiFetch(`/api/ads/${id}/alternatives?limit=4`),
      ]);
      if (cancelled) return;
      if (simRes?.success) setSimilarProducts(simRes.data || []);
      if (altRes?.success) setAlternatives(altRes.data || []);
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  // Silent refresh — no spinner, just updates product data (used after review submission)
  async function refreshProduct() {
    const res = await apiFetch(`/api/ads/${id}`);
    if (res && res.success) {
      setProduct(res.data);
    }
  }

  async function loadRecommendations() {
    const [simRes, altRes] = await Promise.all([
      apiFetch(`/api/ads/${id}/similar?limit=6`),
      apiFetch(`/api/ads/${id}/alternatives?limit=4`),
    ]);
    if (simRes?.success) setSimilarProducts(simRes.data || []);
    if (altRes?.success) setAlternatives(altRes.data || []);
  }

  async function handleAddToCart() {
    setAddingToCart(true);
    const res = await apiPost('/api/cart', { adId: parseInt(id), quantity });
    if (res && res.success) {
      showToast('Added to cart!');
      refreshCartBadge();
    } else {
      showToast(res?.message || 'Failed to add to cart.', true);
    }
    setAddingToCart(false);
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!reviewRating) { showToast('Please select a product rating.', true); return; }
    setSubmittingReview(true);
    const res = await apiPost(`/api/ads/${id}/rate`, { rating: reviewRating, reviewText: reviewComment });
    if (res && res.success) {
      showToast('Product review submitted!');
      setReviewRating(0);
      setReviewComment('');
      refreshProduct();
    } else {
      showToast(res?.message || 'Failed to submit product review.', true);
    }
    setSubmittingReview(false);
  }

  async function handleSubmitSellerReview(e) {
    e.preventDefault();
    if (!sellerReviewRating) { showToast('Please select a seller rating.', true); return; }
    setSubmittingSellerReview(true);
    const res = await apiPost(`/api/sellers/${product.sellerId}/rate`, { rating: sellerReviewRating, comment: sellerReviewComment });
    if (res && res.success) {
      showToast('Seller review submitted!');
      setSellerReviewRating(0);
      setSellerReviewComment('');
      refreshProduct();
    } else {
      showToast(res?.message || 'Failed to submit seller review.', true);
    }
    setSubmittingSellerReview(false);
  }

  if (loading) {
    return (
      <main className="product-detail-page skeleton-loading">
        <div className="product-detail-grid">
          <div className="product-gallery">
            <div className="main-image-wrap" style={{ background: '#e2e8f0', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div className="thumbnails">
              {[1, 2, 3].map(i => <div key={i} className="thumb" style={{ background: '#e2e8f0', animation: 'pulse 1.5s infinite ease-in-out', borderColor: 'transparent' }} />)}
            </div>
          </div>
          <div className="product-detail-info">
            <div style={{ height: '40px', width: '80%', background: '#e2e8f0', borderRadius: '8px', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ height: '32px', width: '30%', background: '#e2e8f0', borderRadius: '8px', margin: '1rem 0 2rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div className="pd-specs">
              {[1, 2, 3, 4].map(i => <div key={i} style={{ height: '24px', width: '100%', background: '#e2e8f0', borderRadius: '4px', margin: '4px 0', animation: 'pulse 1.5s infinite ease-in-out' }} />)}
            </div>
            <div style={{ height: '80px', width: '100%', background: '#e2e8f0', borderRadius: '8px', marginTop: '1rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ height: '50px', width: '100%', background: '#e2e8f0', borderRadius: '14px', marginTop: '2rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
          </div>
        </div>
      </main>
    );
  }
  if (!product) return <div className="empty-state"><h2>Product not found</h2><Link to="/spare-parts">← Browse Products</Link></div>;

  const ad = product;
  const images = (ad.images || []).map((img) => normalizeImageUrl(img));
  const stars = starsArray(ad.avgRating || 0);
  const inStock = ad.quantity > 0;
  const sellerName = ad.seller?.fullName || 'Unknown';
  const sellerRating = ad.seller?.avgSellerRating ? parseFloat(ad.seller.avgSellerRating).toFixed(1) : '—';
  const placeholder = 'https://placehold.co/300x300/e2e8f0/1f2b3e?text=Product';

  return (
    <main className="product-detail-page">
      <div className="product-detail-grid">
        {/* Gallery */}
        <div className="product-gallery">
          <div className="main-image-wrap">
            <img src={mainImage} alt={ad.title} className="main-image" />
          </div>
          {images.length > 1 && (
            <div className="thumbnails">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${ad.title} ${i + 1}`}
                  className={`thumb${mainImage === img ? ' active' : ''}`}
                  onClick={() => setMainImage(img)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="product-detail-info">
          <h1 className="pd-title">{ad.title}</h1>
          <div className="pd-price">{formatPrice(ad.price)}</div>

          <div className="pd-rating">
            <div className="pd-stars">
              {stars.map((s) => <span key={s.index} className={s.filled ? '' : 'empty'}>★</span>)}
            </div>
            <span className="pd-rating-count">({ad.reviewCount || 0} reviews)</span>
          </div>

          <div className="pd-seller">
            <span>Sold by <strong>{sellerName}</strong></span>
            <span className="pd-seller-rating">★ {sellerRating}</span>
            <TrustBadge score={ad.seller?.trustScore} />
          </div>

          {/* Specs */}
          <div className="pd-specs">
            {ad.brand && <div className="spec-row"><span className="spec-label">Brand</span><span className="spec-value">{ad.brand}</span></div>}
            {ad.category && <div className="spec-row"><span className="spec-label">Category</span><span className="spec-value">{ad.category}</span></div>}
            {ad.countryOfOrigin && <div className="spec-row"><span className="spec-label">Origin</span><span className="spec-value">{ad.countryOfOrigin}</span></div>}
            {ad.warrantyMonths > 0 && <div className="spec-row"><span className="spec-label">Warranty</span><span className="spec-value">{ad.warrantyMonths} months</span></div>}
            <div className="spec-row"><span className="spec-label">Stock</span><span className={`spec-value ${inStock ? 'in-stock' : 'out-of-stock'}`}>{inStock ? `${ad.quantity} available` : 'Out of stock'}</span></div>
          </div>

          {ad.description && <p className="pd-description">{ad.description}</p>}

          {/* Add to Cart */}
          {inStock && (
            <div className="pd-cart-action">
              <div className="qty-stepper">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <input type="text" value={quantity} readOnly className="qty-val" />
                <button onClick={() => setQuantity(Math.min(ad.quantity, quantity + 1))}>+</button>
              </div>
              <button className="btn-add-cart" onClick={handleAddToCart} disabled={addingToCart}>
                {addingToCart ? 'Adding...' : '🛒 Add to Cart'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Recommendations — Similar Products */}
      {similarProducts.length > 0 && (
        <section className="rec-section">
          <h2 className="rec-heading">🎯 Similar Products <span className="ai-tag">AI Powered</span></h2>
          <div className="rec-grid">
            {similarProducts.map(p => <RecommendationCard key={p.id} ad={p} placeholder={placeholder} />)}
          </div>
        </section>
      )}

      {/* AI Recommendations — Alternatives */}
      {alternatives.length > 0 && (
        <section className="rec-section">
          <h2 className="rec-heading">🔄 Alternative Products <span className="ai-tag">AI Powered</span></h2>
          <p className="rec-subtitle">Same category from different sellers — compare your options</p>
          <div className="rec-grid">
            {alternatives.map(p => <RecommendationCard key={p.id} ad={p} placeholder={placeholder} />)}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="reviews-section">
        <h2>Reviews & Ratings</h2>

        {user?.id !== ad.sellerId && (
          <div className="review-forms-grid">
            <form className="review-form" onSubmit={handleSubmitReview}>
            <h3>Rate this product</h3>
            <div className="review-stars">
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className={`star${reviewRating >= s ? ' active' : ''}`} onClick={() => setReviewRating(s)}>★</span>
              ))}
            </div>
            <textarea placeholder="Write your product review (optional)..." value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)} rows="3" />
            <button type="submit" className="btn-submit-review" disabled={submittingReview}>
              {submittingReview ? 'Submitting...' : 'Submit Product Review'}
            </button>
          </form>

          <form className="review-form" onSubmit={handleSubmitSellerReview}>
            <h3>Rate the seller ({ad.seller?.fullName || 'Seller'})</h3>
            <div className="review-stars">
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={`seller-star-${s}`} className={`star${sellerReviewRating >= s ? ' active' : ''}`} onClick={() => setSellerReviewRating(s)}>★</span>
              ))}
            </div>
            <textarea placeholder="Write your seller review (optional)..." value={sellerReviewComment}
              onChange={(e) => setSellerReviewComment(e.target.value)} rows="3" />
            <button type="submit" className="btn-submit-review" disabled={submittingSellerReview}>
              {submittingSellerReview ? 'Submitting...' : 'Submit Seller Review'}
            </button>
          </form>
        </div>
        )}

        <div className="reviews-list">
          {(ad.AdReviews || []).length === 0 ? (
            <p className="no-reviews">No reviews yet. Be the first to review this product!</p>
          ) : (
            (ad.AdReviews || []).map((r) => (
              <div key={r.id} className="review-card">
                <div className="review-header">
                  <strong>{r.buyer?.fullName || 'Anonymous'}</strong>
                  <div className="review-stars-small">
                    {starsArray(r.rating).map((s) => <span key={s.index} className={s.filled ? '' : 'empty'}>★</span>)}
                  </div>
                </div>
                {r.reviewText && <p className="review-comment">{r.reviewText}</p>}
                <span className="review-date">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
