import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';
import {
  User,
  Lock,
  ChevronDown,
  Eye,
  EyeOff,
  Building2,
  CalendarDays,
  LogIn,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import Logo from '../common/images/Logo .PNG';

const BRANCHES = [
  { value: 'DanKuni', label: 'DanKuni' },
  { value: 'Rampur', label: 'Rampur' },
  { value: 'Rampurhat', label: 'Rampurhat' },
];

const FINANCIAL_YEARS = [
  { value: '2024-2025', label: '2024-2025' },
  { value: '2025-2026', label: '2025-2026' },
  { value: '2026-2027', label: '2026-2027' },
];

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [branch, setBranch] = useState('DanKuni');
  const [financialYear, setFinancialYear] = useState('2026-2027');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoggingIn } = useAuth();

  //! Where the user was headed before ProtectedRoute bounced them here
  const redirectTo = location.state?.from || '/dashboard';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Please enter both user code and password.');
      toast.error('Please enter both user code and password.');
      return;
    }

    setError('');
    const result = await login(username.trim(), password);

    if (result.success) {
      toast.success(`Welcome back, ${result.profile?.userName || username}`);
      navigate(redirectTo, { replace: true });
    } else {
      setError(result.message);
      toast.error(result.message);
      setPassword('');
    }
  };

  return (
    <>
      <div className="login-page">
        {/* Animated background orbs */}
        <div className="login-bg-orb login-bg-orb--1"></div>
        <div className="login-bg-orb login-bg-orb--2"></div>
        <div className="login-bg-orb login-bg-orb--3"></div>

        <div className={`login-container ${mounted ? 'login-container--visible' : ''}`}>
          {/* ─── Left Panel (Branding) ─── */}
          <div className="login-brand-panel">
            <div className="login-brand-content">
              {/* Logo */}
              <div className="login-logo-wrap">
                <div className="login-logo-img-container">
                  <img src={Logo} alt="Cold Roll" className="login-logo-img" />
                </div>
                <h1 className="login-brand-title">MashaktiERP</h1>
                <p className="login-brand-subtitle">MASHAKTI FOOD PRODUCTS LTD</p>
              </div>

              {/* Feature highlights */}
              <div className="login-features">
                <div className="login-feature-item">
                  <div className="login-feature-dot"></div>
                  <span>SAP Business One Integrated</span>
                </div>
                <div className="login-feature-item">
                  <div className="login-feature-dot"></div>
                  <span>Multi-Division Management</span>
                </div>
                <div className="login-feature-item">
                  <div className="login-feature-dot"></div>
                  <span>Real-time Production Tracking</span>
                </div>
              </div>

              {/* Decorative milk drops */}
              <div className="login-deco-drops">
                <span className="login-drop login-drop--1">🥛</span>
                <span className="login-drop login-drop--2">🧈</span>
                <span className="login-drop login-drop--3">🍦</span>
              </div>
            </div>

            {/* Bottom wave */}
            <div className="login-brand-footer">
              <p>© 2026 Mashakti Food Products Ltd · All rights reserved</p>
            </div>
          </div>

          {/* ─── Right Panel (Login Form) ─── */}
          <div className="login-form-panel">
            <div className="login-form-inner">
              {/* Header */}
              <div className="login-form-header">
                <h2 className="login-form-title">Welcome</h2>
                <p className="login-form-desc">
                  Sign in to your enterprise workspace
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="login-error">
                  <AlertCircle className="login-error-icon" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="login-form">
                {/* Username */}
                <div className="login-field">
                  <label className="login-label" htmlFor="login-username">
                    USERNAME
                  </label>
                  <div className="login-input-wrap">
                    <User className="login-input-icon" />
                    <input
                      id="login-username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); setError(''); }}
                      className="login-input"
                      autoComplete="username"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="login-field">
                  <label className="login-label" htmlFor="login-password">
                    PASSWORD
                  </label>
                  <div className="login-input-wrap">
                    <Lock className="login-input-icon" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      className="login-input login-input--password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="login-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>

                {/* Branch & Financial Year — side by side (hidden) */}
                <div className="login-row" style={{ display: 'none' }}>
                  {/* Branch */}
                  <div className="login-field">
                    <label className="login-label" htmlFor="login-branch">
                      BRANCH
                    </label>
                    <div className="login-input-wrap">
                      <Building2 className="login-input-icon" />
                      <select
                        id="login-branch"
                        value={branch}
                        onChange={(e) => { setBranch(e.target.value); setError(''); }}
                        className={`login-select ${!branch ? 'login-select--placeholder' : ''}`}
                      >
                        <option value="">Select Branch...</option>
                        {BRANCHES.map((b) => (
                          <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="login-chevron-icon" />
                    </div>
                  </div>

                  {/* Financial Year */}
                  <div className="login-field">
                    <label className="login-label" htmlFor="login-fy">
                      FINANCIAL YEAR
                    </label>
                    <div className="login-input-wrap">
                      <CalendarDays className="login-input-icon" />
                      <select
                        id="login-fy"
                        value={financialYear}
                        onChange={(e) => { setFinancialYear(e.target.value); setError(''); }}
                        className={`login-select ${!financialYear ? 'login-select--placeholder' : ''}`}
                      >
                        <option value="">Select Year...</option>
                        {FINANCIAL_YEARS.map((fy) => (
                          <option key={fy.value} value={fy.value}>{fy.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="login-chevron-icon" />
                    </div>
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="login-spinner" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <LogIn className="login-btn-icon" />
                      Sign In
                    </>
                  )}
                </button>
              </form>



              {/* SAP badge */}
              <div className="login-sap-badge">
                <div className="login-sap-dot"></div>
                <span>SAP Business One Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
