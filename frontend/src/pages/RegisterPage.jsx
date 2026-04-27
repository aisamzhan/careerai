import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [university, setUniversity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !university || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setError('');
      const data = await fetchJson(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ name, email, university, password }),
      });
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      navigate('/home');
    } catch (err) {
      setError(String(err && err.message ? err.message : err));
    }
  };

  return (
    <div className="app-page">
      <div className="card">
        <h2 className="card-title">Create your account</h2>

        <form className="form-group" onSubmit={handleSubmit}>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="input"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            id="university"
            name="university"
            type="text"
            required
            className="input"
            placeholder="University"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
          />

          <input
            id="password"
            name="password"
            type="password"
            required
            className="input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className="input"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <div className="error">{error}</div>}

          <button type="submit" className="button">
            Register
          </button>

          <Link to="/login" className="link">
            Already have an account?
          </Link>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
