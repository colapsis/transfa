import { Link, useLocation } from 'react-router-dom';
import Wordmark from './Wordmark.jsx';
import { GhIcon } from './Icons.jsx';

export default function TopNav() {
  const { pathname } = useLocation();

  function NavLink({ to, children }) {
    const active = pathname === to || (to !== '/' && pathname.startsWith(to));
    return (
      <Link className={'nav-link' + (active ? ' active' : '')} to={to}>
        {children}
      </Link>
    );
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <Wordmark />
        </Link>
        <div className="nav-links">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/docs">Docs</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </div>
        <div className="nav-cta">
          <a
            className="btn btn-ghost"
            href="https://github.com/colapsis/transfa"
            target="_blank"
            rel="noreferrer"
          >
            <GhIcon /> GitHub
          </a>
          <Link className="nav-link" to="/dashboard">Sign in</Link>
          <Link className="btn btn-primary btn-sm" to="/pricing">Get a key</Link>
        </div>
      </div>
    </nav>
  );
}
