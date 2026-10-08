import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Calendar, 
  Building2, 
  RefreshCw, 
  ClipboardList, 
  Clock, 
  Wrench, 
  CheckCircle2, 
  XCircle, 
  Briefcase, 
  UserCheck, 
  Filter, 
  Eye, 
  X, 
  CheckCircle
} from 'lucide-react';
import api from '../api/axios';
import * as XLSX from 'xlsx';
import Pagination from '../components/Pagination';

const LOCAL_DEP_KEY = 'ASSET_MANAGEMENT_DEPARTMENTS_CACHE';

// 36 Khoa, Phòng, Ban chính thức Bệnh viện Quân y 87
const DEFAULT_DEPARTMENTS = [
  { id: 13, name: 'Ban Giám đốc' },
  { id: 14, name: 'Phòng Chính trị' },
  { id: 12, name: 'Phòng Kế hoạch - Tổng hợp' },
  { id: 15, name: 'Phòng Hậu cần - Kỹ thuật' },
  { id: 16, name: 'Phòng Tham mưu - Hành chính' },
  { id: 17, name: 'Phòng Điều dưỡng' },
  { id: 18, name: 'Ban Tài chính' },
  { id: 19, name: 'Ban Công nghệ thông tin' },
  { id: 20, name: 'Khoa Nội tim mạch - Hô hấp' },
  { id: 21, name: 'Khoa Nội tiêu hóa - Huyết học lâm sàng' },
  { id: 22, name: 'Khoa Truyền nhiễm - Da liễu - Dị ứng' },
  { id: 23, name: 'Khoa Nội cơ xương khớp - Nội tiết' },
  { id: 24, name: 'Khoa Ung bướu' },
  { id: 25, name: 'Khoa Thần kinh - Tâm thần - Đột quỵ' },
  { id: 26, name: 'Khoa Y học cổ truyền' },
  { id: 27, name: 'Khoa Phục hồi chức năng' },
  { id: 1, name: 'Khoa Hồi sức tích cực - Chống độc' },
  { id: 28, name: 'Khoa Nội thận - Lọc máu' },
  { id: 29, name: 'Khoa Y học dưới nước' },
  { id: 30, name: 'Khoa Ngoại chung' },
  { id: 31, name: 'Khoa Ngoại chấn thương chỉnh hình' },
  { id: 32, name: 'Khoa Phẫu thuật gây mê hồi sức' },
  { id: 33, name: 'Khoa Mắt' },
  { id: 34, name: 'Khoa Tai Mũi Họng' },
  { id: 35, name: 'Khoa Răng Hàm Mặt' },
  { id: 3, name: 'Khoa Phụ sản' },
  { id: 4, name: 'Khoa Nhi' },
  { id: 2, name: 'Khoa Khám bệnh' },
  { id: 7, name: 'Khoa Xét nghiệm - Giải phẫu bệnh' },
  { id: 6, name: 'Khoa Chẩn đoán hình ảnh - Chẩn đoán chức năng' },
  { id: 9, name: 'Khoa Dược' },
  { id: 10, name: 'Khoa Trang bị' },
  { id: 36, name: 'Khoa Dinh dưỡng' },
  { id: 11, name: 'Khoa Kiểm soát nhiễm khuẩn' },
  { id: 5, name: 'Khoa Cấp cứu' },
  { id: 37, name: 'Khoa Y học dự phòng' },
];

