import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hàng đợi lưu thông báo nếu gọi trước khi Provider hoàn tất mount
const pendingToasts: Array<{ type: ToastType; message: string; title?: string; duration?: number }> = [];
let globalShowToast: ((type: ToastType, message: string, title?: string, duration?: number) => void) | null = null;

export const toast = {
  success: (message: string, title?: string, duration?: number) => {
    if (globalShowToast) {
      globalShowToast('success', message, title || 'Thành công', duration);
    } else {
      pendingToasts.push({ type: 'success', message, title: title || 'Thành công', duration });
    }
  },
  error: (message: string, title?: string, duration?: number) => {
    if (globalShowToast) {
      globalShowToast('error', message, title || 'Lỗi', duration);
    } else {
      pendingToasts.push({ type: 'error', message, title: title || 'Lỗi', duration });
    }
  },
  warning: (message: string, title?: string, duration?: number) => {
    if (globalShowToast) {
      globalShowToast('warning', message, title || 'Cảnh báo', duration);
    } else {
      pendingToasts.push({ type: 'warning', message, title: title || 'Cảnh báo', duration });
    }
  },
  info: (message: string, title?: string, duration?: number) => {
    if (globalShowToast) {
      globalShowToast('info', message, title || 'Thông báo', duration);
    } else {
      pendingToasts.push({ type: 'info', message, title: title || 'Thông báo', duration });
    }
  }
};

// Polyfill window.alert ngay từ module load để chặn hoàn toàn "localhost:5173 says"
if (typeof window !== 'undefined') {
  window.alert = (msg: any) => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
    const lower = text.toLowerCase();
    if (lower.includes('thành công') || lower.includes('success')) {
      toast.success(text);
    } else if (lower.includes('lỗi') || lower.includes('thất bại') || lower.includes('không thành công') || lower.includes('error') || lower.includes('failed')) {
      toast.error(text);
    } else if (lower.includes('cảnh báo') || lower.includes('vui lòng') || lower.includes('chú ý') || lower.includes('hãy') || lower.includes('warning') || lower.includes('không có')) {
      toast.warning(text);
    } else {
      toast.info(text);
    }
  };
}

const TOAST_CONFIG = {
  error: {
    bg: 'bg-[#feecee] dark:bg-[#2b1216] border border-rose-200 dark:border-rose-900/60 shadow-rose-500/10',
    bar: 'bg-rose-500',
    iconColor: 'text-rose-500',
    titleColor: 'text-rose-800 dark:text-rose-200',
    textColor: 'text-rose-700 dark:text-rose-300',
    closeColor: 'text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/40',
    defaultTitle: 'Lỗi',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
      </svg>
    )
  },
  success: {
    bg: 'bg-[#e6f9ed] dark:bg-[#0c2419] border border-emerald-200 dark:border-emerald-900/60 shadow-emerald-500/10',
    bar: 'bg-emerald-500',
    iconColor: 'text-emerald-500',
    titleColor: 'text-emerald-800 dark:text-emerald-200',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    closeColor: 'text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
    defaultTitle: 'Thành công',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  },
  warning: {
    bg: 'bg-[#fffbeb] dark:bg-[#291b07] border border-amber-200 dark:border-amber-900/60 shadow-amber-500/10',
    bar: 'bg-amber-500',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-800 dark:text-amber-200',
    textColor: 'text-amber-700 dark:text-amber-300',
    closeColor: 'text-amber-400 hover:text-amber-700 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40',
    defaultTitle: 'Cảnh báo',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    )
  },
  info: {
    bg: 'bg-[#eff6ff] dark:bg-[#0c192c] border border-blue-200 dark:border-blue-900/60 shadow-blue-500/10',
    bar: 'bg-blue-500',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800 dark:text-blue-200',
    textColor: 'text-blue-700 dark:text-blue-300',
    closeColor: 'text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40',
    defaultTitle: 'Thông báo',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    )
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, title?: string, duration = 3800) => {
    const id = Math.random().toString(36).substring(2, 9) + Date.now();
    const finalTitle = title || TOAST_CONFIG[type].defaultTitle;
    
    setToasts(prev => [...prev, { id, type, title: finalTitle, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((message: string, title?: string, duration?: number) => {
    showToast('success', message, title, duration);
  }, [showToast]);

  const error = useCallback((message: string, title?: string, duration?: number) => {
    showToast('error', message, title, duration);
  }, [showToast]);

  const warning = useCallback((message: string, title?: string, duration?: number) => {
    showToast('warning', message, title, duration);
  }, [showToast]);

  const info = useCallback((message: string, title?: string, duration?: number) => {
    showToast('info', message, title, duration);
  }, [showToast]);

  useEffect(() => {
    globalShowToast = showToast;

    // Kích hoạt các thông báo đang chờ nếu có
    while (pendingToasts.length > 0) {
      const item = pendingToasts.shift();
      if (item) {
        showToast(item.type, item.message, item.title, item.duration);
      }
    }

    return () => {
      globalShowToast = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, success, error, warning, info }}>
      {children}
      
      {/* Toast Container cố định tại góc trên bên phải màn hình */}
      <div 
        className="fixed top-5 right-5 z-[999999] flex flex-col gap-3 pointer-events-none max-w-sm sm:max-w-md w-full select-none"
        aria-live="polite"
      >
        {toasts.map(t => {
          const c = TOAST_CONFIG[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto relative overflow-hidden rounded-xl shadow-xl transition-all duration-300 transform translate-y-0 opacity-100 animate-in fade-in slide-in-from-top-3 ${c.bg} p-3.5 pr-8 flex items-start gap-3 backdrop-blur-md`}
            >
              {/* Dải màu nhấn đứng góc trái (như Hình 2) */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${c.bar}`} />

              {/* Biểu tượng trạng thái hình tròn */}
              <div className={`mt-0.5 ${c.iconColor}`}>
                {c.icon}
              </div>

              {/* Nội dung thông báo */}
              <div className="flex-1 min-w-0 pr-1">
                <h4 className={`font-bold text-sm ${c.titleColor} leading-tight`}>
                  {t.title}
                </h4>
                <p className={`text-xs sm:text-sm mt-0.5 ${c.textColor} leading-snug whitespace-pre-line break-words`}>
                  {t.message}
                </p>
              </div>

              {/* Nút đóng X ở góc trên bên phải */}
              <button
                onClick={() => removeToast(t.id)}
                className={`absolute top-2 right-2 p-1 rounded-lg transition-colors ${c.closeColor}`}
                title="Đóng thông báo"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
