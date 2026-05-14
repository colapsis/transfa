import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Wordmark from './Wordmark.jsx';
import { GhIcon } from './Icons.jsx';

export default function TopNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);
  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function NavLink({ to, children }) {
    const active = pathname === to || (to !== '/' && pathname.startsWith(to));
    return (
      <Link className={'nav-link' + (active ? ' active' : '')} to={to}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
            <Wordmark />
          </Link>
          <div className="nav-links">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/docs">Docs</NavLink>
            <NavLink to="/pricing">Pricing</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
          </div>
          <div className="nav-cta">
            <a className="btn btn-ghost" href="https://github.com/colapsis/transfa" target="_blank" rel="noreferrer">
              <GhIcon /> GitHub
            </a>
            <Link className="btn btn-primary btn-sm" to="/dashboard">Get free key</Link>
          </div>
          <button
            className="nav-hamburger"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen(o => !o)}
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            )}
          </button>
        </div>
      </nav>

      {open && (
        <div className="nav-mobile-drawer">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/docs">Docs</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a className="btn btn-ghost" href="https://github.com/colapsis/transfa" target="_blank" rel="noreferrer" style={{ justifyContent: 'center' }}>
              <GhIcon /> GitHub
            </a>
            <Link className="btn btn-primary" to="/dashboard" style={{ justifyContent: 'center' }}>Get free key</Link>
          </div>
        </div>
      )}
    </>
  );
}
