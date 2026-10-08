import { useState, useEffect } from 'react';
import api from '../api/axios';

interface ServerConfig {
  serverUrl: string;
  redirectEnabled: boolean;
  redirectMessage?: string;
}

export const ServerRedirectModal = () => {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const checkServerConfig = async () => {
      try {
        const res = await api.get('/system/server-config');
        const data = res.data;
        if (data && data.redirectEnabled && data.serverUrl) {
          try {
            const currentOrigin = window.location.origin.toLowerCase();
            const targetOrigin = new URL(data.serverUrl).origin.toLowerCase();

            // Nếu máy trạm đang mở từ máy chủ cũ khác với máy chủ mục tiêu
            if (currentOrigin !== targetOrigin) {
              setConfig(data);
              setShouldRedirect(true);
            }
          } catch (e) {
            console.error('Lỗi phân tích serverUrl', e);
          }
        }
      } catch (err) {
        // Im lặng nếu không kết nối được
      }
    };

    checkServerConfig();
  }, []);

  // Đếm ngược tự động chuyển hướng
  useEffect(() => {
    if (!shouldRedirect || !config?.serverUrl) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      doRedirect();
    }
  }, [shouldRedirect, countdown, config]);

  const doRedirect = () => {
    if (!config?.serverUrl) return;
    try {
      const targetUrl = new URL(config.serverUrl);
      // Giữ nguyên path và search param nếu có
      targetUrl.pathname = window.location.pathname;
      targetUrl.search = window.location.search;
      targetUrl.hash = window.location.hash;
      window.location.href = targetUrl.toString();
    } catch {
      window.location.href = config.serverUrl;
    }
  };

  const handleDownloadShortcut = () => {
    if (!config?.serverUrl) return;
    window.open(`/api/system/download-shortcut?url=${encodeURIComponent(config.serverUrl)}`, '_blank');
  };

  if (!shouldRedirect || !config) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-blue-200 dark:border-blue-900/60 text-center space-y-5">
        
        {/* Animated Icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <span className="material-symbols-outlined text-[36px] animate-spin" style={{ animationDuration: '3s' }}>
            sync
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Chuyển Hướng Sang Máy Chủ Mới
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {config.redirectMessage || 'Hệ thống Quản lý Thiết bị Y tế đã được chuyển sang máy chủ mới.'}
          </p>
        </div>

        {/* Addresses Box */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-left space-y-2 text-xs sm:text-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Máy chủ cũ (Hiện tại):</span>
            <span className="line-through font-mono text-rose-500 dark:text-rose-400">{window.location.origin}</span>
          </div>
          <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2">
            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              Máy chủ mới:
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              {config.serverUrl}
            </span>
          </div>
        </div>

        {/* Countdown */}
        <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2">
          <span>Tự động chuyển tiếp sau:</span>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-sm">
            {countdown}s
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={doRedirect}
            className="flex-1 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">launch</span>
            Chuyển ngay bây giờ
          </button>
          <button
            onClick={handleDownloadShortcut}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm"
            title="Tải phím tắt để mở ứng dụng nhanh ngoài Desktop"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Phím tắt Desktop (.url)
          </button>
        </div>

      </div>
    </div>
  );
};
