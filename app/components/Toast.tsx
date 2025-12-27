'use client';

import { useEffect, useState, useCallback } from 'react';

interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error';
  duration?: number;
  onClose: (id: string) => void;
}

export function Toast({ id, message, type, duration = 3000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 200);
  }, [id, onClose]);

  useEffect(() => {
    const timer = setTimeout(() => handleClose(), duration);
    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  const styles = {
    success: {
      bg: 'bg-emerald-500',
      shadow: 'shadow-lg shadow-emerald-200',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-red-500',
      shadow: 'shadow-lg shadow-red-200',
      icon: <span className="text-xl flex-shrink-0">⚠️</span>,
    },
  };

  const style = styles[type];

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50
                  flex items-center gap-3
                  ${style.bg} text-white
                  px-5 py-4 rounded-2xl
                  ${style.shadow}
                  min-w-[320px] max-w-md
                  ${isExiting ? 'animate-fadeOut' : 'animate-slideDown'}`}
    >
      {style.icon}
      <span className="font-semibold flex-1">{message}</span>
      <button
        onClick={handleClose}
        className="hover:bg-white/20 rounded-lg p-1 transition-colors"
        aria-label="닫기"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
