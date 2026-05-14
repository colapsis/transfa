import { Link } from 'react-router-dom';
import Wordmark from './Wordmark.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-col">
          <Wordmark />
          <p className="muted" style={{ fontSize: 14, marginTop: 16, maxWidth: 320, lineHeight: 1.5 }}>
            File sharing built for agents. One command, one link, signed and gone.
          </p>
          <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
            <span className="pill pill-ok"><span className="dot" />all systems normal</span>
            <span className="pill pill-dead">v1.6.0</span>
          </div>
        </div>
        <div className="footer-col">
          <h4>Product</h4>
          <Link to="/">Home</Link>
          <Link to="/docs">Docs</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/dashboard">Dashboard</Link>
        </div>
        <div className="footer-col">
          <h4>Developers</h4>
          <Link to="/docs">CLI reference</Link>
          <Link to="/docs">API reference</Link>
          <Link to="/docs">Rate limits</Link>
          <a href="#">SDK · Python</a>
          <a href="#">SDK · Node</a>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <Link to="/contact">Contact</Link>
          <a href="#">Changelog</a>
          <a href="#">Status</a>
          <a href="https://github.com/colapsis/transfa/blob/main/SECURITY.md" target="_blank" rel="noreferrer">Security</a>
        </div>
        <div className="footer-col">
          <h4>Legal</h4>
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
          <a href="#">DPA</a>
          <a href="#">Trust</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Transfa Labs Inc · transfa.sh</span>
        <span>Built in San Francisco · Berlin</span>
      </div>
    </footer>
  );
}
