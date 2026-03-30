import React from 'react';
import Dashboard from './pages/Dashboard';
import './styles/index.css';

function App() {
  return (
    <div className="app">
      <header>
        <div className="container">
          <h1>📍 Where is Jason?</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Location dashboard powered by Google Calendar
          </p>
        </div>
      </header>

      <main>
        <Dashboard />
      </main>

      <footer>
        <div className="container">
          <p>
            Last updated: <span id="footer-time">{new Date().toLocaleTimeString()}</span>
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
            WhereisJason.net • Always keeping you in the loop 🚀
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
