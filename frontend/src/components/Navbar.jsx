import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { getKeyStatus } from '../api';

const links = [
  { to: '/',          label: '01. Home Hub'          },
  { to: '/sentiment', label: '02. Customer Feedback' },
  { to: '/demand',    label: '03. Restock Signals'   },
  { to: '/insights',  label: '04. Smart Search'      },
];

export default function Navbar() {
  const [keyInfo, setKeyInfo] = useState(null);

  useEffect(() => {
    getKeyStatus().then(setKeyInfo).catch(() => setKeyInfo({ has_key: false }));
  }, []);

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          <div className="navbar__brand-icon">S</div>
          <div>
            <span className="navbar__brand-title">Inventory Sentinel</span>
            <span style={{ margin: '0 8px', color: '#999' }}>—</span>
            <span className="navbar__brand-issue">ISSUE NO. 24</span>
          </div>
        </Link>

        <nav className="navbar__links">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `navbar__link${isActive ? ' navbar__link--active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div>
          {keyInfo && (
            <div
              className={`navbar__status-pill ${
                keyInfo.has_key ? '' : 'navbar__status-pill--fallback'
              }`}
              title={keyInfo.has_key ? 'Assistant Connected' : 'Standard Rules Mode'}
            >
              <span className="navbar__status-dot" />
              <span>{keyInfo.has_key ? 'ASSISTANT CONNECTED' : 'STANDARD MODE'}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
