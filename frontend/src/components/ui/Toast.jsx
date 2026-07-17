import React, { useEffect, useState } from 'react';

const icons = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
  };

  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] max-w-[360px] w-[calc(100%-32px)] transition-all duration-300 ${
      visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-3 scale-95'
    }`}>
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-lg ${styles[type] || styles.success}`}>
        <span className="shrink-0 opacity-90">{icons[type] || icons.success}</span>
        <p className="text-[13px] font-semibold">{message}</p>
      </div>
    </div>
  );
}
