import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

async function fetchJson(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data && data.error ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function Navbar() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const me = await fetchJson(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        setIsAdmin(Boolean(me && me.isAdmin));
      } catch {
        if (!mounted) return;
        setIsAdmin(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  return (
    <nav className="navbar" aria-label="Primary">
      <div className="navbar__inner">
        <div className="navbar__left">
          <NavLink to="/home" className="navbar__brand">
            CareerAI
          </NavLink>

          <div className="navbar__links">
            <NavLink
              to="/home"
              className={({ isActive }) => `navbar__link ${isActive ? 'is-active' : ''}`}
            >
              Home
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) => `navbar__link ${isActive ? 'is-active' : ''}`}
            >
              Profile
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `navbar__link ${isActive ? 'is-active' : ''}`}
              >
                Admin
              </NavLink>
            )}
          </div>
        </div>

        <button onClick={handleLogout} className="navbar__logout" type="button">
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
