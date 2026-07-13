import React, { useEffect, useState } from 'react';

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: 'bg-text text-white',
    error: 'bg-danger text-white',
    info: 'bg-accent text-white',
    warning: 'bg-warning text-white',
  };

  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] max-w-[360px] w-[calc(100%-32px)] transition-all duration-200 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
    }`}>
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg ${styles[type] || styles.success}`}>
        <p className="text-[13px] font-medium">{message}</p>
      </div>
    </div>
  );
}
