import React, { useState } from 'react';
import { useAuthV2 } from '../hooks/useAuthV2';
import { LoadingState, ErrorDisplay } from '../../shared/components';

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  className?: string;
}

export function SignupForm({
  onSuccess,
  onSwitchToLogin,
  className = '',
}: SignupFormProps) {
  const { signup, loading, error } = useAuthV2();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password || !confirmPassword) {
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

    const result = await signup(email, password, undefined);
    
    if (result.success) {
      onSuccess?.();
    } else if (result.error) {
      setFormError(result.error);
    }
  };

  return (
    <div className={`v2-signup-form ${className}`} style={{ maxWidth: '400px', width: '100%' }}>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="fullName" 
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}
          >
            Full Name (optional)
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
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

        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="password" 
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}
          >
            Password
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
          {loading ? <span>Creating account...</span> : 'Create account'}
        </button>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
          Already have an account?{' '}
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

export function SignupPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backgroundColor: '#f9fafb' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2.5rem', width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>Create account</h1>
          <p style={{ color: '#6b7280', margin: 0 }}>Enter your details to get started</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}