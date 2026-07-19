import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import RecommendedSection from '../components/common/RecommendedSection';
import spareImg from '../assets/images/spare.png';
import accImg from '../assets/images/acc.png';
import heavyImg from '../assets/images/heavy.png';
import '../styles/pages/home.css';

export default function HomePage() {
  const { isLoggedIn, isSeller } = useAuth();

  return (
    <>
      
      <section className="home-hero">
        <div className="home-hero-inner">
          <h1>
            Your Trusted <span className="highlight">B2B</span> Industrial Marketplace
          </h1>
          <p>
            Connect with trusted B2B industrial equipment and spare parts 
            suppliers across Egypt — all in one platform.
          </p>
        </div>
      </section>

      
      <section className="categories-section">
        <div className="categories-grid">
          <Link to="/spare-parts" className="category-card">
            <div className="category-card-img">
              <img src={spareImg} alt="Spare Parts" />
            </div>
            <div className="category-card-body">
              <h3>Spare Parts</h3>
              <p>OEM and aftermarket parts for all vehicle types and industrial applications.</p>
              <span className="card-cta">Browse Spare Parts →</span>
            </div>
          </Link>

          <Link to="/auto-accessories" className="category-card">
            <div className="category-card-img">
              <img src={accImg} alt="Auto Accessories" />
            </div>
            <div className="category-card-body">
              <h3>Auto Accessories</h3>
              <p>Premium car accessories, interior upgrades, and exterior enhancements.</p>
              <span className="card-cta">Browse Accessories →</span>
            </div>
          </Link>

          <Link to="/heavy-machinery" className="category-card">
            <div className="category-card-img">
              <img src={heavyImg} alt="Heavy Machinery" />
            </div>
            <div className="category-card-body">
              <h3>Heavy Machinery</h3>
              <p>Industrial-grade equipment from leading manufacturers.</p>
              <span className="card-cta">Browse Machinery →</span>
            </div>
          </Link>
        </div>
      </section>

      
      <RecommendedSection />

      
      {isLoggedIn && !isSeller && (
        <section className="seller-cta-section">
          <h2>Become a Seller</h2>
          <p>Join thousands of verified suppliers on ProSupply. Reach buyers across Egypt and grow your business.</p>
          <Link to="/seller/apply" className="seller-cta-btn">Apply Now →</Link>
        </section>
      )}

      
      <section className="about-section">
        <h2>Why ProSupply?</h2>
        <div className="about-features">
          <div className="about-feature">
            <div className="feat-icon">🔒</div>
            <h4>Verified Suppliers</h4>
            <p>Every seller is vetted and verified before joining our marketplace.</p>
          </div>
          <div className="about-feature">
            <div className="feat-icon">🚚</div>
            <h4>Fast Logistics</h4>
            <p>Reliable shipping and delivery tracking for all orders.</p>
          </div>
          <div className="about-feature">
            <div className="feat-icon">⭐</div>
            <h4>Quality Assured</h4>
            <p>Product and seller ratings ensure you always get the best.</p>
          </div>
        </div>
      </section>
    </>
  );
}
