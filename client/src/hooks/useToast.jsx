import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, isError = false) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, isError, show: false }]);

    // Trigger show animation
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, show: true } : t))
      );
    }, 50);

    // Auto-remove after 4s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, show: false } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 500);
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '30px',
          left: '30px',
          zIndex: 4000,
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast${toast.isError ? ' error' : ''}${toast.show ? ' show' : ''}`}
          >
            <span>{toast.isError ? '❌' : '✅'}</span> {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
