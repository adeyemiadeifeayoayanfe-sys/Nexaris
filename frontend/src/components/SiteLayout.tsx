import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

const navItems = [
  ['/', 'Home'],
  ['/services', 'Services'],
  ['/projects', 'Projects'],
  ['/careers', 'Careers'],
  ['/about', 'About'],
  ['/contact', 'Contact']
] as const;

export function SiteLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">N</span>
          <span>
            <strong>Nexaris</strong>
            <small>Engineering What&apos;s Next.</small>
          </span>
        </Link>
        <button className="menu-toggle" onClick={() => setOpen((value) => !value)} type="button">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`nav ${open ? 'nav-open' : ''}`}>
          {navItems.map(([to, label]) => (
            <NavLink
              className={({ isActive }: { isActive: boolean }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
              key={to}
              onClick={() => setOpen(false)}
              to={to}
            >
              {label}
            </NavLink>
          ))}
          <NavLink className="nav-link" onClick={() => setOpen(false)} to="/auth">
            Sign In
          </NavLink>
          <Link className="button button-primary nav-cta" onClick={() => setOpen(false)} to="/request-project">
            Request a Project
          </Link>
        </nav>
      </header>

      <Outlet />

      <footer className="footer">
        <div>
          <p className="eyebrow">Nexaris Technologies</p>
          <p className="footer-copy">
            Building modern digital solutions through thoughtful design, powerful code and
            collaborative engineering.
          </p>
        </div>
        <div className="footer-links">
          <Link to="/services">Services</Link>
          <Link to="/careers">Careers</Link>
          <Link to="/request-project">Request a Project</Link>
          <Link to="/auth">Authentication</Link>
        </div>
      </footer>
    </div>
  );
}
