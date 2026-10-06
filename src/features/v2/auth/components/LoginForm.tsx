import React, { useState } from 'react';
import { useAuthV2 } from '../hooks/useAuthV2';
import { SignupForm } from './SignupForm';
import { PasswordResetForm } from './PasswordResetForm';
import { ActionButtonProps } from '../../shared/types';
import { LoadingState, ErrorDisplay } from '../../shared/components';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
  onSwitchToPasswordReset?: () => void;
  className?: string;
}

export function LoginForm({
  onSuccess,
  onSwitchToSignup,
  onSwitchToPasswordReset,
  className = '',
}: LoginFormProps) {
  const { login, loading, error } = useAuthV2();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please enter both email and password');
      return;
    }

    const result = await login(email, password);
    
    if (result.success) {
      onSuccess?.();
    } else if (result.error) {
      setFormError(result.error);
    }
  };

  return (
    <div className={`v2-login-form ${className}`} style={{ maxWidth: '400px', width: '100%' }}>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1.5rem' }}>
          <label 
            htmlFor="email" 
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label 
              htmlFor="password" 
              style={{ fontWeight: 500, color: '#374151' }}
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => window.location.href = '/v2/auth/password-reset'}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                fontSize: '0.875rem',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Forgot password?
            </button>
          </div>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
          />
        </div>

        <ErrorDisplay error={formError ? new Error(formError) : null} onDismiss={() => setFormError(null)} />
        <ErrorDisplay error={error} onDismiss={() => {}} />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.625rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.15s, background-color 0.15s',
          }}
        >
          {loading ? <span>Signing in...</span> : 'Sign in'}
        </button>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              fontWeight: 500,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Sign up
          </button>
        </div>
      </form>
    </div>
  );
}

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');

  const renderForm = () => {
    switch (mode) {
      case 'login':
        return <LoginForm onSwitchToSignup={() => setMode('signup')} onSwitchToPasswordReset={() => setMode('reset')} />;
      case 'signup':
        return <SignupForm onSwitchToLogin={() => setMode('login')} />;
      case 'reset':
        return <PasswordResetForm onSwitchToLogin={() => setMode('login')} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backgroundColor: '#f9fafb' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2.5rem', width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>Welcome back</h1>
          <p style={{ color: '#6b7280', margin: 0 }}>Sign in to your account</p>
        </div>
        {renderForm()}
      </div>
    </div>
  );
}