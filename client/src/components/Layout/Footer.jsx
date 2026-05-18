import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <h2 className="footer-heading">About ProSupply</h2>
      <p>
        ProSupply connects industrial buyers with verified suppliers across Egypt.
        We offer an extensive catalog of parts, machinery, and accessories backed
        by quality assurance and fast logistics.
      </p>
      <div className="footer-contact">
        <span>📧 support@prosupply.com</span>
        <span>📞 +201159125231</span>
        <span>📍 Egypt, Cairo</span>
      </div>
      <div className="footer-divider"></div>
      <p className="footer-copy">© 2026 ProSupply. All rights reserved.</p>
    </footer>
  );
}
