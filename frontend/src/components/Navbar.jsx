import { NavLink, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
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
