import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, X, CheckSquare, Square, Wrench, Calendar, DollarSign, FileText, Download, RotateCcw, Clock, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../api/axios';
import Pagination from '../components/Pagination';

const MaintenanceList = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Table filters
  const [mainSearchTerm, setMainSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | ''>('');
  
  // Form states
  const [issueDescription, setIssueDescription] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [scheduledDate, setScheduledDate] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchTickets();
    fetchAssets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/maintenancetickets');
      setTickets(response.data);
    } catch (error) {
      console.error("Lỗi tải ticket", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets');
      setAssets(response.data);
    } catch (error) {
      console.error("Lỗi tải tài sản", error);
    }
  };

  const handleStatusChange = async (ticketId: number, newStatus: number) => {
    try {
      await api.put(`/maintenancetickets/${ticketId}/status`, newStatus, {
        headers: { 'Content-Type': 'application/json' }
      });
      fetchTickets(); // Refresh data
    } catch (err) {
      console.error("Lỗi khi cập nhật trạng thái", err);
      alert("Lỗi khi cập nhật trạng thái");
    }
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (a.assetTag && a.assetTag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleToggleAsset = (id: number) => {
    if (selectedAssetIds.includes(id)) {
      setSelectedAssetIds(selectedAssetIds.filter(i => i !== id));
    } else {
      setSelectedAssetIds([...selectedAssetIds, id]);
    }
  };

  const handleCreateMaintenance = async () => {
    if (selectedAssetIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 tài sản!");
      return;
    }
    if (!issueDescription) {
      alert("Vui lòng nhập mô tả lỗi!");
      return;
    }
    if (!scheduledDate) {
      alert("Vui lòng chọn ngày bảo trì!");
      return;
    }

    try {
      // Bulk create tickets
      await Promise.all(selectedAssetIds.map(assetId => 
        api.post('/maintenancetickets', {
          assetId: assetId,
          issueDescription: issueDescription,
          status: 1, // Open / Đang chờ
          cost: Number(cost) || 0,
          scheduledDate: new Date(scheduledDate).toISOString()
        })
      ));

      // Reset form
      setSelectedAssetIds([]);
      setIssueDescription('');
      setCost('');
      setScheduledDate('');
      setShowModal(false);
      
      // Refresh
      fetchTickets();
      alert("Đã tạo lịch bảo trì thành công!");
    } catch (err) {
      console.error(err);
      alert("Có lỗi xảy ra khi tạo yêu cầu.");
    }
  };

  // Helper for date formatting
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchStatus = filterStatus === '' ? true : t.status === filterStatus;
      const matchSearch = mainSearchTerm === '' ? true : (
        (t.asset?.name?.toLowerCase().includes(mainSearchTerm.toLowerCase())) ||
        (t.asset?.assetTag?.toLowerCase().includes(mainSearchTerm.toLowerCase())) ||
        (`TCK-${t.id}`.toLowerCase().includes(mainSearchTerm.toLowerCase())) ||
        (t.issueDescription && t.issueDescription.toLowerCase().includes(mainSearchTerm.toLowerCase()))
      );
      return matchStatus && matchSearch;
    });
  }, [tickets, filterStatus, mainSearchTerm]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [mainSearchTerm, filterStatus]);

  // Paginated tickets
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  // KPI calculations
  const stats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter(t => t.status === 1).length;
    const inProgress = tickets.filter(t => t.status === 2).length;
    const completed = tickets.filter(t => t.status === 3).length;
    const totalCost = tickets.reduce((sum, t) => sum + (t.cost || 0), 0);
    return { total, pending, inProgress, completed, totalCost };
  }, [tickets]);

  const handleExportExcel = () => {
    if (filteredTickets.length === 0) {
      alert("Không có dữ liệu để xuất Excel!");
      return;
    }
    const dataToExport = filteredTickets.map((t, idx) => ({
      'STT': idx + 1,
      'Mã vé': `TCK-${t.id}`,
      'Tên tài sản': t.asset?.name || `ID: ${t.assetId}`,
      'Mã QR': t.asset?.assetTag || '',
      'Số Serial': t.asset?.serial || '',
      'Mô tả lỗi / Hạng mục': t.issueDescription || '',
      'Ngày hẹn bảo trì': formatDate(t.scheduledDate),
      'Chi phí dự kiến (VNĐ)': t.cost || 0,
      'Trạng thái': t.status === 1 ? 'Đang chờ' : t.status === 2 ? 'Đang xử lý' : t.status === 3 ? 'Hoàn thành' : 'Khác'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BaoTri');
    XLSX.writeFile(workbook, 'DanhSach_BaoTri_BaoHanh.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* 1. MODULE HEADER BANNER SQUIRCLE GRADIENT */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c142c] via-[#0f1b3d] to-[#0c142c] border border-blue-500/20 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/30 ring-1 ring-white/20 shrink-0">
              <span className="material-symbols-outlined text-white text-3xl">build</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Quản lý Bảo trì & Bảo hành
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Kỹ thuật & Thiết bị
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400 font-medium">
                Theo dõi kế hoạch bảo dưỡng định kỳ, điều phối kỹ thuật viên và kiểm soát chi phí sửa chữa
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchTickets}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 transition-all font-semibold text-sm flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              title="Làm mới dữ liệu vé bảo trì"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>Làm mới</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95 border border-emerald-400/30"
              title="Xuất toàn bộ yêu cầu bảo trì ra file Excel"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95 border border-amber-300/30"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tạo Lịch Bảo Trì</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CỤM 4 THẺ KPI SQUIRCLE GRADIENT TƯƠNG TÁC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng yêu cầu */}
        <div 
          onClick={() => setFilterStatus('')}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 shadow-lg ${
            filterStatus === ''
              ? 'bg-gradient-to-br from-blue-900/60 to-indigo-950/80 border-blue-400 ring-2 ring-blue-500/30 shadow-blue-500/20'
              : 'bg-[#0c142c]/90 hover:bg-[#0f1b3d] border-blue-500/20 hover:border-blue-400/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tổng yêu cầu</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-white">{stats.total}</span>
                <span className="text-xs text-slate-400">vé</span>
              </div>
              <p className="text-xs font-medium text-cyan-400 mt-2 flex items-center gap-1">
                <span>Dự kiến:</span>
                <span className="font-bold text-white">{stats.totalCost.toLocaleString('vi-VN')} đ</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">assignment</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Tất cả phiếu bảo trì</span>
            <span className="text-blue-400 font-bold group-hover:translate-x-0.5 transition-transform">Xem tất cả →</span>
          </div>
        </div>

        {/* KPI 2: Đang chờ xử lý */}
        <div 
          onClick={() => setFilterStatus(1)}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 shadow-lg ${
            filterStatus === 1
              ? 'bg-gradient-to-br from-amber-950/70 to-yellow-950/80 border-amber-400 ring-2 ring-amber-500/30 shadow-amber-500/20'
              : 'bg-[#0c142c]/90 hover:bg-[#0f1b3d] border-amber-500/20 hover:border-amber-400/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">Đang chờ tiếp nhận</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-amber-400">{stats.pending}</span>
                <span className="text-xs text-slate-400">vé chờ</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Cần phân công kỹ thuật viên</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Trạng thái: Đang chờ</span>
            <span className="text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">Lọc danh sách →</span>
          </div>
        </div>

        {/* KPI 3: Đang tiến hành sửa chữa */}
        <div 
          onClick={() => setFilterStatus(2)}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 shadow-lg ${
            filterStatus === 2
              ? 'bg-gradient-to-br from-cyan-950/70 to-blue-950/80 border-cyan-400 ring-2 ring-cyan-500/30 shadow-cyan-500/20'
              : 'bg-[#0c142c]/90 hover:bg-[#0f1b3d] border-cyan-500/20 hover:border-cyan-400/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">Đang xử lý kỹ thuật</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-cyan-400">{stats.inProgress}</span>
                <span className="text-xs text-slate-400">thiết bị</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Kỹ thuật viên đang thực hiện</p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">pending_actions</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Trạng thái: Đang xử lý</span>
            <span className="text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">Lọc danh sách →</span>
          </div>
        </div>

        {/* KPI 4: Đã hoàn thành */}
        <div 
          onClick={() => setFilterStatus(3)}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 shadow-lg ${
            filterStatus === 3
              ? 'bg-gradient-to-br from-emerald-950/70 to-teal-950/80 border-emerald-400 ring-2 ring-emerald-500/30 shadow-emerald-500/20'
              : 'bg-[#0c142c]/90 hover:bg-[#0f1b3d] border-emerald-500/20 hover:border-emerald-400/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">Đã hoàn thành</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-emerald-400">{stats.completed}</span>
                <span className="text-xs text-slate-400">đã bàn giao</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Đã nghiệm thu & hoạt động tốt</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Trạng thái: Hoàn thành</span>
            <span className="text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">Lọc danh sách →</span>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR CONTROLS & STATUS PILLS SQUIRCLE */}
      <div className="rounded-2xl bg-[#0c142c]/90 border border-blue-500/20 p-4 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-xl group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
          <input 
            type="text"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900/80 text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm font-medium"
            placeholder="Tìm kiếm theo mã vé (TCK-...), tên tài sản, mô tả lỗi..." 
            value={mainSearchTerm}
            onChange={e => setMainSearchTerm(e.target.value)}
          />
          {mainSearchTerm && (
            <button 
              onClick={() => setMainSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">Trạng thái:</span>
          
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === ''
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
            }`}
          >
            <span>Tất cả</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">{tickets.length}</span>
          </button>

          <button
            onClick={() => setFilterStatus(1)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 1
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-800/80 text-amber-300 hover:bg-slate-700 border border-amber-500/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Đang chờ</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">{stats.pending}</span>
          </button>

          <button
            onClick={() => setFilterStatus(2)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 2
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'bg-slate-800/80 text-cyan-300 hover:bg-slate-700 border border-cyan-500/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Đang xử lý</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">{stats.inProgress}</span>
          </button>

          <button
            onClick={() => setFilterStatus(3)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 3
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800/80 text-emerald-300 hover:bg-slate-700 border border-emerald-500/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Hoàn thành</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">{stats.completed}</span>
          </button>
        </div>
      </div>

      {/* 4. SQUIRCLE GLASS TABLE */}
      <div className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-h-[380px]">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-blue-950/70 border-b border-blue-500/20 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-4 px-6">Mã vé</th>
                <th className="py-4 px-6">Tài sản / Thiết bị</th>
                <th className="py-4 px-6">Mô tả lỗi / Hạng mục bảo dưỡng</th>
                <th className="py-4 px-6">Ngày hẹn</th>
                <th className="py-4 px-6 text-right">Chi phí dự kiến</th>
                <th className="py-4 px-6 text-center">Trạng thái xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-medium text-slate-300">Đang tải danh sách vé bảo trì...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                        <Wrench className="w-8 h-8 text-amber-400" />
                      </div>
                      <p className="text-base font-bold text-slate-200">Không tìm thấy yêu cầu bảo trì nào</p>
                      <p className="text-xs text-slate-400 mt-1 text-center">
                        {mainSearchTerm || filterStatus !== '' 
                          ? 'Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.' 
                          : 'Hiện chưa có lịch bảo trì nào. Bấm nút "+ Tạo Lịch Bảo Trì" để thêm mới.'}
                      </p>
                      {(mainSearchTerm || filterStatus !== '') && (
                        <button
                          onClick={() => { setMainSearchTerm(''); setFilterStatus(''); }}
                          className="mt-4 px-4 py-2 text-xs font-semibold text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/50 rounded-xl transition-colors border border-cyan-500/30 cursor-pointer shadow-sm"
                        >
                          Đặt lại bộ lọc & tìm kiếm
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-blue-600/10 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-cyan-400">
                      TCK-{t.id}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-100">{t.asset?.name || `ID: ${t.assetId}`}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-cyan-300/80">{t.asset?.assetTag || 'Chưa gắn mã'}</span>
                        {t.asset?.serial && (
                          <span className="text-[11px] text-slate-400 font-mono">SN: {t.asset.serial}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-300 max-w-sm truncate" title={t.issueDescription}>
                      <span className="font-medium text-slate-200">{t.issueDescription}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-300 font-medium">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(t.scheduledDate)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-emerald-400 font-mono">
                      {t.cost ? `${t.cost.toLocaleString('vi-VN')} đ` : '0 đ'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, parseInt(e.target.value))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer text-center shadow-sm transition-all focus:outline-none ${
                          t.status === 1 
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25' 
                            : t.status === 2 
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25' 
                            : t.status === 3 
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25' 
                            : 'bg-slate-700/40 text-slate-300 border-slate-600'
                        }`}
                        title="Nhấp để cập nhật trạng thái vé"
                      >
                        <option value={1} className="bg-slate-900 text-amber-300">🟡 Đang chờ</option>
                        <option value={2} className="bg-slate-900 text-cyan-300">🔵 Đang xử lý</option>
                        <option value={3} className="bg-slate-900 text-emerald-300">🟢 Hoàn thành</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Chân bảng: Phân trang Pagination */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between flex-wrap gap-4">
          <Pagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            totalItems={filteredTickets.length}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* 5. CREATION MODAL SQUIRCLE GLASS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl w-[820px] max-w-[95vw] overflow-hidden flex flex-col max-h-[90vh] border border-blue-500/30">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    Lên Lịch Bảo Trì / Sửa Chữa Hàng Loạt
                  </h3>
                  <p className="text-xs text-slate-400">Tạo vé bảo dưỡng định kỳ hoặc sửa chữa cho thiết bị được chọn</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Form Input Block */}
              <div className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      <Calendar className="w-4 h-4 text-cyan-400" /> Ngày hẹn bảo trì <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="date" 
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" /> Chi phí dự kiến / máy (VNĐ)
                    </label>
                    <input 
                      type="number" 
                      value={cost}
                      onChange={e => setCost(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm font-mono"
                      placeholder="VD: 500000"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    <FileText className="w-4 h-4 text-amber-400" /> Mô tả lỗi / Hạng mục bảo dưỡng <span className="text-rose-500">*</span>
                  </label>
                  <textarea 
                    value={issueDescription}
                    onChange={e => setIssueDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm min-h-[80px]"
                    placeholder="VD: Vệ sinh máy lạnh định kỳ 6 tháng, kiểm tra áp suất khí nén..."
                  />
                </div>
              </div>

              {/* Danh sách tài sản */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Chọn thiết bị cần bảo trì: <span className="text-cyan-400 font-mono text-sm">{selectedAssetIds.length} máy đã chọn</span>
                  </label>
                  {selectedAssetIds.length > 0 && (
                    <button
                      onClick={() => setSelectedAssetIds([])}
                      className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>

                <div className="relative mb-3 group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-cyan-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Tìm thiết bị theo tên hoặc mã QR..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
                  />
                </div>
                
                <div className="border border-slate-700/80 rounded-2xl max-h-[260px] overflow-y-auto bg-slate-900/80 divide-y divide-slate-800/80">
                  {filteredAssets.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Không tìm thấy thiết bị nào phù hợp.</div>
                  ) : (
                    <ul>
                      {filteredAssets.map(asset => {
                        const isSelected = selectedAssetIds.includes(asset.id);
                        return (
                          <li 
                            key={asset.id}
                            onClick={() => handleToggleAsset(asset.id)}
                            className={`p-3.5 cursor-pointer transition-colors flex items-center gap-3.5 ${
                              isSelected ? 'bg-cyan-500/15 border-l-4 border-cyan-400' : 'hover:bg-slate-800/60'
                            }`}
                          >
                            <div className={isSelected ? 'text-cyan-400' : 'text-slate-500'}>
                              {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-sm truncate ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                                {asset.name}
                              </p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">
                                {asset.assetTag || 'Không có mã'} {asset.serial ? `• SN: ${asset.serial}` : ''}
                              </p>
                            </div>
                            <div className="shrink-0">
                              <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                                asset.status === 2 
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}>
                                {asset.status === 2 ? 'Đang dùng' : 'Trong kho'}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800/80 flex justify-between items-center bg-slate-900/70 shrink-0">
              <button 
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-bold rounded-xl transition-all cursor-pointer text-sm"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleCreateMaintenance}
                disabled={selectedAssetIds.length === 0 || !scheduledDate || !issueDescription}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/25 active:scale-95 text-sm cursor-pointer"
              >
                Lưu lịch bảo trì {selectedAssetIds.length > 0 && `(${selectedAssetIds.length} máy)`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MaintenanceList;
