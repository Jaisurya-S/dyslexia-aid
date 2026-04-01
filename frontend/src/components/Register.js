import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    user_type: 'child',
    age: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const result = await register(formData);

    if (result.success) {
      const data = result.data;
      if (formData.user_type === 'child') {
        setMessage(`
          🎉 Child Account Created Successfully!

          👤 Your Child Login Details:
          • Email: ${formData.email}
          • Password: ${formData.password}

          👨👩👧👦 Parent Monitoring Account (Auto-generated):
          • Parent ID: ${data.parent_username}
          • Password: ${data.parent_password}

          📝 Important:
          Parents can use the Parent ID and Password above to login
          and monitor their child's progress anytime!
        `);
      } else {
        setMessage('✅ Parent account created successfully!');
      }

      setFormData({ username: '', email: '', password: '', user_type: 'child', age: '' });
      setTimeout(() => navigate('/login'), 8000);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Join Dyslexia Aid</h2>
        <p className="auth-subtitle">Create your account</p>

        {error && <div className="error-message">{error}</div>}
        {message && (
          <div className="success-message" style={{ whiteSpace: 'pre-line' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Account Type</label>
            <select
              name="user_type"
              value={formData.user_type}
              onChange={handleChange}
              className="child-friendly-input"
            >
              <option value="child">👶 Child Account</option>
              <option value="parent">👨👩👧👦 Parent Account</option>
            </select>
            <small className="help-text">
              {formData.user_type === 'child'
                ? 'Child account includes automatic parent account creation'
                : 'Create a standalone parent account'}
            </small>
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="child-friendly-input"
              placeholder="Choose a username"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="child-friendly-input"
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="child-friendly-input"
              placeholder="Choose a password"
            />
          </div>

          {formData.user_type === 'child' && (
            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                required
                className="child-friendly-input"
                placeholder="Enter your age"
                min="5"
                max="12"
              />
              <small className="help-text">For children aged 5-12 years</small>
            </div>
          )}

          {formData.user_type === 'child' && formData.username && formData.password && (
            <div className="parent-preview">
              <h4>📋 Parent Account Preview:</h4>
              <div className="preview-details">
                <div className="preview-item">
                  <span className="preview-label">Parent ID:</span>
                  <span className="preview-value">parent_{formData.username}</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Parent Password:</span>
                  <span className="preview-value">{formData.password}@parent</span>
                </div>
                <div className="preview-note">
                  <small>This parent account will be created automatically</small>
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
