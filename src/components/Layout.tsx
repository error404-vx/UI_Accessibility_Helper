import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

export function Layout() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    // Move focus to the new page heading so screen reader users hear the route change.
    const heading = document.querySelector<HTMLElement>('main h1');
    heading?.focus();
  }, [location.pathname]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header no-print">
        <div className="container header-inner">
          <Link to="/" className="brand">
            <svg aria-hidden="true" width="28" height="28" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="15" fill="currentColor" />
              <path d="M9 17l5 5 9-11" stroke="var(--color-bg)" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>UI Accessibility Helper</span>
          </Link>
          <nav aria-label="Main">
            <ul className="nav-list">
              <li>
                <NavLink to="/" end>
                  New scan
                </NavLink>
              </li>
              <li>
                <NavLink to="/history">History</NavLink>
              </li>
              <li>
                <NavLink to="/settings">Settings</NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="container">
        <Outlet />
      </main>
      <footer className="site-footer no-print">
        <div className="container">
          <p>
            Automated checks find only part of all accessibility problems. Always test with a keyboard and a screen reader too.
          </p>
        </div>
      </footer>
    </>
  );
}
