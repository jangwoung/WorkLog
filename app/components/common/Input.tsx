'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, style, ...rest }: InputProps) {
  const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);
  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          fontSize: '0.875rem',
          border: `1px solid ${error ? '#f87171' : '#e2e8f0'}`,
          borderRadius: '6px',
          ...style,
        }}
        {...rest}
      />
      {error && (
        <span style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.25rem', display: 'block' }}>
          {error}
        </span>
      )}
    </div>
  );
}
