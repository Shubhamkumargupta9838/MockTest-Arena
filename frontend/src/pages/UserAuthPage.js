import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authFetch } from '../utils/auth';
import './UserAuthPage.css';

const GOOGLE_INITIALIZED_KEY = '__mockTestGoogleIdentityInitialized';
const GOOGLE_HANDLER_KEY = '__mockTestGoogleCredentialHandler';

function loadGoogleIdentityScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function initializeGoogleIdentity(clientId) {
  if (window[GOOGLE_INITIALIZED_KEY]) return;

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: response => window[GOOGLE_HANDLER_KEY]?.(response),
  });
  window[GOOGLE_INITIALIZED_KEY] = true;
}

export default function UserAuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const location = useLocation();
  const googleButtonRef = useRef(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const registeredEmail = useMemo(() => {
    return new URLSearchParams(location.search).get('registered');
  }, [location.search]);

  useEffect(() => {
    if (!isRegister && registeredEmail) {
      setNotice('Registration successful. Please login to continue.');
      setForm(current => ({ ...current, email: registeredEmail }));
    }

    authFetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && !data.admin) {
          window.dispatchEvent(new Event('auth:changed'));
          navigate('/');
        }
      })
      .catch(() => {});
  }, [isRegister, navigate, registeredEmail]);

  useEffect(() => {
    let cancelled = false;

    const initializeGoogle = async () => {
      try {
        const envClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
        const configRes = await fetch('/api/auth/google-client-id');
        const { clientId } = await configRes.json();
        const googleClientId = envClientId || clientId;

        if (!googleClientId || cancelled) return;

        await loadGoogleIdentityScript();
        if (cancelled || !googleButtonRef.current) return;

        googleButtonRef.current.innerHTML = '';
        const handleGoogleCredential = async ({ credential }) => {
          setLoading(true);
          setError('');
          setNotice('');

          try {
            const res = await authFetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential }),
            });
            const data = await res.json();

            if (!res.ok) {
              setError(data.error || 'Google login failed');
              return;
            }

            window.dispatchEvent(new Event('auth:changed'));
            navigate('/');
          } catch (err) {
            setError('Google login failed. Please try again.');
          } finally {
            setLoading(false);
          }
        };

        window[GOOGLE_HANDLER_KEY] = handleGoogleCredential;
        initializeGoogleIdentity(googleClientId);
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 350,
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center'
        });
      } catch (err) {
        if (!cancelled) setError('Google login is unavailable right now.');
      }
    };

    initializeGoogle();

    return () => {
      cancelled = true;
      window[GOOGLE_HANDLER_KEY] = null;
    };
  }, [navigate]);

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/user/login';
    const payload = isRegister
      ? form
      : { email: form.email, password: form.password };

    try {
      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && isRegister) {
        const params = new URLSearchParams({ registered: form.email.trim().toLowerCase() });
        navigate(`/user/login?${params.toString()}`);
      } else if (res.ok) {
        window.dispatchEvent(new Event('auth:changed'));
        navigate('/');
      } else {
        setError(data.error || `${isRegister ? 'Registration' : 'Login'} failed`);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-auth-page">
      <section className="user-auth-shell">
        <div className="user-auth-panel">
          <div className="user-auth-copy">
            <span className="auth-kicker">MockTest Arena</span>
            <h1>{isRegister ? 'Create your learner account' : 'Welcome back'}</h1>
            <p>
              {isRegister
                ? 'Register with email and password, or use OAuth2 to start faster.'
                : 'Login with your email password account, Google.'}
            </p>
          </div>

          <div className="auth-card">
            <div className="auth-tabs" aria-label="Authentication mode">
              <Link className={!isRegister ? 'active' : ''} to="/user/login">Login</Link>
              <Link className={isRegister ? 'active' : ''} to="/user/register">Register</Link>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {isRegister && (
                <label>
                  <span>Name</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => updateField('name', e.target.value)}
                    placeholder="Your name"
                    required
                    disabled={loading}
                  />
                </label>
              )}

              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => updateField('password', e.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                  disabled={loading}
                />
              </label>

              {error && <div className="auth-alert error">{error}</div>}
              {notice && <div className="auth-alert success">{notice}</div>}

              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Login'}
              </button>
            </form>

            <div className="auth-divider"><span>or OAuth2</span></div>

           <div className="oauth-grid google-wrapper">
              <div ref={googleButtonRef} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
