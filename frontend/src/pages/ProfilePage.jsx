import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function ProfilePage() {
  const navigate = useNavigate();
  const [user] = useState(() => safeJsonParse(localStorage.getItem('currentUser')));

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="app-page app-page--with-navbar">
        <div className="card">
          <p>Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page app-page--with-navbar">
      <div className="card">
        <h2 className="card-title">User Profile</h2>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>University:</strong> {user.university}</p>
        <p><strong>Skills:</strong> JavaScript, React, Node.js</p>
      </div>
    </div>
  );
}

export default ProfilePage;
