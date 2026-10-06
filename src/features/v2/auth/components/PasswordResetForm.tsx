import React, { useState, useEffect } from 'react';
import { useAuthV2 } from '../hooks/useAuthV2';
import { ErrorDisplay } from '../../shared/components';

interface PasswordResetFormProps {
  onSwitchToLogin?: () => void;
  onSwitchToConfirm?: () => void;
  className?: string;
}

export function PasswordResetForm({
  onSwitchToLogin,
  className = '',
}: PasswordResetFormProps) {
  const { requestPasswordReset, loading, error } = useAuthV2();
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email) {
      setFormError('Please enter your email');
      return;
    }

    const result = await requestPasswordReset(email);
    
    if (result.success) {
      setSuccess(true);
    } else if (result.error) {
      setFormError(result.error);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: '1.5rem', color: '#059669', fontSize: '3rem' }}>
          ✓
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
          Check your email
        </h2>
        <p style={{ color: '#6b7280', margin: '0 0 1.5rem' }}>
          We've sent a password reset link to <strong>{email}</strong>.
        </p>
        <p style={{ color: '#6b7280', margin: '0 0 1.5rem', fontSize: '0.875rem' }}>
          The link will expire in 1 hour. If you don't see the email, check your spam folder.
        </p>
        <button
          onClick={onSwitchToLogin}
          style={{
            padding: '0.625rem 1.5rem',
            borderRadius: '0.375rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className={`v2-password-reset-form ${className}`} style={{ maxWidth: '400px', width: '100%' }}>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.5rem' }}>
            Reset password
          </h2>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Enter your email and we'll send you a reset link
          </p>
        </div>

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
            }}
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
          }}
        >
          {loading ? <span>Sending...</span> : 'Send reset link'}
        </button>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
          Remember your password?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              fontWeight: 500,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
}

export function PasswordResetConfirmForm({ 
  token, 
  onSuccess,
  className = '' 
}: { 
  token: string;
  onSuccess?: () => void;
  className?: string;
}) {
  const { confirmPasswordReset, loading, error } = useAuthV2();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!password || !confirmPassword) {
      setFormError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    const result = await confirmPasswordReset(token, password);
    
    if (result.success) {
      onSuccess?.();
    } else if (result.error) {
      setFormError(result.error);
    }
  };

  return (
    <div className={`v2-password-reset-confirm-form ${className}`} style={{ maxWidth: '400px', width: '100%' }}>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.5rem' }}>
            Set new password
          </h2>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="password" 
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}
          >
            New Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={loading}
            minLength={8}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
            }}
          />
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
            At least 8 characters
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label 
            htmlFor="confirmPassword" 
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}
          >
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
            }}
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
          }}
        >
          {loading ? <span>Resetting...</span> : 'Reset password'}
        </button>
      </form>
    </div>
  );
}