import { useState, useEffect } from 'react';
import { Plus, Search, X, ClipboardList, PenTool, CheckCircle, FileText, Loader2, ChevronDown, UserCheck } from 'lucide-react';
import api from '../api/axios';
import Pagination from '../components/Pagination';

// 36 Khoa, Phòng, Ban chính thức Bệnh viện Quân y 87
const DEFAULT_DEPARTMENTS = [
  // Cột 1: Ban Giám đốc & các Phòng, Ban chức năng
  { id: 13, name: 'Ban Giám đốc' },
  { id: 14, name: 'Phòng Chính trị' },
  { id: 12, name: 'Phòng Kế hoạch - Tổng hợp' },
  { id: 15, name: 'Phòng Hậu cần - Kỹ thuật' },
  { id: 16, name: 'Phòng Tham mưu - Hành chính' },
  { id: 17, name: 'Phòng Điều dưỡng' },
  { id: 18, name: 'Ban Tài chính' },
  { id: 19, name: 'Ban Công nghệ thông tin' },

  // Cột 2: Khối Nội & Chuyên khoa Nội
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

  // Cột 3: Khối Ngoại & Chuyên khoa Ngoại
  { id: 30, name: 'Khoa Chấn thương, chỉnh hình' },
  { id: 31, name: 'Khoa Ngoại tổng hợp' },
  { id: 8, name: 'Khoa Gây mê hồi sức' },
  { id: 4, name: 'Khoa Ngoại chung' },
  { id: 32, name: 'Khoa Mắt' },
  { id: 33, name: 'Khoa Răng - Hàm - Mặt' },
  { id: 34, name: 'Tai - Mũi - Họng' },
  { id: 35, name: 'Khoa Phụ sản - Nhi' },

  // Cột 4: Khối Cận lâm sàng, Dược & Hỗ trợ điều trị
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

const LOCAL_DEP_KEY = 'ASSET_MANAGEMENT_DEPARTMENTS_CACHE';

const RepairRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);
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
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | ''>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHandleModal, setShowHandleModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Create Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assetId, setAssetId] = useState('');

  // Handle Form States
  const [handlingNotes, setHandlingNotes] = useState('');
  const [handlerName, setHandlerName] = useState('');
  const [handleStatus, setHandleStatus] = useState(2); // In Progress

  useEffect(() => {
    fetchData();

    const handleSync = (e?: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setDepartments(e.detail);
      } else {
        try {
          const cached = localStorage.getItem(LOCAL_DEP_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) setDepartments(parsed);
          }
        } catch {}
      }
    };

    window.addEventListener('departmentsChanged', handleSync);
    window.addEventListener('departmentsUpdated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('departmentsChanged', handleSync);
      window.removeEventListener('departmentsUpdated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Lấy danh sách phiếu đề nghị
      try {
        const reqRes = await api.get('/repairrequests');
        if (Array.isArray(reqRes.data)) {
          setRequests(reqRes.data);
        } else {
          setRequests([]);
        }
      } catch (err) {
        console.error("Lỗi tải phiếu đề nghị:", err);
        setRequests([]);
      }

      // 2. Lấy danh sách khoa phòng (fallback nếu endpoint chưa mở)
      try {
        const depRes = await api.get('/departments');
        if (Array.isArray(depRes.data) && depRes.data.length > 0) {
          setDepartments(depRes.data);
          localStorage.setItem(LOCAL_DEP_KEY, JSON.stringify(depRes.data));
        } else {
          const cached = localStorage.getItem(LOCAL_DEP_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length >= DEFAULT_DEPARTMENTS.length) setDepartments(parsed);
            else setDepartments(DEFAULT_DEPARTMENTS);
          } else {
            setDepartments(DEFAULT_DEPARTMENTS);
          }
        }
      } catch {
        const cached = localStorage.getItem(LOCAL_DEP_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length >= DEFAULT_DEPARTMENTS.length) setDepartments(parsed);
            else setDepartments(DEFAULT_DEPARTMENTS);
          } catch {
            setDepartments(DEFAULT_DEPARTMENTS);
          }
        } else {
          setDepartments(DEFAULT_DEPARTMENTS);
        }
      }

      // 3. Lấy danh sách tài sản
      try {
        const astRes = await api.get('/assets');
        if (Array.isArray(astRes.data)) {
          setAssets(astRes.data);
        } else {
          setAssets([]);
        }
      } catch (err) {
        console.error("Lỗi tải tài sản:", err);
        setAssets([]);
      }

      // 4. Lấy danh sách tài khoản người dùng khai báo trên hệ thống
      try {
        const usrRes = await api.get('/users');
        if (Array.isArray(usrRes.data)) {
          setUsers(usrRes.data);
        } else {
          setUsers([]);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách người dùng:", err);
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !departmentId) {
      alert("Vui lòng điền đầy đủ Tiêu đề, Mô tả và Khoa phòng!");
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/repairrequests', {
        title: title.trim(),
        description: description.trim(),
        departmentId: parseInt(departmentId),
        assetId: assetId ? parseInt(assetId) : null,
        status: 1
      });
      alert("Đã gửi phiếu đề nghị thành công!");
      setShowCreateModal(false);
      
      // Reset form
      setTitle(''); setDescription(''); setDepartmentId(''); setAssetId('');
      fetchData();
      window.dispatchEvent(new Event('repairRequestsChanged'));
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || err?.message || "Lỗi khi gửi đề nghị";
      alert(`Không thể gửi phiếu đề nghị: ${errMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const openHandleModal = (req: any) => {
    setSelectedRequest(req);
    setHandlingNotes(req.handlingNotes || '');
    setHandlerName(req.handlerName || '');
    setHandleStatus(req.status === 1 ? 2 : req.status); // Default to InProgress if Pending
    setShowHandleModal(true);
  };

  const submitHandle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/repairrequests/${selectedRequest.id}/handle`, {
        status: handleStatus,
        handlingNotes,
        handlerName
      });
      alert("Cập nhật trạng thái xử lý thành công!");
      setShowHandleModal(false);
      fetchData();
      window.dispatchEvent(new Event('repairRequestsChanged'));
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật.");
    }
  };

  const getStatusText = (status: number) => {
    switch(status) {
      case 1: return <span className="px-2.5 py-1 rounded-full text-xs badge-status-warning inline-flex items-center gap-1">🟡 Đang chờ</span>;
      case 2: return <span className="px-2.5 py-1 rounded-full text-xs badge-status-info inline-flex items-center gap-1">🔵 Đang xử lý</span>;
      case 3: return <span className="px-2.5 py-1 rounded-full text-xs badge-status-success inline-flex items-center gap-1">🟢 Hoàn thành</span>;
      case 4: return <span className="px-2.5 py-1 rounded-full text-xs badge-status-danger inline-flex items-center gap-1">🔴 Từ chối</span>;
      default: return <span className="px-2.5 py-1 rounded-full text-xs badge-status-neutral">Khác</span>;
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchStatus = filterStatus === '' ? true : r.status === filterStatus;
    const matchSearch = searchTerm === '' ? true : (
      (r.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.department?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. MODULE HEADER BANNER SQUIRCLE GRADIENT */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c142c] via-[#0f1b3d] to-[#0c142c] border border-blue-500/20 p-6 lg:p-7 shadow-2xl shadow-blue-950/40 backdrop-blur-xl">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Cột trái: Icon Squircle + Tiêu đề */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 ring-1 ring-white/20 shrink-0">
              <span className="material-symbols-outlined text-[32px]">assignment</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Tiếp nhận yêu cầu kỹ thuật
                </span>
                <span className="text-slate-400 text-xs">• Bệnh viện Quân y 87</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                Phiếu đề nghị / Báo hỏng
              </h1>
              <p className="text-slate-400 text-xs lg:text-sm mt-0.5">
                Tiếp nhận yêu cầu sửa chữa, cấp phát thiết bị và theo dõi tiến độ xử lý kỹ thuật từ các khoa phòng
              </p>
            </div>
          </div>

          {/* Cột phải: Action Button */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Tạo phiếu đề nghị
            </button>
          </div>
        </div>
      </div>

      {/* 2. CỤM 3 THẺ CHỈ SỐ KPI SQUIRCLE GRADIENT */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Thẻ 1: Đang chờ tiếp nhận */}
        <div 
          onClick={() => setFilterStatus(prev => prev === 1 ? '' : 1)}
          className={`p-4 rounded-2xl border shadow-xl flex items-center justify-between cursor-pointer transition-all duration-200 select-none ${
            filterStatus === 1
              ? 'bg-[#0c142c] border-2 border-amber-400/80 shadow-amber-500/20 scale-[1.02]'
              : 'bg-[#0c142c]/90 border-blue-500/20 hover:border-amber-500/40 hover:scale-[1.01]'
          }`}
          title="Bấm để lọc phiếu đang chờ tiếp nhận"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang Chờ Tiếp Nhận</p>
            <h3 className="text-3xl font-black text-amber-400 mt-1">{requests.filter(r => r.status === 1).length}</h3>
            <p className="text-[11px] text-amber-300/80 mt-0.5">Phiếu mới từ các khoa phòng</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/30 shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        {/* Thẻ 2: Đang xử lý */}
        <div 
          onClick={() => setFilterStatus(prev => prev === 2 ? '' : 2)}
          className={`p-4 rounded-2xl border shadow-xl flex items-center justify-between cursor-pointer transition-all duration-200 select-none ${
            filterStatus === 2
              ? 'bg-[#0c142c] border-2 border-blue-400/80 shadow-blue-500/20 scale-[1.02]'
              : 'bg-[#0c142c]/90 border-blue-500/20 hover:border-blue-500/40 hover:scale-[1.01]'
          }`}
          title="Bấm để lọc phiếu đang xử lý"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang Xử Lý Kỹ Thuật</p>
            <h3 className="text-3xl font-black text-blue-400 mt-1">{requests.filter(r => r.status === 2).length}</h3>
            <p className="text-[11px] text-blue-300/80 mt-0.5">Kỹ thuật viên đang kiểm tra</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 shrink-0">
            <PenTool className="w-6 h-6" />
          </div>
        </div>

        {/* Thẻ 3: Đã hoàn thành */}
        <div 
          onClick={() => setFilterStatus(prev => prev === 3 ? '' : 3)}
          className={`p-4 rounded-2xl border shadow-xl flex items-center justify-between cursor-pointer transition-all duration-200 select-none ${
            filterStatus === 3
              ? 'bg-[#0c142c] border-2 border-emerald-400/80 shadow-emerald-500/20 scale-[1.02]'
              : 'bg-[#0c142c]/90 border-blue-500/20 hover:border-emerald-500/40 hover:scale-[1.01]'
          }`}
          title="Bấm để lọc phiếu đã hoàn thành"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đã Hoàn Thành</p>
            <h3 className="text-3xl font-black text-emerald-400 mt-1">{requests.filter(r => r.status === 3).length}</h3>
            <p className="text-[11px] text-emerald-300/80 mt-0.5">Đã khắc phục & bàn giao lại</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/30 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. THANH TÌM KIẾM & BỘ LỌC SQUIRCLE */}
      <div className="rounded-2xl bg-[#0c142c]/90 border border-blue-500/20 p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900/80 text-white placeholder-slate-400 text-sm focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 outline-none transition-all" 
              placeholder="Tìm kiếm theo tiêu đề sự cố, tên khoa phòng..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="sm:w-60">
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value === '' ? '' : parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900/80 text-white text-sm focus:ring-2 focus:ring-cyan-400/30 outline-none transition-all"
            >
              <option value="">Tất cả trạng thái</option>
              <option value={1}>🟡 Đang chờ tiếp nhận</option>
              <option value={2}>🔵 Đang xử lý</option>
              <option value={3}>🟢 Hoàn thành</option>
              <option value={4}>🔴 Từ chối</option>
            </select>
          </div>
          {(searchTerm || filterStatus !== '') && (
            <button 
              onClick={() => { setSearchTerm(''); setFilterStatus(''); }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* 4. CONTAINER BẢNG DỮ LIỆU SQUIRCLE GLASS TABLE */}
      <section className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-blue-950/70 border-b border-blue-500/20 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-5">ID</th>
                <th className="py-3.5 px-5">Tiêu đề / Lỗi</th>
                <th className="py-3.5 px-5">Khoa phòng</th>
                <th className="py-3.5 px-5">Trạng thái</th>
                <th className="py-3.5 px-5">Người xử lý</th>
                <th className="py-3.5 px-5">Cập nhật lúc</th>
                <th className="py-3.5 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-4xl animate-spin text-cyan-400">progress_activity</span>
                      <span>Đang tải danh sách phiếu đề nghị...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-blue-500/20 flex items-center justify-center text-slate-400 mb-3 shadow-md">
                        <ClipboardList className="w-7 h-7" />
                      </div>
                      <p className="text-base font-bold text-white">Không tìm thấy phiếu đề nghị phù hợp</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {searchTerm || filterStatus !== '' 
                          ? 'Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.' 
                          : 'Hiện chưa có phiếu đề nghị nào. Bấm nút "+ Tạo Phiếu Đề Nghị" để gửi yêu cầu.'}
                      </p>
                      {(searchTerm || filterStatus !== '') && (
                        <button
                          onClick={() => { setSearchTerm(''); setFilterStatus(''); }}
                          className="mt-4 px-4 py-2 text-xs font-semibold text-cyan-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 cursor-pointer"
                        >
                          Đặt lại bộ lọc & tìm kiếm
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((req, idx) => {
                  const deptName = req.department?.name || departments.find(d => d.id === req.departmentId)?.name || 'Không rõ';
                  const stt = (currentPage - 1) * pageSize + idx + 1;
                  return (
                  <tr key={req.id} className="hover:bg-blue-600/10 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-white">
                      <span className="text-xs text-slate-500 font-normal mr-2 font-mono">#{stt}</span>
                      <span className="text-cyan-300 font-mono">REQ-{req.id}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-white">{req.title}</p>
                      <p className="text-xs text-slate-400 max-w-xs truncate" title={req.description}>{req.description}</p>
                      {req.asset && <span className="text-[11px] bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded-md text-cyan-300 mt-1 inline-block font-mono">TB: {req.asset.name}</span>}
                    </td>
                    <td className="py-3.5 px-5 text-slate-300 font-medium">{deptName}</td>
                    <td className="py-3.5 px-5">{getStatusText(req.status)}</td>
                    <td className="py-3.5 px-5">
                      {req.handlerName ? (
                        <div>
                          <p className="font-medium text-white">{req.handlerName}</p>
                          <p className="text-xs text-slate-400 max-w-[150px] truncate" title={req.handlingNotes}>{req.handlingNotes}</p>
                        </div>
                      ) : <span className="text-slate-500">-</span>}
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 text-xs font-mono">
                      {new Date(req.updatedAt || req.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button 
                        onClick={() => openHandleModal(req)}
                        className="px-3.5 py-1.5 bg-blue-500/20 text-cyan-300 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl font-semibold transition-all text-xs hover:scale-105 active:scale-95"
                      >
                        Tiếp nhận / Xử lý
                      </button>
                    </td>
                  </tr>
                );})
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredRequests.length > 0 && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredRequests.length}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </section>

      {/* 5. CREATE MODAL SQUIRCLE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl w-[600px] max-w-full overflow-hidden flex flex-col border border-blue-500/30">
            <div className="px-6 py-4 border-b border-blue-500/20 flex justify-between items-center bg-slate-900/80">
              <h3 className="font-bold text-lg flex items-center gap-2 text-white">
                <FileText className="w-5 h-5 text-amber-400"/> Tạo phiếu đề nghị mới
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Khoa phòng đề nghị <span className="text-rose-400">*</span></label>
                <select 
                  value={departmentId} 
                  onChange={e => setDepartmentId(e.target.value)} 
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-700 bg-slate-900 text-white rounded-xl focus:ring-2 focus:ring-cyan-400/30 outline-none text-sm"
                >
                  <option value="">-- Chọn khoa phòng --</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Thiết bị hỏng (Tùy chọn)</label>
                <select value={assetId} onChange={e => setAssetId(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-700 bg-slate-900 text-white rounded-xl focus:ring-2 focus:ring-cyan-400/30 outline-none text-sm">
                  <option value="">-- Không xác định hoặc nhiều thiết bị --</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Tiêu đề sự cố <span className="text-rose-400">*</span></label>
                <input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-700 bg-slate-900 text-white placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-cyan-400/30 outline-none text-sm" 
                  placeholder="VD: Báo hỏng máy hút dịch, nội soi..." 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Mô tả tình trạng chi tiết <span className="text-rose-400">*</span></label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-700 bg-slate-900 text-white placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-cyan-400/30 outline-none min-h-[100px] text-sm resize-none" 
                  placeholder="Mô tả các biểu hiện lỗi, sự cố gặp phải..." 
                />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-blue-500/20">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  disabled={submitting}
                  className="px-5 py-2.5 font-semibold text-slate-300 hover:bg-slate-800 rounded-xl text-xs border border-slate-700 transition-all"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-6 py-2.5 font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white rounded-xl text-xs shadow-lg shadow-orange-500/30 disabled:opacity-50 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <span>Gửi Phiếu Đề Nghị</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. HANDLE MODAL SQUIRCLE */}
      {showHandleModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl w-[520px] max-w-full overflow-hidden flex flex-col border border-blue-500/30">
            <div className="px-6 py-4 border-b border-blue-500/20 flex justify-between items-center bg-slate-900/80">
              <h3 className="font-bold text-lg text-white">Tiếp Nhận / Xử Lý Phiếu Đề Nghị</h3>
              <button onClick={() => setShowHandleModal(false)} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 bg-slate-900/60 text-xs text-slate-300 border-b border-blue-500/20 space-y-1.5">
              <p><strong className="text-white">Tiêu đề:</strong> {selectedRequest.title}</p>
              <p><strong className="text-white">Khoa yêu cầu:</strong> {selectedRequest.department?.name}</p>
              <p><strong className="text-white">Nội dung:</strong> {selectedRequest.description}</p>
            </div>
            <form onSubmit={submitHandle} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Cập nhật Trạng thái</label>
                <select value={handleStatus} onChange={e => setHandleStatus(parseInt(e.target.value))} className="w-full px-3.5 py-2.5 border border-slate-700 bg-slate-900 text-white rounded-xl focus:ring-2 focus:ring-cyan-400/30 outline-none text-sm">
                  <option value={1}>Chưa tiếp nhận (Đang chờ)</option>
                  <option value={2}>Đang xử lý</option>
                  <option value={3}>Đã Hoàn thành</option>
                  <option value={4}>Từ chối yêu cầu</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Cán bộ xử lý (Phòng Vật Tư - Kỹ Thuật)</span>
                  <span className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    Chọn tài khoản hệ thống
                  </span>
                </label>
                <div className="relative">
                  <select 
                    value={handlerName} 
                    onChange={e => setHandlerName(e.target.value)} 
                    className="w-full px-3.5 py-2.5 border border-slate-700 bg-slate-900 text-white rounded-xl focus:ring-2 focus:ring-cyan-400/30 outline-none text-sm cursor-pointer appearance-none pr-10"
                  >
                    <option value="">-- Chọn cán bộ tiếp nhận / xử lý --</option>
                    {/* Giữ lại tên cán bộ hiện tại nếu không trùng khớp tên trong danh sách user */}
                    {handlerName && !users.some(u => (u.fullName || u.username) === handlerName || u.username === handlerName) && (
                      <option value={handlerName}>{handlerName} (Đã ghi nhận)</option>
                    )}
                    {users.map(u => {
                      const displayTitle = u.fullName ? `${u.fullName} (${u.username})` : u.username;
                      const selectedVal = u.fullName || u.username;
                      const roleName = u.roleId === 1 ? 'Quản trị viên' : (u.roleId === 2 ? 'Quản lý' : 'Nhân viên');
                      const deptStr = u.departmentName ? ` - ${u.departmentName}` : '';
                      return (
                        <option key={u.id} value={selectedVal}>
                          {displayTitle} • {roleName}{deptStr}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Hướng xử lý / Ghi chú kỹ thuật</label>
                <textarea value={handlingNotes} onChange={e => setHandlingNotes(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-700 bg-slate-900 text-white placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-cyan-400/30 outline-none min-h-[80px] text-sm resize-none" placeholder="Đã kiểm tra, thay thế linh kiện, dự kiến hoàn thành..." />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-blue-500/20">
                <button type="button" onClick={() => setShowHandleModal(false)} className="px-5 py-2.5 font-semibold text-slate-300 hover:bg-slate-800 rounded-xl text-xs border border-slate-700 transition-all">Đóng</button>
                <button type="submit" className="px-6 py-2.5 font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95">Cập Nhật Phiếu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairRequests;
