import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ userInfo, onLogout, navBarText }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#509384', padding: '1rem 2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>

      {/* Clicking the logo returns the user to the Home page */}
      <Link to="/" style={{ textDecoration: 'none', color: 'black' }}>
        <h2 style={{ margin: 0 }}>{navBarText}</h2>
      </Link>

      {/* Only render the right side if the user is logged in */}
      {userInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'darkcyan', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
              {userInfo.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: 'bold' }}>{userInfo.name}</span>
          </div>
          <button
            onClick={onLogout}
            style={{ padding: '8px 16px', cursor: 'pointer', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}