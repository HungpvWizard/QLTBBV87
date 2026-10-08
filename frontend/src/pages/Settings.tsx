import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Settings as SettingsIcon,
  User, 
  Router, 
  Database, 
  CalendarClock, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  QrCode, 
  Save, 
  Trash2, 
  RefreshCw, 
  X, 
  ShieldCheck, 
  Laptop,
  HardDrive,
  Lock,
  KeyRound,
  ShieldAlert,
  Search,
  Check,
  Activity
} from 'lucide-react';

const Settings = () => {
  const { user, clearDefaultPasswordWarning } = useAuth();
  const [name, setName] = useState(localStorage.getItem('userName') || user?.fullName || 'Phạm Văn Hùng');
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || user?.email || 'hungfcvn@gmail.com');
  const [avatar, setAvatar] = useState(localStorage.getItem('userAvatar') || '');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Password Change State ────────────────────────────────────────────────
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Security Audit Logs State (Admin only) ───────────────────────────────
  type AuditLogItem = {
    id: number;
    action: string;
    username: string;
    ipAddress: string | null;
    details: string | null;
    isSuccess: boolean;
    timestamp: string;
  };
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotalItems, setAuditTotalItems] = useState(0);
  const [auditMsg, setAuditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Server URL & Redirection State ───────────────────────────────────────
  const [serverUrl, setServerUrl] = useState('');
  const [redirectEnabled, setRedirectEnabled] = useState(false);
  const [redirectMsg, setRedirectMsg] = useState('Hệ thống Quản lý Thiết bị Y tế đã được chuyển sang địa chỉ máy chủ mới. Đang tự động chuyển hướng...');
  const [detectedIps, setDetectedIps] = useState<string[]>([]);
  const [machineName, setMachineName] = useState('');
  const [serverSaving, setServerSaving] = useState(false);
  const [serverSavedMsg, setServerSavedMsg] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // ── Backup / Restore State ───────────────────────────────────────────────
  type BackupFile = { filename: string; createdAt: string; sizeBytes: number; sizeText: string };
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setBackupMsg({ type, text });
    setTimeout(() => setBackupMsg(null), 5000);
  };

  const fetchBackups = useCallback(async () => {
    try {
      const res = await api.get('/backup');
      setBackups(res.data);
    } catch {
      // im lặng nếu lỗi list
    }
  }, []);

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await api.post('/backup/create');
      showMsg('success', `Đã tạo bản sao lưu thành công (${res.data.filename})`);
      await fetchBackups();
    } catch (err: any) {
      showMsg('error', err?.response?.data?.message || 'Lỗi tạo backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownload = (filename: string) => {
    window.open(`/api/backup/download/${encodeURIComponent(filename)}`, '_blank');
  };

  const handleRestoreFromServer = async (filename: string) => {
    setConfirmRestore(null);
    setBackupLoading(true);
    try {
      const res = await api.post(`/backup/restore/${encodeURIComponent(filename)}`);
      showMsg('success', res.data.message);
      await fetchBackups();
    } catch (err: any) {
      showMsg('error', err?.response?.data?.message || 'Lỗi khôi phục.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(`Xóa bản sao lưu "${filename}"?`)) return;
    try {
      await api.delete(`/backup/${encodeURIComponent(filename)}`);
      showMsg('success', `Đã xóa bản sao lưu "${filename}".`);
      await fetchBackups();
    } catch (err: any) {
      showMsg('error', err?.response?.data?.message || 'Lỗi xóa.');
    }
  };

  const handleUploadRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.db')) {
      showMsg('error', 'Chỉ chấp nhận file SQLite database định dạng .db');
      return;
    }
    if (!window.confirm(`Khôi phục từ file "${file.name}"?\nThao tác này sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại.\nDữ liệu cũ sẽ được tự động backup trước khi ghi đè.`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploadProgress(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/backup/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showMsg('success', res.data.message);
      await fetchBackups();
    } catch (err: any) {
      showMsg('error', err?.response?.data?.message || 'Lỗi upload.');
    } finally {
      setUploadProgress(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Schedule (Lịch tự động) State ────────────────────────────────────────
  type ScheduleConfig = {
    enabled: boolean;
    intervalHours: number;
    startHour: number;
    maxBackupsToKeep: number;
    lastAutoBackupAt: string | null;
    nextBackupAt: string | null;
    countdownText: string | null;
  };
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    enabled: false,
    intervalHours: 24,
    startHour: 2,
    maxBackupsToKeep: 10,
    lastAutoBackupAt: null,
    nextBackupAt: null,
    countdownText: null,
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await api.get('/backup/schedule');
      setSchedule(res.data);
    } catch { /* im lặng */ }
  }, []);

  const handleSaveSchedule = async () => {
    setScheduleSaving(true);
    try {
      const res = await api.post('/backup/schedule', {
        enabled: schedule.enabled,
        intervalHours: schedule.intervalHours,
        startHour: schedule.startHour,
        maxBackupsToKeep: schedule.maxBackupsToKeep,
      });
      showMsg('success', res.data.message);
      await fetchSchedule();
    } catch (err: any) {
      showMsg('error', err?.response?.data?.message || 'Lỗi lưu cấu hình lịch.');
    } finally {
      setScheduleSaving(false);
    }
  };

  const INTERVAL_OPTIONS = [
    { value: 6,   label: 'Mỗi 6 giờ' },
    { value: 12,  label: 'Mỗi 12 giờ' },
    { value: 24,  label: 'Hàng ngày (24 giờ)' },
    { value: 48,  label: 'Mỗi 2 ngày' },
    { value: 72,  label: 'Mỗi 3 ngày' },
    { value: 168, label: 'Hàng tuần (7 ngày)' },
  ];

  const fetchServerConfig = useCallback(async () => {
    try {
      const res = await api.get('/system/server-config');
      if (res.data) {
        setServerUrl(res.data.serverUrl || window.location.origin);
        setRedirectEnabled(!!res.data.redirectEnabled);
        if (res.data.redirectMessage) setRedirectMsg(res.data.redirectMessage);
        setDetectedIps(res.data.detectedIps || []);
        setMachineName(res.data.machineName || '');
      }
    } catch (err) {
      console.error('Lỗi tải cấu hình máy chủ', err);
    }
  }, []);

  // ── Fetch Audit Logs (Admin only) ─────────────────────────────────────────
  const fetchAuditLogs = useCallback(async (page = 1) => {
    if (user?.role !== 'Admin') return;
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', '15');
      if (auditSearch.trim()) params.append('search', auditSearch.trim());
      if (auditAction) params.append('action', auditAction);

      const res = await api.get(`/system/audit-logs?${params.toString()}`);
      setAuditLogs(res.data.items || []);
      setAuditTotalPages(res.data.totalPages || 1);
      setAuditTotalItems(res.data.totalItems || 0);
      setAuditPage(page);
    } catch {
      // im lặng nếu không có quyền
    } finally {
      setAuditLoading(false);
    }
  }, [user, auditSearch, auditAction]);

  useEffect(() => {
    fetchBackups();
    fetchSchedule();
    fetchServerConfig();
    if (user?.role === 'Admin') {
      fetchAuditLogs(1);
    }
  }, [fetchBackups, fetchSchedule, fetchServerConfig, fetchAuditLogs, user]);

  const handleSaveServerConfig = async () => {
    if (!serverUrl.trim()) {
      alert('Vui lòng nhập địa chỉ máy chủ!');
      return;
    }
    try {
      setServerSaving(true);
      await api.post('/system/server-config', {
        serverUrl: serverUrl.trim(),
        redirectEnabled,
        redirectMessage: redirectMsg.trim()
      });
      setServerSavedMsg('Đã lưu cấu hình địa chỉ máy chủ thành công! Các máy trạm khi truy cập địa chỉ cũ sẽ tự động được chuyển hướng sang link mới.');
      setTimeout(() => setServerSavedMsg(null), 7000);
    } catch (err: any) {
      alert('Lỗi lưu cấu hình máy chủ: ' + (err?.response?.data?.message || err.message));
    } finally {
      setServerSaving(false);
    }
  };

  const handleDownloadShortcut = () => {
    const target = serverUrl.trim() || window.location.origin;
    window.open(`/api/system/download-shortcut?url=${encodeURIComponent(target)}`, '_blank');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Vui lòng chọn ảnh có định dạng PNG hoặc JPG!');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Kích thước ảnh không được vượt quá 2MB!');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateInfo = () => {
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    if (avatar) {
      localStorage.setItem('userAvatar', avatar);
    } else {
      localStorage.removeItem('userAvatar');
    }

    try {
      const savedUser = localStorage.getItem('assetflow_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        u.fullName = name;
        u.email = email;
        u.avatar = avatar;
        localStorage.setItem('assetflow_user', JSON.stringify(u));
      }
    } catch {}

    window.dispatchEvent(new Event('userUpdated'));
    alert('Cập nhật thông tin tài khoản và ảnh đại diện thành công!');
  };

  // ── Password Validation & Change Handler ──────────────────────────────────
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, text: '', color: '' };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[a-zA-Z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) score++;
    if (newPassword.length >= 10) score++;

    if (score <= 2) return { score: 1, text: 'Mật khẩu yếu (cần tối thiểu 8 ký tự gồm cả chữ và số)', color: 'text-rose-400 bg-rose-500' };
    if (score <= 4) return { score: 2, text: 'Mật khẩu khá an toàn', color: 'text-amber-400 bg-amber-500' };
    return { score: 3, text: 'Mật khẩu rất mạnh & an toàn tuyệt đối', color: 'text-emerald-400 bg-emerald-500' };
  }, [newPassword]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (!oldPassword) {
      setPwdMsg({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại.' });
      return;
    }

    if (newPassword.length < 8) {
      setPwdMsg({ type: 'error', text: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' });
      return;
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPwdMsg({ type: 'error', text: 'Mật khẩu mới phải bao gồm cả chữ cái và chữ số.' });
      return;
    }

    if (newPassword === oldPassword) {
      setPwdMsg({ type: 'error', text: 'Mật khẩu mới không được trùng với mật khẩu cũ.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'Xác nhận mật khẩu mới không khớp.' });
      return;
    }

    setPwdLoading(true);
    try {
      const res = await api.post('/auth/change-password', {
        oldPassword,
        newPassword
      });
      setPwdMsg({ type: 'success', text: res.data?.message || 'Đổi mật khẩu thành công!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      clearDefaultPasswordWarning();
      if (user?.role === 'Admin') fetchAuditLogs(1);
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err?.response?.data?.message || 'Lỗi đổi mật khẩu.' });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleClearOldLogs = async () => {
    if (!window.confirm('Xác nhận dọn dẹp các bản ghi nhật ký kiểm toán bảo mật cũ hơn 30 ngày?')) return;
    try {
      const res = await api.post('/system/audit-logs/clear-old?days=30');
      setAuditMsg({ type: 'success', text: res.data?.message || 'Đã dọn dẹp nhật ký cũ.' });
      setTimeout(() => setAuditMsg(null), 5000);
      fetchAuditLogs(1);
    } catch (err: any) {
      setAuditMsg({ type: 'error', text: err?.response?.data?.message || 'Lỗi dọn dẹp nhật ký.' });
    }
  };

  // KPI calculations
  const stats = useMemo(() => {
    const totalBackups = backups.length;
    const isAutoBackup = schedule.enabled;
    const currentHost = window.location.hostname;
    return { totalBackups, isAutoBackup, currentHost };
  }, [backups, schedule]);

  return (
    <div className="space-y-6">
      {/* 1. MODULE HEADER BANNER SQUIRCLE GRADIENT */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c142c] via-[#0f1b3d] to-[#0c142c] border border-blue-500/20 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 shrink-0">
              <SettingsIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Cấu hình Hệ thống &amp; Bảo mật
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Chuẩn An Toàn OWASP
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400 font-medium">
                Quản lý địa chỉ LAN IP máy chủ, sao lưu phục hồi dữ liệu SQLite, đổi mật khẩu an toàn và nhật ký kiểm toán bảo mật
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => { fetchBackups(); fetchSchedule(); fetchServerConfig(); if (user?.role === 'Admin') fetchAuditLogs(1); }}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 transition-all font-semibold text-sm flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              title="Làm mới toàn bộ thông số cấu hình"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>Làm mới</span>
            </button>

            <button
              onClick={handleCreateBackup}
              disabled={backupLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer active:scale-95 border border-cyan-300/30 disabled:opacity-60"
            >
              <Database className="w-4 h-4" />
              <span>{backupLoading ? 'Đang xử lý...' : 'Tạo Backup Ngay'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CỤM 4 THẺ KPI SQUIRCLE GRADIENT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Bản sao lưu */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-blue-500/20 bg-[#0c142c]/90 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">Bản sao lưu SQLite</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-cyan-400">{stats.totalBackups}</span>
                <span className="text-xs text-slate-400">bản</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Được lưu trữ an toàn trong /backups</p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Database className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Trạng thái dữ liệu</span>
            <span className="text-cyan-400 font-bold">An toàn 100%</span>
          </div>
        </div>

        {/* KPI 2: Lịch sao lưu tự động */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-500/20 bg-[#0c142c]/90 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">Tự động sao lưu</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-emerald-400">
                  {stats.isAutoBackup ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">
                {stats.isAutoBackup ? `Chu kỳ mỗi ${schedule.intervalHours}h` : 'Cần bật để bảo vệ định kỳ'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CalendarClock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Tiến trình nền</span>
            <span className={stats.isAutoBackup ? "text-emerald-400 font-bold" : "text-slate-400 font-medium"}>
              {stats.isAutoBackup ? "Hoạt động" : "Tạm dừng"}
            </span>
          </div>
        </div>

        {/* KPI 3: Máy chủ mạng LAN */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-purple-500/20 bg-[#0c142c]/90 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-300/80">Địa chỉ truy cập LAN</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-lg font-mono font-black text-purple-400 truncate max-w-[170px]" title={serverUrl || stats.currentHost}>
                  {stats.currentHost}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Máy chủ: {machineName || 'SERVER'}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Router className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Cổng phục vụ</span>
            <span className="text-purple-400 font-mono font-bold">:5000</span>
          </div>
        </div>

        {/* KPI 4: Phiên bản & Bảo mật */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-amber-500/20 bg-[#0c142c]/90 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">Bảo mật hệ thống</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-xl font-black text-amber-400">OWASP Pro</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Chống Brute-Force &amp; Headers</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Tình trạng tài khoản</span>
            <span className={user?.isDefaultPassword ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
              {user?.isDefaultPassword ? "Cần đổi mật khẩu!" : "An toàn"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. CÁC SECTION NỘI DUNG SQUIRCLE GLASS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Section 1: Thông tin tài khoản */}
        <div className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/70 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Thông tin Tài khoản</h3>
              <p className="text-xs text-slate-400">Hồ sơ cá nhân và ảnh đại diện hiển thị</p>
            </div>
          </div>

          <div className="p-6 space-y-4 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Email liên hệ</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Vai trò hệ thống</label>
              <input
                type="text"
                defaultValue={user?.role === 'Admin' ? 'Lead Administrator (Quản trị viên)' : (user?.role || 'Lead Administrator')}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 cursor-not-allowed outline-none text-sm"
              />
            </div>

            {/* Avatar upload */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Ảnh đại diện <span className="text-xs font-normal text-slate-400">(PNG, JPG &lt; 2MB)</span>
              </label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl border border-blue-500/30 bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {avatar ? (
                    <img src={avatar} alt="Ảnh đại diện" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-slate-400 text-3xl">account_circle</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Tải ảnh lên</span>
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatar('');
                        if (avatarInputRef.current) avatarInputRef.current.value = '';
                      }}
                      className="px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button 
                onClick={handleUpdateInfo} 
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 text-sm cursor-pointer"
              >
                Cập nhật thông tin
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: ĐỔI MẬT KHẨU & AN TOÀN TÀI KHOẢN (MỚI) */}
        <div className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Đổi Mật Khẩu An Toàn</h3>
                <p className="text-xs text-slate-400">Yêu cầu tối thiểu 8 ký tự, bao gồm cả chữ và số</p>
              </div>
            </div>
            {user?.isDefaultPassword && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                Đang dùng Pass mặc định!
              </span>
            )}
          </div>

          <form onSubmit={handleChangePassword} className="p-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3.5">
              {pwdMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                  pwdMsg.type === 'success' 
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200' 
                    : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
                }`}>
                  {pwdMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>{pwdMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Mật khẩu hiện tại <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu đang sử dụng"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm font-mono"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Mật khẩu mới <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự gồm cả chữ và số"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm font-mono"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                </div>

                {/* Thanh độ mạnh mật khẩu */}
                {newPassword && (
                  <div className="mt-2 space-y-1 animate-in fade-in">
                    <div className="flex gap-1 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'} w-1/3`} />
                      <div className={`h-full transition-all duration-300 ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'} w-1/3`} />
                      <div className={`h-full transition-all duration-300 ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'} w-1/3`} />
                    </div>
                    <p className={`text-[11px] font-semibold ${passwordStrength.color.split(' ')[0]}`}>
                      {passwordStrength.text}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Xác nhận mật khẩu mới <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm font-mono"
                  />
                  {confirmPassword && confirmPassword === newPassword && (
                    <Check className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800/80">
              <button
                type="submit"
                disabled={pwdLoading || !oldPassword || !newPassword || !confirmPassword}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/25 active:scale-95 text-sm cursor-pointer flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{pwdLoading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Section 3: Địa chỉ Máy chủ (LAN IP) & Chuyển hướng Máy trạm */}
      <div className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Router className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Địa chỉ Máy chủ &amp; Chuyển hướng Máy trạm</h3>
              <p className="text-xs text-slate-400">Thiết lập kết nối mạng nội bộ LAN cho 36 khoa phòng</p>
            </div>
          </div>
          <button
            onClick={fetchServerConfig}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
            title="Làm mới thông số mạng"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Thông báo đã lưu */}
          {serverSavedMsg && (
            <div className="px-4 py-3 rounded-2xl text-xs font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{serverSavedMsg}</span>
            </div>
          )}

          {/* Trạng thái kết nối hiện tại */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-sm">
            <div>
              <span className="text-slate-400 text-xs block mb-1 font-semibold">Địa chỉ máy trạm hiện đang kết nối:</span>
              <span className="font-mono font-bold text-cyan-400 flex items-center gap-2 text-base">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {window.location.origin}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block mb-1 font-semibold">Tên máy tính chủ (Computer Name):</span>
              <span className="font-mono font-bold text-white text-base">
                {machineName || 'SERVER'}
              </span>
            </div>
          </div>

          {/* Cấu hình URL mục tiêu */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Địa chỉ Máy chủ Mới / Mục tiêu (Target Server URL) <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="VD: http://192.170.182.16:5000"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white font-mono text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/15 hover:bg-blue-500/25 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Mã QR</span>
              </button>
            </div>

            {/* Các nút gợi ý IP nhanh */}
            {detectedIps.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                <span className="text-slate-400 font-medium">IP phát hiện:</span>
                {detectedIps.map(ip => (
                  <button
                    key={ip}
                    type="button"
                    onClick={() => setServerUrl(`http://${ip}:5000`)}
                    className={`px-3 py-1 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                      serverUrl.includes(ip)
                        ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-md shadow-blue-500/30'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {ip}:5000
                  </button>
                ))}
                {machineName && (
                  <button
                    type="button"
                    onClick={() => setServerUrl(`http://${machineName.toLowerCase()}:5000`)}
                    className="px-3 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-mono cursor-pointer"
                    title="Dùng tên máy tính giúp đường link ổn định ngay cả khi đổi IP"
                  >
                    {machineName.toLowerCase()}:5000 (Tên máy)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Toggle chuyển hướng tự động */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-sm text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400 text-[20px]">sync_alt</span>
                  Kích hoạt tự động chuyển hướng các máy trạm sang link mới
                </p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Khi bật tính năng này, bất kỳ máy trạm nào mở link cũ sẽ nhận thông báo và tự động chuyển hướng sang link máy chủ mới sau 3 giây.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRedirectEnabled(!redirectEnabled)}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${redirectEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${redirectEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {redirectEnabled && (
              <div className="pt-2 border-t border-slate-800 animate-in fade-in">
                <label className="block text-xs font-bold text-slate-300 mb-1">Lời nhắn thông báo chuyển hướng:</label>
                <input
                  type="text"
                  value={redirectMsg}
                  onChange={(e) => setRedirectMsg(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs outline-none focus:border-cyan-400 font-medium"
                />
              </div>
            )}
          </div>

          {/* Công cụ phím tắt máy trạm */}
          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Laptop className="w-6 h-6 text-cyan-400 shrink-0" />
              <div>
                <p className="font-bold text-sm text-slate-200">Phím tắt kết nối nhanh Desktop (.url)</p>
                <p className="text-xs text-slate-400">Gửi file phím tắt qua Zalo / mạng nội bộ cho các khoa phòng click đúp là mở ngay</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadShortcut}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-blue-500/30 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Tải file .url máy trạm</span>
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveServerConfig}
              disabled={serverSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{serverSaving ? 'Đang lưu...' : 'Lưu cấu hình máy chủ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Sao lưu & Phục hồi Dữ liệu SQLite */}
      <div className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Sao lưu &amp; Phục hồi Dữ liệu SQLite</h3>
              <p className="text-xs text-slate-400">Toàn bộ database SQLite được sao lưu an toàn với mốc thời gian</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className={`px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${uploadProgress ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>{uploadProgress ? 'Đang upload...' : 'Upload & Khôi phục'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".db"
                className="hidden"
                disabled={uploadProgress}
                onChange={handleUploadRestore}
              />
            </label>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Thông báo kết quả */}
          {backupMsg && (
            <div className={`px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
              backupMsg.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
            }`}>
              {backupMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{backupMsg.text}</span>
            </div>
          )}

          {/* Danh sách backup */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Danh sách bản sao lưu ({backups.length} file)</span>
              </h4>
            </div>

            {backups.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl text-slate-500">
                <Database className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                <p className="font-bold text-slate-400 text-sm">Chưa có bản backup nào.</p>
                <p className="text-xs text-slate-500 mt-1">Bấm nút "Tạo Backup Ngay" ở đầu trang để tạo bản sao đầu tiên.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Tên file sao lưu</th>
                        <th className="px-4 py-3">Thời gian tạo</th>
                        <th className="px-4 py-3">Dung lượng</th>
                        <th className="px-4 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {backups.map((b) => (
                        <tr key={b.filename} className="hover:bg-blue-600/10 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Database className="w-4 h-4 text-cyan-400 shrink-0" />
                              <span className="font-mono font-bold text-slate-200">{b.filename}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 font-medium">
                            {new Date(b.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-4 py-3 font-mono text-cyan-300">
                            {b.sizeText}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleDownload(b.filename)}
                                title="Tải về máy tính"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setConfirmRestore(b.filename)}
                                title="Khôi phục lại dữ liệu này"
                                disabled={backupLoading}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(b.filename)}
                                title="Xóa bản backup này"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Cấu hình Lịch Tự Động */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarClock className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="font-bold text-sm text-white">Lên lịch sao lưu cơ sở dữ liệu định kỳ</p>
                  <p className="text-xs text-slate-400">Tự động sao lưu ngầm không gián đoạn người dùng</p>
                </div>
              </div>
              <button
                onClick={() => setSchedule(s => ({ ...s, enabled: !s.enabled }))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${schedule.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${schedule.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {schedule.enabled && (
              <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Chu kỳ sao lưu</label>
                  <select
                    value={schedule.intervalHours}
                    onChange={e => setSchedule(s => ({ ...s, intervalHours: +e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {INTERVAL_OPTIONS.map(o => (
                      <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Giờ thực hiện</label>
                  <select
                    value={schedule.startHour}
                    disabled={schedule.intervalHours < 24}
                    onChange={e => setSchedule(s => ({ ...s, startHour: +e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer disabled:opacity-40"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i} className="bg-slate-900">{String(i).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Giữ tối đa (bản)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={schedule.maxBackupsToKeep}
                    onChange={e => setSchedule(s => ({ ...s, maxBackupsToKeep: Math.max(1, +e.target.value) }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-mono font-semibold focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            {schedule.enabled && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveSchedule}
                  disabled={scheduleSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{scheduleSaving ? 'Đang lưu...' : 'Lưu lịch sao lưu'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 5: NHẬT KÝ KIỂM TOÁN BẢO MẬT (SECURITY AUDIT LOG) - CHỈ ADMIN */}
      {user?.role === 'Admin' && (
        <div className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Nhật Ký Kiểm Toán Bảo Mật (Security Audit Log)</h3>
                <p className="text-xs text-slate-400">Ghi lại toàn bộ lịch sử đăng nhập, đổi mật khẩu và thao tác an toàn hệ thống</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearOldLogs}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Xóa nhật ký cũ hơn 30 ngày để tối ưu bộ nhớ"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Dọn dẹp log &gt; 30 ngày</span>
              </button>

              <button
                type="button"
                onClick={() => fetchAuditLogs(auditPage)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                title="Làm mới nhật ký"
              >
                <RefreshCw className={`w-4 h-4 ${auditLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Thông báo kết quả dọn dẹp */}
            {auditMsg && (
              <div className={`px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
                auditMsg.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
              }`}>
                {auditMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{auditMsg.text}</span>
              </div>
            )}

            {/* Thanh tìm kiếm & Bộ lọc Log */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs(1)}
                  placeholder="Tìm theo Username, IP máy trạm, chi tiết..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-700 bg-slate-800/90 text-white text-xs focus:outline-none focus:border-cyan-400 font-medium"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>

              <select
                value={auditAction}
                onChange={(e) => { setAuditAction(e.target.value); }}
                className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="">Tất cả hành động</option>
                <option value="LOGIN_SUCCESS">Đăng nhập thành công</option>
                <option value="LOGIN_FAILED">Đăng nhập thất bại</option>
                <option value="LOGIN_LOCKED">Tài khoản bị khóa</option>
                <option value="CHANGE_PASSWORD_SUCCESS">Đổi mật khẩu</option>
                <option value="CREATE_USER">Tạo người dùng mới</option>
                <option value="RESET_PASSWORD">Đặt lại mật khẩu</option>
              </select>

              <button
                type="button"
                onClick={() => fetchAuditLogs(1)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Tìm kiếm</span>
              </button>
            </div>

            {/* Bảng Audit Log */}
            {auditLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl text-slate-500">
                <Activity className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                <p className="font-bold text-slate-400 text-sm">Chưa có bản ghi nhật ký kiểm toán nào.</p>
                <p className="text-xs text-slate-500 mt-1">Các sự kiện đăng nhập, đổi mật khẩu sẽ tự động được ghi lại tại đây.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Thời gian</th>
                        <th className="px-4 py-3">Hành động</th>
                        <th className="px-4 py-3">Tài khoản</th>
                        <th className="px-4 py-3">IP Máy trạm</th>
                        <th className="px-4 py-3">Chi tiết sự kiện</th>
                        <th className="px-4 py-3 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {auditLogs.map((log) => {
                        const isLock = log.action === 'LOGIN_LOCKED';
                        const isSuccess = log.isSuccess;
                        return (
                          <tr key={log.id} className="hover:bg-blue-600/10 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-400">
                              {new Date(log.timestamp).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-4 py-3 font-semibold">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                isLock ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                isSuccess ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-200">
                              {log.username}
                            </td>
                            <td className="px-4 py-3 font-mono text-cyan-300">
                              {log.ipAddress || 'unknown'}
                            </td>
                            <td className="px-4 py-3 text-slate-300 max-w-xs truncate" title={log.details || ''}>
                              {log.details || '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {isSuccess ? (
                                <span className="text-emerald-400 flex items-center justify-end gap-1">
                                  <Check className="w-3.5 h-3.5" /> Thành công
                                </span>
                              ) : (
                                <span className="text-rose-400 flex items-center justify-end gap-1">
                                  <X className="w-3.5 h-3.5" /> Thất bại
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Phân trang Audit Logs */}
                {auditTotalPages > 1 && (
                  <div className="px-4 py-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Tổng: <strong className="text-slate-200">{auditTotalItems}</strong> sự kiện</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={auditPage <= 1}
                        onClick={() => fetchAuditLogs(auditPage - 1)}
                        className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                      >
                        Trước
                      </button>
                      <span className="px-2 font-mono text-cyan-400 font-bold">
                        {auditPage} / {auditTotalPages}
                      </span>
                      <button
                        type="button"
                        disabled={auditPage >= auditTotalPages}
                        onClick={() => fetchAuditLogs(auditPage + 1)}
                        className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL XÁC NHẬN RESTORE SQUIRCLE GLASS */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl p-7 max-w-md w-full border border-rose-500/30">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="font-black text-xl text-white text-center mb-2">
              Xác nhận Khôi phục Dữ liệu
            </h3>
            <p className="text-slate-300 text-sm text-center mb-2">
              Bạn sắp khôi phục database từ bản backup:
            </p>
            <p className="font-mono text-xs font-bold text-cyan-400 text-center mb-4 break-all bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              {confirmRestore}
            </p>

            <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-3.5 mb-6 text-xs text-amber-300">
              <p className="font-bold mb-1">⚠️ Lưu ý an toàn:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Toàn bộ dữ liệu hiện tại sẽ được thay thế bằng dữ liệu bản backup này</li>
                <li>Hệ thống sẽ tự động tạo thêm một bản backup dữ liệu hiện tại trước khi ghi đè</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmRestore(null)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl font-bold text-sm transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleRestoreFromServer(confirmRestore)}
                className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Xác nhận Khôi phục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL QR CODE KẾT NỐI SQUIRCLE GLASS */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl p-7 max-w-sm w-full border border-blue-500/30 text-center space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800/80">
              <h3 className="font-bold text-white flex items-center gap-2 text-base">
                <QrCode className="w-5 h-5 text-cyan-400" />
                <span>Mã QR Kết Nối Ứng Dụng</span>
              </h3>
              <button onClick={() => setShowQrModal(false)} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mx-auto">
              <QRCodeSVG value={serverUrl || window.location.origin} size={200} level="M" />
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1.5">Quét bằng điện thoại hoặc máy tính bảng:</p>
              <p className="text-xs font-mono font-bold text-cyan-400 break-all bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
                {serverUrl || window.location.origin}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl text-sm cursor-pointer shadow-lg shadow-blue-500/25 transition-all"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
