'use client';

import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: React.ReactNode;
}

const styles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  secondary: {
    background: '#f1f5f9',
    color: '#334155',
    border: '1px solid #e2e8f0',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  danger: {
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  ghost: {
    background: 'transparent',
    color: '#475569',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
};

export function Button({ variant = 'primary', children, style, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      style={{ ...styles[variant], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
