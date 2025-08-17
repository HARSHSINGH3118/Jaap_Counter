export default function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer" role="contentinfo" aria-label="Site footer">
      <div className="footer-inner">
        <div className="footer-left">
          <span className="copyright">
            © {year} <strong>Harsh Singh</strong> — made with Love and Devotion
          </span>
          <span className="dot">•</span>
          <span className="rights">All rights reserved</span>
        </div>
        <div className="footer-right">
          <span className="tagline">Pitaji, my world is around you ❤️</span>
        </div>
      </div>
    </footer>
  );
}
