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
      container: 'bg-slate-900 dark:bg-slate-800 border-emerald-700 dark:border-emerald-600',
      icon: (
        <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded bg-emerald-600 dark:bg-emerald-500">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ),
      text: 'text-slate-100 dark:text-slate-100',
    },
    error: {
      container: 'bg-slate-900 dark:bg-slate-800 border-red-700 dark:border-red-600',
      icon: (
        <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded bg-red-600 dark:bg-red-500">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      ),
      text: 'text-slate-100 dark:text-slate-100',
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
                  ${style.container}
                  border
                  px-4 py-3 rounded-md
                  shadow-xl shadow-black/30
                  min-w-[300px] max-w-md
                  ${isExiting ? 'animate-fadeOut' : 'animate-slideDown'}`}
    >
      {style.icon}
      <span className={`font-medium text-sm flex-1 font-mono ${style.text}`}>{message}</span>
      <button
        onClick={handleClose}
        className="text-slate-500 hover:text-slate-300 dark:text-slate-500 dark:hover:text-slate-300
                   rounded p-0.5 transition-colors duration-150"
        aria-label="닫기"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
