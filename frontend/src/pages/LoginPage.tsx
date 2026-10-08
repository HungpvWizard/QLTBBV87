import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập tài khoản và mật khẩu.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number, data?: { message?: string } }, message?: string };
      let msg = 'Tài khoản hoặc mật khẩu không đúng.';
      if (anyErr.response) {
         if (anyErr.response.status === 500) msg = 'Lỗi máy chủ (500). Vui lòng xem log backend.';
         else if (anyErr.response.data?.message) msg = anyErr.response.data.message;
      } else if (anyErr.message === 'Network Error') {
         msg = 'Không thể kết nối đến máy chủ. Máy chủ có thể chưa chạy.';
      } else if (anyErr.message) {
         msg = `Lỗi: ${anyErr.message}`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex justify-center items-center p-0 sm:p-4"
      style={{
        background:
          'radial-gradient(circle at 50% 15%, rgba(26,35,126,0.45) 0%, rgba(10,14,39,1) 75%), #0a0e27',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Lưới kỹ thuật số */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundSize: '32px 32px',
          backgroundImage:
            'linear-gradient(to right, rgba(0,195,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,195,255,0.05) 1px, transparent 1px)',
        }}
      />

      {/* Khung chính */}
      <div
        className="relative w-full max-w-[420px] min-h-screen sm:min-h-0 flex flex-col justify-between p-6 sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100"
        style={{ border: '1px solid rgba(0,210,255,0.15)' }}
      >
        {/* Đường mạch điện trái */}
        <svg
          className="absolute top-12 left-0 w-48 h-32 opacity-20 pointer-events-none"
          viewBox="0 0 200 120" fill="none" stroke="#00c3ff" strokeWidth="1.5"
        >
          <path d="M0,20 H80 L110,50 H170" strokeDasharray="3 3" />
          <circle cx="170" cy="50" r="3" fill="#00c3ff" />
          <path d="M0,60 H40 L65,85 H130" />
          <circle cx="130" cy="85" r="3" fill="#00c3ff" />
        </svg>

        {/* Đường mạch điện phải */}
        <svg
          className="absolute top-44 right-0 w-44 h-32 opacity-20 pointer-events-none"
          viewBox="0 0 200 120" fill="none" stroke="#00c3ff" strokeWidth="1.5"
        >
          <path d="M200,30 H120 L95,55 H30" />
          <circle cx="30" cy="55" r="3" fill="#00c3ff" />
        </svg>

        {/* ===== HEADER ===== */}
        <header className="w-full pt-1 pb-4 flex flex-col items-center z-10">
          {/* Status Bar */}
          <div className="w-full flex justify-between items-center text-xs text-slate-400 font-medium px-2 mb-6">
            <span>{currentTime}</span>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 18.25c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l.64-.64C7.93 20.26 9.88 21 12 21s4.07-.74 5.61-1.97l.64.64c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-.62-.64C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
              </svg>
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z"/>
              </svg>
              <div className="w-5 h-2.5 border border-slate-400 rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-slate-300 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="relative mb-5">
            <div
              className="w-24 h-24 rounded-full p-1 flex items-center justify-center shadow-xl"
              style={{
                background: 'linear-gradient(to bottom, #22d3ee, #1d4ed8)',
                boxShadow: '0 0 25px rgba(0,210,255,0.4)',
              }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white p-0.5"
                style={{ border: '2px solid rgba(103,232,249,0.4)' }}
              >
                <img
                  src="/logo-bvqy87.png"
                  alt="Logo Bệnh Viện Quân Y 87"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          <h1 className="text-lg font-bold text-center uppercase tracking-wide text-white leading-tight">
            HỆ THỐNG QUẢN LÝ<br />
            <span className="text-cyan-400 text-xl font-extrabold tracking-normal">THIẾT BỊ Y TẾ</span>
          </h1>

          <div
            className="mt-3 flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs text-cyan-200"
            style={{ background: 'rgba(18,28,59,0.8)', border: '1px solid rgba(6,182,212,0.3)', backdropFilter: 'blur(8px)' }}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Cơ sở chính: <strong>Bệnh viện Quân y 87</strong></span>
            <svg className="w-3 h-3 text-cyan-400 ml-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </header>

        {/* ===== FORM ĐĂNG NHẬP ===== */}
        <main
          className="w-full rounded-2xl p-5 shadow-xl z-10 my-auto"
          style={{
            background: 'rgba(16,24,52,0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(0,210,255,0.18)',
          }}
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Lỗi */}
            {error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm text-red-300 bg-red-900/30 border border-red-500/30">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Tài khoản */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Tài khoản / Email đăng nhập</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập hoặc email"
                  autoComplete="username"
                  autoFocus
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 rounded-xl text-sm font-medium placeholder-slate-400 border border-slate-200 shadow-sm outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white text-slate-900 rounded-xl text-sm font-medium placeholder-slate-400 border border-slate-200 shadow-sm outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Ghi nhớ & Quên mật khẩu */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-400"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <a href="#" className="text-cyan-400 hover:underline font-medium">Quên mật khẩu?</a>
            </div>

            {/* Nút đăng nhập */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm tracking-wide active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(to right, #2563eb, #22d3ee)',
                boxShadow: '0 4px 20px rgba(34,211,238,0.25)',
              }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  <span>ĐĂNG NHẬP</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-700/60" />
              <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium">Hoặc xác thực nhanh</span>
              <div className="flex-grow border-t border-slate-700/60" />
            </div>

            {/* Face ID & Vân tay */}
            <div className="grid grid-cols-2 gap-3 pt-0.5">
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-200 transition-colors hover:brightness-125"
                style={{ background: 'rgba(23,35,71,0.8)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2m-10 0H5a2 2 0 01-2-2v-2" />
                  <circle cx="9" cy="9" r="1" fill="currentColor"/>
                  <circle cx="15" cy="9" r="1" fill="currentColor"/>
                  <path strokeLinecap="round" d="M10 14a2 2 0 004 0" />
                </svg>
                <span>Face ID</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-200 transition-colors hover:brightness-125"
                style={{ background: 'rgba(23,35,71,0.8)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3-2 5-2 5m4-5c0 4-1 6-2 7m0-16a7 7 0 00-7 7c0 3 1.5 5.5 3 7m8-14a7 7 0 017 7c0 2.5-1.5 5-3 6.5" />
                </svg>
                <span>Vân tay</span>
              </button>
            </div>
          </form>
        </main>

        {/* ===== FOOTER ===== */}
        <footer className="w-full pt-4 pb-2 text-center text-xs text-slate-400 space-y-3 z-10">
          <div className="flex justify-center items-center gap-4">
            <a href="#" className="flex items-center gap-1 hover:text-cyan-300 transition-colors">
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Hướng dẫn sử dụng</span>
            </a>
            <span className="text-slate-600">|</span>
            <a href="#" className="flex items-center gap-1 hover:text-cyan-300 transition-colors">
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>Tổng đài kỹ thuật</span>
            </a>
          </div>
          <div className="pt-2 text-[11px] text-slate-500 space-y-1">
            <div>Phát triển bởi <strong className="text-cyan-400 font-semibold">Phạm Văn Hùng</strong></div>
            <div className="flex items-center justify-center gap-2">
              <span>Bản quyền © CNTT</span>
              <span>•</span>
              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-400" style={{ background: '#1e293b', border: '1px solid #334155' }}>v2.4.0</span>
            </div>
          </div>
          <div className="w-32 h-1 bg-slate-700 rounded-full mx-auto mt-3 opacity-60" />
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;

