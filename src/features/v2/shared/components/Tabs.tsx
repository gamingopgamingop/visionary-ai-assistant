import React, { createContext, useContext } from 'react';

interface TabsContextValue {
  activeTab: string;
  onChange: (tabId: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

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
    <TabsContext.Provider value={{ activeTab, onChange }}>
      <div
        className={`v2-tabs ${className}`}
        style={{ display: 'flex', flexDirection: orientation }}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function TabList({ children, className = '', style }: TabListProps) {
  return (
    <div
      role="tablist"
      className={`v2-tab-list ${className}`}
      style={{ display: 'flex', gap: '0.25rem', ...style }}
    >
      {children}
    </div>
  );
}

interface TabProps {
  id: string;
  label: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Tab({ id, label, disabled = false, className = '', style }: TabProps) {
  const ctx = useContext(TabsContext);
  const isActive = ctx?.activeTab === id;

  const handleClick = () => {
    if (!disabled) ctx?.onChange(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ctx?.onChange(id);
    }
  };

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      id={`tab-${id}`}
      aria-controls={`panel-${id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={handleClick}
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
        ...style,
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
  return <div className={`v2-tab-panels ${className}`}>{children}</div>;
}

interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function TabPanel({ id, children, className = '', style }: TabPanelProps) {
  const ctx = useContext(TabsContext);
  const isActive = ctx?.activeTab === id;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={`v2-tab-panel ${className}`}
      style={{ animation: 'fadeIn 0.2s ease-out', ...style }}
    >
      {children}
    </div>
  );
}

export const TabsComponents = { Tabs, TabList, Tab, TabPanels, TabPanel };
