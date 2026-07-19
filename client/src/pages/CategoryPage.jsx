import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API } from '../services/api';
import { normalizeImageUrl, starsArray } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';
import StarSelector from '../components/common/StarSelector';
import Spinner from '../components/common/Spinner';
import '../styles/pages/category.css';

const BRANDS_MAP = {
  'Spare Parts': ['Toyota', 'BMW', 'Mercedes', 'Ford', 'Honda', 'Hyundai', 'Universal'],
  'Auto Accessories': ['Toyota', 'BMW', 'Mercedes', 'Ford', 'Honda', 'Hyundai', 'Universal'],
  'Heavy Machinery': ['Caterpillar', 'Komatsu', 'Volvo', 'John Deere', 'Liebherr', 'Doosan', 'XCMG'],
};

const ORIGINS = ['USA', 'Germany', 'Japan', 'China', 'Taiwan', 'South Korea', 'Sweden', 'Italy', 'France', 'UK', 'India', 'Turkey', 'Egypt'];

const PLACEHOLDER_MAP = {
  'Spare Parts': 'https://placehold.co/300x300/e2e8f0/1f2b3e?text=Part',
  'Auto Accessories': 'https://placehold.co/300x300/e2e8f0/1f2b3e?text=Accessory',
  'Heavy Machinery': 'https://placehold.co/300x300/e2e8f0/1f2b3e?text=Machinery',
};

const SEARCH_PLACEHOLDER_MAP = {
  'Spare Parts': 'Search for brake pads, filters, engines...',
  'Auto Accessories': 'Search for auto accessories, mats, covers...',
  'Heavy Machinery': 'Search for excavators, loaders, cranes...',
};

export default function CategoryPage({ category }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [search, setSearch] = useState('');
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(500000);
  const [origin, setOrigin] = useState('');
  const [brand, setBrand] = useState('');
  const [productRating, setProductRating] = useState(0);
  const [sellerRating, setSellerRating] = useState(0);
  const [comparisonProducts, setComparisonProducts] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [compareError, setCompareError] = useState('');
  const initialLoadRef = useRef(true);

  const brands = BRANDS_MAP[category] || [];
  const placeholder = PLACEHOLDER_MAP[category] || 'https://placehold.co/300x300/e2e8f0/1f2b3e?text=Product';
  const searchPlaceholder = SEARCH_PLACEHOLDER_MAP[category] || 'Search products...';

  const loadProducts = useCallback(async (isInitial) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    const params = new URLSearchParams({ page: '1', limit: '100', category });
    if (search.trim()) params.set('search', search.trim());
    if (priceMin > 0) params.set('minPrice', priceMin);
    if (priceMax < 500000) params.set('maxPrice', priceMax);
    if (origin) params.set('countryOfOrigin', origin);
    if (brand) params.set('brand', brand);
    if (productRating > 0) params.set('minRating', productRating);
    if (sellerRating > 0) params.set('minSellerRating', sellerRating);

    try {
      const res = await fetch(`${API}/api/ads?${params}`, { credentials: 'include' });
      if (!res.ok) {
        console.warn('Product fetch failed with status:', res.status);
        setFetchError(true);
        return;
      }
      const data = await res.json();
      if (data.success) {
        const items = data.data?.items || [];
        setProducts(items);
        setNoResults(items.length === 0);
        setFetchError(false);
      } else {
        if (products.length === 0) setNoResults(true);
        setFetchError(true);
      }
    } catch {
      console.warn('Product fetch network error');
      setFetchError(true);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [category, search, priceMin, priceMax, origin, brand, brands, productRating, sellerRating]);

  
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      loadProducts(true);
      return;
    }
    const timer = setTimeout(() => loadProducts(false), 350);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  
  const pctLo = (priceMin / 500000) * 100;
  const pctHi = (priceMax / 500000) * 100;
  const selectedCount = comparisonProducts.length;
  const canCompare = selectedCount >= 2;

  const toComparisonShape = (ad) => ({
    id: ad.id,
    name: ad.title,
    brand: ad.brand || '—',
    price: Number(ad.price) || 0,
    rating: Number(ad.avgRating) || 0,
    category: ad.category || category,
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

  return (
    <>
      
      <section className="hero">
        <div className="hero-inner">
          <div className="search-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            <button className="search-btn" aria-label="Search" onClick={() => loadProducts(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>

          
          <div className="filter-bar">
            
            <div className="filter-pill">
              <span className="filter-label">Price Range</span>
              <div className="price-slider-track">
                <div className="price-slider-fill" style={{ left: `${pctLo}%`, width: `${pctHi - pctLo}%` }}></div>
              </div>
              <div className="range-inputs">
                <input type="range" min="0" max="500000" step="500" value={priceMin}
                  onChange={(e) => { const v = Math.min(+e.target.value, priceMax); setPriceMin(v); }} />
                <input type="range" min="0" max="500000" step="500" value={priceMax}
                  onChange={(e) => { const v = Math.max(+e.target.value, priceMin); setPriceMax(v); }} />
              </div>
              <div className="price-values">
                <span>EGP {priceMin.toLocaleString()}</span><span>EGP {priceMax.toLocaleString()}</span>
              </div>
            </div>

            
            <div className="filter-pill">
              <span className="filter-label">Origin</span>
              <select className="filter-select" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                <option value="">All Origins</option>
                {ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            
            <div className="filter-pill">
              <span className="filter-label">{category === 'Heavy Machinery' ? 'Equipment Brand' : 'Car Brand'}</span>
              <select className="filter-select" value={brand} onChange={(e) => setBrand(e.target.value)}>
                <option value="">All Brands</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            
            <div className="filter-pill">
              <span className="filter-label">Product Rating</span>
              <StarSelector value={productRating} onChange={(v) => setProductRating(v)} />
            </div>

            
            <div className="filter-pill">
              <span className="filter-label">Seller Rating</span>
              <StarSelector value={sellerRating} onChange={(v) => setSellerRating(v)} />
            </div>
          </div>
        </div>
      </section>

      
      <main className="products-section">
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
        {initialLoading ? (
          <Spinner text="Loading products..." />
        ) : (
          <>
            <div className={`products-grid${refreshing ? ' refreshing' : ''}`}>
              {products.map((ad) => {
                const imgSrc = ad.images?.length > 0 ? normalizeImageUrl(ad.images[0], placeholder) : placeholder;
                const sellerName = ad.seller?.fullName || 'Unknown';
                const sellerRatingVal = ad.seller?.avgSellerRating ? parseFloat(ad.seller.avgSellerRating).toFixed(1) : '—';
                const stars = starsArray(ad.avgRating || 0);
                const checked = comparisonProducts.some((p) => p.id === ad.id);

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
                          checked={checked}
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
                          {' '}<span className="mini-star">★</span> {sellerRatingVal}
                        {ad.seller?.trustScore != null && (() => {
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
            {showComparison && (
              <section className="compare-panel">
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
            {fetchError && products.length > 0 && (
              <p className="fetch-error-banner">⚠ Could not refresh products. <button onClick={() => loadProducts(false)}>Retry</button></p>
            )}
            {noResults && !fetchError && <p className="no-results visible">No products found.</p>}
          </>
        )}
      </main>
    </>
  );
}
