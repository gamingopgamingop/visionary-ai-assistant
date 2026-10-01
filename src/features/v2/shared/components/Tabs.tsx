import React, { useState, useRef, useEffect } from 'react';

interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabProps {
  id: string;
  label: string;
  disabled?: boolean;
  className?: string;
}

interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

interface TabsProps {
  activeTab: string;
  onChange: (tabId: string) => void;
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Tabs({ 
  activeTab, 
  onChange, 
  children, 
  className = '',
  orientation = 'horizontal',
}: TabsProps) {
  return (
    <div 
      className={`v2-tabs ${className}`}
      role="tablist"
      aria-orientation={orientation}
      style={{ display: 'flex', flexDirection: orientation }}
    >
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          activeTab,
          onChange,
        } as any);
      })}
    </div>
  );
}

export function TabList({ children, className = '' }: TabListProps) {
  return (
    <div 
      role="presentation"
      className={`v2-tab-list ${className}`}
      style={{ display: 'flex', gap: '0.25rem' }}
    >
      {children}
    </div>
  );
}

export function Tab({ 
  id, 
  label, 
  disabled = false, 
  className = '',
  activeTab,
  onChange,
}: TabProps & { activeTab: string; onChange: (id: string) => void }) {
  const isActive = activeTab === id;
  const [focused, setFocused] = useState(false);

  const handleClick = () => {
    if (!disabled) {
      onChange(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onChange(id);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        // Focus next tab would be handled by parent
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        // Focus previous tab would be handled by parent
        break;
    }
  };

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      id={`tab-${id}`}
      aria-controls={`panel-${id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={handleClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={handleKeyDown}
      className={`v2-tab ${className}`}
      style={{
        padding: '0.625rem 1rem',
        borderRadius: '0.375rem',
        fontWeight: 500,
        fontSize: '0.875rem',
        color: isActive ? '#1f2937' : '#6b7280',
        backgroundColor: isActive ? '#f3f4f6' : 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => { if (!disabled && !isActive) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
      onMouseLeave={(e) => { if (!disabled && !isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {label}
    </button>
  );
}

interface TabPanelsProps {
  children: React.ReactNode;
  className?: string;
}

export function TabPanels({ children, className = '' }: TabPanelsProps) {
  return (
    <div className={`v2-tab-panels ${className}`}>
      {children}
    </div>
  );
}

export function TabPanel({ 
  id, 
  children, 
  className = '',
  activeTab,
}: TabPanelProps & { activeTab: string }) {
  const isActive = activeTab === id;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={`v2-tab-panel ${className}`}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      {children}
    </div>
  );
}

// Helper to compose Tabs with TabList, TabPanels, etc.
export function createTabs() {
  return {
    Root: Tabs,
    List: TabList,
    Tab,
    Panels: TabPanels,
    Panel: TabPanel,
  };
}

export const TabsComponents = createTabs();