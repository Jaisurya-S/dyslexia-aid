import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [userType, setUserType] = useState('child');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, googleLogin, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleUserTypeChange = (type) => { setUserType(type); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(formData.email, formData.password);
    if (result.success) navigate('/dashboard');
    else setError(result.error);
  };

  const handleGoogleLogin = async () => {
    setError('');
    setError('Connecting to server, please wait...');
    const result = await googleLogin();
    if (result.success) navigate('/dashboard');
    else setError(result.error);
  };

  return (
    <div className="login-bg">
      <div className="login-card">

        {/* Header */}
        <div className="login-card-header">
          <div className="login-card-logo">DA</div>
          <h1>Dyslexia Aid</h1>
          <p>Sign in to your account</p>
        </div>

        {/* Role selector */}
        <div className="login-role-tabs">
          <button
            type="button"
            className={`role-tab ${userType === 'child' ? 'active' : ''}`}
            onClick={() => handleUserTypeChange('child')}
          >
            Child
          </button>
          <button
            type="button"
            className={`role-tab ${userType === 'parent' ? 'active' : ''}`}
            onClick={() => handleUserTypeChange('parent')}
          >
            Parent
          </button>
        </div>

        {error && <div className="login-alert">{error}</div>}

        {/* Google */}
        <button type="button" onClick={handleGoogleLogin} className="btn-google" disabled={loading}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
          Continue with Google
        </button>

        <div className="login-sep"><span>or</span></div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="lf-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="lf-group">
            <div className="lf-label-row">
              <label>Password</label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            <div className="lf-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? <span className="btn-spinner"><span />Signing in…</span>
              : `Sign in as ${userType === 'child' ? 'Child' : 'Parent'}`
            }
          </button>
        </form>

        <p className="login-footer-link">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>

        <button
          type="button"
          className="btn-demo"
          onClick={() => setFormData(
            userType === 'child'
              ? { email: 'johnny@demo.com', password: 'child123' }
              : { email: 'parent_johnny@demo.com', password: 'child123@parent' }
          )}
        >
          Use demo credentials
        </button>

      </div>
    </div>
  );
};

export default Login;