export interface TaskRecord {
  id: number;
  title: string;
  description: string;
  departmentId: number;
  department?: { id: number; name: string };
  assetId?: number;
  asset?: { id: number; name: string; serial?: string; kyHieu?: string; assetTag?: string };
  status: number; // 1: Chờ tiếp nhận, 2: Đang xử lý, 3: Đã hoàn thành, 4: Từ chối
  handlerName?: string;
  handlingNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export const WorkTasksReportTab: React.FC = () => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [departments, setDepartments] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_DEP_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= DEFAULT_DEPARTMENTS.length) return parsed;
      }
    } catch {}
    return DEFAULT_DEPARTMENTS;
  });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [handlerFilter, setHandlerFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [timePreset, setTimePreset] = useState<'all' | 'today' | '7days' | 'month' | 'quarter' | 'year'>('all');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal xem chi tiết
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const reportContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, handlerFilter, deptFilter, timePreset]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Tải phiếu công việc
      try {
        const reqRes = await api.get('/repairrequests');
        if (Array.isArray(reqRes.data)) {
          setTasks(reqRes.data);
        } else {
          setTasks([]);
        }
      } catch (err) {
        console.error("Lỗi tải phiếu đề nghị:", err);
        setTasks([]);
      }

      // 2. Tải khoa phòng
      try {
        const depRes = await api.get('/departments');
        if (Array.isArray(depRes.data) && depRes.data.length > 0) {
          setDepartments(depRes.data);
          localStorage.setItem(LOCAL_DEP_KEY, JSON.stringify(depRes.data));
        }
      } catch (err) {
        console.warn("Dùng danh sách khoa phòng mặc định", err);
      }

      // 3. Tải danh sách tài khoản
      try {
        const usrRes = await api.get('/users');
        if (Array.isArray(usrRes.data)) {
          setUsers(usrRes.data);
        }
      } catch (err) {
        console.warn("Không thể tải danh sách tài khoản:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Danh sách các cán bộ xử lý duy nhất (từ user hoặc từ data)
  const availableHandlers = useMemo(() => {
    const handlerSet = new Set<string>();
    users.forEach(u => {
      const name = u.fullName || u.username;
      if (name) handlerSet.add(name);
    });
    tasks.forEach(t => {
      if (t.handlerName?.trim()) {
        handlerSet.add(t.handlerName.trim());
      }
    });
    return Array.from(handlerSet).sort();
  }, [users, tasks]);

  // Bộ lọc dữ liệu
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Lọc theo trạng thái
      if (statusFilter !== 'all') {
        const stNum = parseInt(statusFilter);
        if (task.status !== stNum) return false;
      }

      // 2. Lọc theo cán bộ xử lý
      if (handlerFilter === 'unassigned') {
        if (task.handlerName && task.handlerName.trim() !== '') return false;
      } else if (handlerFilter !== 'all') {
        if (task.handlerName?.trim() !== handlerFilter) return false;
      }

      // 3. Lọc theo khoa phòng
      if (deptFilter !== 'all') {
        const depId = parseInt(deptFilter);
        if (task.departmentId !== depId) return false;
      }

      // 4. Lọc theo thời gian
      if (timePreset !== 'all' && task.createdAt) {
        const taskDate = new Date(task.createdAt);
        const now = new Date();

        if (timePreset === 'today') {
          const isToday = taskDate.getDate() === now.getDate() &&
                          taskDate.getMonth() === now.getMonth() &&
                          taskDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (timePreset === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (taskDate < sevenDaysAgo) return false;
        } else if (timePreset === 'month') {
          const isThisMonth = taskDate.getMonth() === now.getMonth() &&
                              taskDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        } else if (timePreset === 'quarter') {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const taskQuarter = Math.floor(taskDate.getMonth() / 3);
          if (taskQuarter !== currentQuarter || taskDate.getFullYear() !== now.getFullYear()) return false;
        } else if (timePreset === 'year') {
          if (taskDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      // 5. Tìm kiếm từ khóa
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const reqCode = `req-${task.id}`.toLowerCase();
        const title = (task.title || '').toLowerCase();
        const desc = (task.description || '').toLowerCase();
        const depName = (task.department?.name || '').toLowerCase();
        const assetName = (task.asset?.name || '').toLowerCase();
        const assetSerial = (task.asset?.serial || '').toLowerCase();
        const handler = (task.handlerName || '').toLowerCase();
        const notes = (task.handlingNotes || '').toLowerCase();

        return reqCode.includes(s) ||
               title.includes(s) ||
               desc.includes(s) ||
               depName.includes(s) ||
               assetName.includes(s) ||
               assetSerial.includes(s) ||
               handler.includes(s) ||
               notes.includes(s);
      }

      return true;
    });
  }, [tasks, statusFilter, handlerFilter, deptFilter, timePreset, searchTerm]);

  // Thống kê đầu mối KPI
  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 1).length;
    const inProgress = tasks.filter(t => t.status === 2).length;
    const completed = tasks.filter(t => t.status === 3).length;
    const rejected = tasks.filter(t => t.status === 4).length;

    const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;
    const inProgressPercent = total > 0 ? Math.round((inProgress / total) * 100) : 0;
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      pending,
      pendingPercent,
      inProgress,
      inProgressPercent,
      completed,
      completedPercent,
      rejected
    };
  }, [tasks]);

  // Phân trang
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  // Format ngày giờ hiển thị
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return dateStr;
    }
  };

  // Helper render Trạng thái
  const renderStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Chờ tiếp nhận
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-cyan-400 border border-blue-500/30 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            Đang xử lý
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            Đã hoàn thành
          </span>
        );
      case 4:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap">
            <XCircle className="w-3 h-3 text-rose-400" />
            Từ chối
          </span>
        );
      default:
        return <span className="text-slate-400 text-xs">Không xác định</span>;
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1: return 'Chờ tiếp nhận';
      case 2: return 'Đang xử lý';
      case 3: return 'Đã hoàn thành';
      case 4: return 'Từ chối';
      default: return 'Khác';
    }
  };

  // Xuất file Excel 100% dữ liệu gốc
  const exportToExcel = () => {
    if (filteredTasks.length === 0) {
      alert("Không có dữ liệu công việc nào phù hợp để xuất Excel!");
      return;
    }

    const excelRows = filteredTasks.map((t, index) => {
      const reqCode = `REQ-${String(t.id).padStart(4, '0')}`;
      const depName = t.department?.name || 'Chưa xác định';
      const assetInfo = t.asset?.name || 'Không gắn thiết bị cụ thể';
      const assetSerial = t.asset?.serial || t.asset?.kyHieu || '—';
      const createdTime = formatDateTime(t.createdAt);
      const updatedTime = t.updatedAt ? formatDateTime(t.updatedAt) : 'Chưa cập nhật';
      const handler = t.handlerName?.trim() || 'Chưa phân công';
      const statusStr = getStatusText(t.status);
      const notes = t.handlingNotes || 'Chưa có ghi chú';
      const desc = t.description || '';

      return {
        "STT": index + 1,
        "Mã công việc": reqCode,
        "Tên công việc / Yêu cầu": t.title,
        "Khoa phòng đề nghị": depName,
        "Thiết bị liên quan": assetInfo,
        "Mã máy / Serial": assetSerial,
        "Thời gian đề nghị": createdTime,
        "Thời gian hoàn thành / Cập nhật": updatedTime,
        "Người xử lý": handler,
        "Trạng thái": statusStr,
        "Hướng xử lý / Ghi chú": notes,
        "Mô tả chi tiết yêu cầu": desc
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    // Căn chỉnh độ rộng các cột
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 14 }, // Mã việc
      { wch: 32 }, // Tên công việc
      { wch: 30 }, // Khoa phòng đề nghị
      { wch: 30 }, // Thiết bị
      { wch: 20 }, // Serial
      { wch: 20 }, // Thời gian đề nghị
      { wch: 24 }, // Thời gian hoàn thành/cập nhật
      { wch: 22 }, // Người xử lý
      { wch: 16 }, // Trạng thái
      { wch: 35 }, // Ghi chú
      { wch: 45 }, // Mô tả chi tiết
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ThongKe_CongViec");

    const timeStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    XLSX.writeFile(workbook, `BaoCao_ThongKe_CongViec_BVQY87_${timeStamp}.xlsx`);
  };

  // In báo cáo
  const handlePrint = () => {
    window.print();
  };

  const openDetail = (task: TaskRecord) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6" ref={reportContainerRef}>
      {/* 1. MODULE BANNER SQUIRCLE GRADIENT */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c142c] via-[#0f1b3d] to-[#0c142c] border border-blue-500/20 p-6 lg:p-7 shadow-2xl shadow-blue-950/40 backdrop-blur-xl">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Cột trái: Icon Squircle + Tiêu đề */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 ring-1 ring-white/20 shrink-0">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Đầu mối công việc & Tiến độ xử lý
                </span>
                <span className="text-slate-400 text-xs">• Bệnh viện Quân y 87</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                Thống Kê Theo Công Việc
              </h1>
              <p className="text-slate-400 text-xs lg:text-sm mt-0.5">
                Theo dõi toàn diện các đầu mối việc: tên công việc, thời gian đề nghị, thời gian hoàn thành, người xử lý và tiến độ thực tế
              </p>
            </div>
          </div>

          {/* Cột phải: Các nút Thao tác nhanh (Làm mới, In, Xuất Excel) */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 shadow-sm transition-all active:scale-95 cursor-pointer"
              title="In báo cáo"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">In báo cáo</span>
            </button>

            <button
              type="button"
              onClick={exportToExcel}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Xuất 100% dữ liệu gốc ra file Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. HỆ THỐNG 4 THẺ THỐNG KÊ ĐẦU MỐI (STAT CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Tổng đầu mối công việc */}
        <div 
          onClick={() => setStatusFilter('all')}
          className={`relative overflow-hidden rounded-2xl p-5 border transition-all cursor-pointer ${
            statusFilter === 'all' 
              ? 'bg-gradient-to-br from-blue-950/80 via-slate-900 to-indigo-950/70 border-cyan-400/50 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-400/30' 
              : 'bg-[#0c142c]/90 border-blue-500/20 hover:border-blue-400/40 shadow-lg'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-300">Tổng đầu mối việc</p>
              <p className="text-3xl font-black text-white mt-1.5 tabular-nums">{stats.total}</p>
              <p className="text-[11px] text-slate-400 mt-1">100% công việc đề xuất</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Thẻ 2: Đang chờ tiếp nhận */}
        <div 
          onClick={() => setStatusFilter('1')}
          className={`relative overflow-hidden rounded-2xl p-5 border transition-all cursor-pointer ${
            statusFilter === '1' 
              ? 'bg-gradient-to-br from-amber-950/80 via-slate-900 to-yellow-950/70 border-amber-400/50 shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/30' 
              : 'bg-[#0c142c]/90 border-blue-500/20 hover:border-amber-400/40 shadow-lg'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Đang chờ tiếp nhận</p>
              <p className="text-3xl font-black text-amber-300 mt-1.5 tabular-nums">{stats.pending}</p>
              <p className="text-[11px] text-amber-200/70 mt-1">
                Chiếm <span className="font-bold text-amber-300">{stats.pendingPercent}%</span> tổng số
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Thẻ 3: Đang xử lý */}
        <div 
          onClick={() => setStatusFilter('2')}
          className={`relative overflow-hidden rounded-2xl p-5 border transition-all cursor-pointer ${
            statusFilter === '2' 
              ? 'bg-gradient-to-br from-cyan-950/80 via-slate-900 to-blue-950/70 border-cyan-400/50 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-400/30' 
              : 'bg-[#0c142c]/90 border-blue-500/20 hover:border-cyan-400/40 shadow-lg'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">Đang xử lý</p>
              <p className="text-3xl font-black text-cyan-300 mt-1.5 tabular-nums">{stats.inProgress}</p>
              <p className="text-[11px] text-cyan-200/70 mt-1">
                Chiếm <span className="font-bold text-cyan-300">{stats.inProgressPercent}%</span> tổng số
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Wrench className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Thẻ 4: Đã hoàn thành */}
        <div 
          onClick={() => setStatusFilter('3')}
          className={`relative overflow-hidden rounded-2xl p-5 border transition-all cursor-pointer ${
            statusFilter === '3' 
              ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-teal-950/70 border-emerald-400/50 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-400/30' 
              : 'bg-[#0c142c]/90 border-blue-500/20 hover:border-emerald-400/40 shadow-lg'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Đã hoàn thành</p>
              <p className="text-3xl font-black text-emerald-300 mt-1.5 tabular-nums">{stats.completed}</p>
              <p className="text-[11px] text-emerald-200/70 mt-1">
                Tỷ lệ xử lý <span className="font-bold text-emerald-300">{stats.completedPercent}%</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. KHỐI BỘ LỌC ĐA CHIỀU (SEARCH & FILTERS) */}
      <div className="bg-[#0c142c]/90 border border-blue-500/20 rounded-2xl p-4 lg:p-5 shadow-xl backdrop-blur-md space-y-3.5">
        <div className="flex items-center justify-between border-b border-blue-500/15 pb-2.5">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
            <Filter className="w-4 h-4" />
            <span>Bộ lọc tra cứu đầu mối công việc</span>
          </div>
          <span className="text-xs text-slate-400">
            Tìm thấy <strong className="text-white">{filteredTasks.length}</strong> / {tasks.length} công việc
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Ô tìm kiếm từ khóa */}
          <div className="relative lg:col-span-2">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã việc, tên việc, thiết bị, cán bộ..."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 outline-none transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Lọc trạng thái */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 outline-none transition-all cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="1">🟡 Đang chờ tiếp nhận</option>
              <option value="2">🔵 Đang xử lý</option>
              <option value="3">🟢 Đã hoàn thành</option>
              <option value="4">🔴 Từ chối</option>
            </select>
          </div>

          {/* 3. Lọc cán bộ xử lý */}
          <div>
            <select
              value={handlerFilter}
              onChange={e => setHandlerFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 outline-none transition-all cursor-pointer"
            >
              <option value="all">Tất cả cán bộ xử lý</option>
              <option value="unassigned">Chưa phân công cán bộ</option>
              {availableHandlers.map(handler => (
                <option key={handler} value={handler}>
                  👤 {handler}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Lọc khoa phòng */}
          <div>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 outline-none transition-all cursor-pointer"
            >
              <option value="all">Tất cả 36 khoa phòng</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 5. Phím nhanh mốc thời gian */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5" />
            Thời gian:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'today', label: 'Hôm nay' },
            { id: '7days', label: '7 ngày qua' },
            { id: 'month', label: 'Tháng này' },
            { id: 'quarter', label: 'Quý này' },
            { id: 'year', label: 'Năm nay' },
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setTimePreset(p.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timePreset === p.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. BẢNG DỮ LIỆU ĐẦU MỐI CÔNG VIỆC */}
      <div className="bg-[#0c142c]/90 border border-blue-500/20 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-blue-500/20 text-slate-300 uppercase tracking-wider font-extrabold text-[11px]">
                <th className="py-3.5 px-4 text-center w-12">STT</th>
                <th className="py-3.5 px-3 w-28">Mã việc</th>
                <th className="py-3.5 px-4 min-w-[200px]">Tên công việc / Yêu cầu</th>
                <th className="py-3.5 px-3 min-w-[160px]">Khoa đề nghị</th>
                <th className="py-3.5 px-3 min-w-[160px]">Thiết bị liên quan</th>
                <th className="py-3.5 px-3 min-w-[130px]">Thời gian đề nghị</th>
                <th className="py-3.5 px-3 min-w-[130px]">Thời gian hoàn thành</th>
                <th className="py-3.5 px-3 min-w-[140px]">Người xử lý</th>
                <th className="py-3.5 px-3 text-center min-w-[120px]">Trạng thái</th>
                <th className="py-3.5 px-4 min-w-[180px]">Hướng xử lý / Ghi chú</th>
                <th className="py-3.5 px-3 text-center w-16">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    <p className="text-xs font-semibold">Đang tải dữ liệu đầu mối công việc...</p>
                  </td>
                </tr>
              ) : paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p className="font-bold text-sm text-slate-300">Không tìm thấy công việc nào</p>
                    <p className="text-xs text-slate-500 mt-1">Vui lòng thay đổi từ khóa hoặc bộ lọc để xem kết quả khác</p>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task, index) => {
                  const stt = (currentPage - 1) * pageSize + index + 1;
                  const reqCode = `REQ-${String(task.id).padStart(4, '0')}`;
                  const isCompleted = task.status === 3;
                  const completedDate = isCompleted && task.updatedAt ? formatDateTime(task.updatedAt) : (task.status === 2 && task.updatedAt ? `Cập nhật: ${formatDateTime(task.updatedAt)}` : '—');

                  return (
                    <tr 
                      key={task.id} 
                      className="hover:bg-blue-950/30 transition-colors text-slate-300 group"
                    >
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {stt}
                      </td>

                      {/* Mã việc */}
                      <td className="py-3.5 px-3 font-mono font-bold text-cyan-400 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                          #{reqCode}
                        </span>
                      </td>

                      {/* Tên công việc & mô tả */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white text-xs sm:text-sm group-hover:text-cyan-300 transition-colors">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5" title={task.description}>
                            {task.description}
                          </p>
                        )}
                      </td>

                      {/* Khoa đề nghị */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{task.department?.name || 'Chưa xác định'}</span>
                        </div>
                      </td>

                      {/* Thiết bị liên quan */}
                      <td className="py-3.5 px-3">
                        {task.asset ? (
                          <div>
                            <p className="font-semibold text-white truncate max-w-[180px]" title={task.asset.name}>
                              {task.asset.name}
                            </p>
                            {(task.asset.serial || task.asset.kyHieu) && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                SN: {task.asset.serial || task.asset.kyHieu}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Không gắn thiết bị</span>
                        )}
                      </td>

                      {/* Thời gian đề nghị */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-300">
                        {formatDateTime(task.createdAt)}
                      </td>

                      {/* Thời gian hoàn thành */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isCompleted ? (
                          <span className="text-emerald-400 font-semibold">
                            {completedDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {completedDate}
                          </span>
                        )}
                      </td>

                      {/* Người xử lý */}
                      <td className="py-3.5 px-3">
                        {task.handlerName?.trim() ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 w-fit text-slate-200 font-semibold">
                            <UserCheck className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="truncate max-w-[130px]" title={task.handlerName}>
                              {task.handlerName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-400/80 italic text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Chưa phân công
                          </span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-3 text-center">
                        {renderStatusBadge(task.status)}
                      </td>

                      {/* Hướng xử lý / Ghi chú */}
                      <td className="py-3.5 px-4">
                        {task.handlingNotes ? (
                          <p className="text-xs text-slate-300 line-clamp-2" title={task.handlingNotes}>
                            {task.handlingNotes}
                          </p>
                        ) : (
                          <span className="text-slate-600 italic text-[11px]">Chưa có ghi chú</span>
                        )}
                      </td>

                      {/* Nút xem chi tiết */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => openDetail(task)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer mx-auto shadow-sm"
                          title="Xem chi tiết đầu mối việc"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang - Thanh điều hướng trang chuẩn như Tài sản & Thiết bị */}
        {filteredTasks.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/60">
            <Pagination
              currentPage={currentPage}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              totalItems={filteredTasks.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={size => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* 5. MODAL XEM CHI TIẾT ĐẦU MỐI CÔNG VIỆC */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl w-[640px] max-w-full overflow-hidden flex flex-col border border-blue-500/30">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-blue-500/20 flex justify-between items-center bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-cyan-400 flex items-center justify-center border border-blue-500/30">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Chi Tiết Đầu Mối Công Việc
                  </h3>
                  <p className="text-xs text-cyan-300 font-mono">
                    #REQ-{String(selectedTask.id).padStart(4, '0')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)} 
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-300">
              {/* Tiêu đề công việc */}
              <div className="bg-slate-900/80 rounded-2xl p-4 border border-blue-500/15">
                <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Tên công việc / Yêu cầu</p>
                <p className="text-base font-extrabold text-white">{selectedTask.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-400">Trạng thái:</span>
                  {renderStatusBadge(selectedTask.status)}
                </div>
              </div>

              {/* Thông tin 2 cột */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Khoa phòng đề nghị</p>
                  <p className="text-sm font-bold text-cyan-300 mt-1">
                    {selectedTask.department?.name || 'Chưa xác định'}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Thiết bị liên quan</p>
                  <p className="text-sm font-bold text-white mt-1">
                    {selectedTask.asset?.name || 'Không gắn thiết bị'}
                  </p>
                  {selectedTask.asset?.serial && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Serial: {selectedTask.asset.serial}
                    </p>
                  )}
                </div>

                <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Thời gian đề nghị</p>
                  <p className="text-xs font-bold text-slate-200 mt-1">
                    {formatDateTime(selectedTask.createdAt)}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Thời gian hoàn thành / Cập nhật</p>
                  <p className="text-xs font-bold text-emerald-400 mt-1">
                    {selectedTask.updatedAt ? formatDateTime(selectedTask.updatedAt) : 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              {/* Người tiếp nhận & xử lý */}
              <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Cán bộ xử lý (Phòng Vật Tư - Kỹ Thuật)</p>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-white">
                    {selectedTask.handlerName || 'Chưa có cán bộ tiếp nhận'}
                  </span>
                </div>
              </div>

              {/* Mô tả chi tiết yêu cầu ban đầu */}
              <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Mô tả chi tiết sự cố / Yêu cầu</p>
                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.description || 'Không có mô tả chi tiết'}
                </p>
              </div>

              {/* Hướng xử lý & ghi chú kỹ thuật */}
              <div className="bg-blue-950/40 rounded-xl p-3.5 border border-blue-500/20">
                <p className="text-[10px] uppercase font-bold text-cyan-300 mb-1">Hướng xử lý / Ghi chú kỹ thuật</p>
                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.handlingNotes || 'Chưa cập nhật ghi chú kỹ thuật'}
                </p>
              </div>
            </div>

            {/* Chân Modal */}
            <div className="p-4 border-t border-blue-500/20 flex justify-end bg-slate-900/80">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2 font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

