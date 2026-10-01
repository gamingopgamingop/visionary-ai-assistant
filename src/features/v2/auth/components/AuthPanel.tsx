import React, { useState } from 'react';
import { useAuthV2, UserIdentityV2 } from '../hooks/useAuthV2';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { PasswordResetForm } from './PasswordResetForm';
import { SessionList } from './SessionList';
import { DeviceList } from './DeviceList';
import { SecurityStatus } from './SecurityStatus';
import { LoadingState, EmptyState } from '../../../shared/components';
import { Tab, TabList, TabPanel, Tabs } from '../../../shared/components/Tabs';

export function AuthPanel({ className = '' }: { className?: string }) {
  const { user, authenticated, loading, refetch } = useAuthV2();
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'devices' | 'security'>('overview');

  if (loading) {
    return <LoadingState message="Loading authentication..." fullScreen />;
  }

  if (!authenticated) {
    return <AuthUnauthenticatedView />;
  }

  return (
    <div className={`v2-auth-panel ${className}`} style={{ maxWidth: '800px', margin: '0 auto' }}>
      <AuthHeader user={user!} onRefresh={refetch} />
      
      <Tabs 
        activeTab={activeTab} 
        onChange={setActiveTab}
        className="v2-auth-tabs"
      >
        <TabList style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
          <Tab id="overview" label="Overview" />
          <Tab id="sessions" label="Sessions" />
          <Tab id="devices" label="Devices" />
          <Tab id="security" label="Security" />
        </TabList>
        
        <TabPanel id="overview">
          <SecurityStatus />
        </TabPanel>
        
        <TabPanel id="sessions">
          <SessionList />
        </TabPanel>
        
        <TabPanel id="devices">
          <DeviceList />
        </TabPanel>
        
        <TabPanel id="security">
          <SecurityStatus />
        </TabPanel>
      </Tabs>
    </div>
  );
}

function AuthHeader({ user, onRefresh }: { user: UserIdentityV2; onRefresh: () => void }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '1.5rem',
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div 
          style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            backgroundColor: '#dbeafe', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#1d4ed8',
            fontWeight: 600,
            fontSize: '1.25rem',
          }}
        >
          {user.email?.charAt(0).toUpperCase() || user.id.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.25rem' }}>
            {user.metadata.fullName || user.email || 'User'}
          </h2>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {user.email || 'No email'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <span style={{ 
          padding: '0.25rem 0.75rem', 
          backgroundColor: '#dbeafe', 
          color: '#1d4ed8', 
          borderRadius: '9999px', 
          fontSize: '0.75rem', 
          fontWeight: 500 
        }}>
          {user.role}
        </span>
        <button
          onClick={() => window.location.href = '/v2/auth/logout'}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function AuthUnauthenticatedView() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');

  const renderForm = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm
            onSwitchToSignup={() => setMode('signup')}
            onSwitchToPasswordReset={() => setMode('reset')}
          />
        );
      case 'signup':
        return (
          <SignupForm 
            onSwitchToLogin={() => setMode('login')} 
          />
        );
      case 'reset':
        return (
          <PasswordResetForm 
            onSwitchToLogin={() => setMode('login')} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backgroundColor: '#f9fafb' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2.5rem', width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
            Visionary AI Assistant
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>V2 Authentication System</p>
        </div>
        {renderForm()}
      </div>
    </div>
  );
}

export function AuthV2Page() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <AuthPanel />
    </div>
  );
}