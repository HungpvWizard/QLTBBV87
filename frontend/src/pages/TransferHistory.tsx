import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Download, History, Plus, Search, X, CheckSquare, Square, Handshake, User, Building2, Building, RefreshCw, ClipboardList, RotateCcw, CheckCircle2 } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import * as XLSX from 'xlsx';
import api from '../api/axios';
import { generateTransferPDF } from '../utils/pdfGenerator';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

// Danh sách khoa phòng chuẩn Bệnh viện Quân y 87
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
const LOCAL_USER_DEP_MAP_KEY = 'ASSET_USER_DEPARTMENT_MAPPING';

const TransferHistory = () => {
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'history' | 'handover'>('history');
  
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Danh sách tài khoản & khoa phòng đồng bộ từ module Quản lý Khoa Phòng
  const [usersList, setUsersList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_DEP_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= DEFAULT_DEPARTMENTS.length) return parsed;
      }
    } catch {}
    return DEFAULT_DEPARTMENTS;
  });
  const [isSyncingDept, setIsSyncingDept] = useState(false);

  // Handover state
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [senderName, setSenderName] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [filterReceiverDept, setFilterReceiverDept] = useState<string>('all');
  const [notes, setNotes] = useState('');
  const sigCanvas = useRef<any>(null);
  
  useEffect(() => {
    fetchTransfers();
    fetchAssets();
    fetchUsersAndDepartments();

    // Lắng nghe sự kiện cập nhật khoa phòng từ module Quản lý Khoa Phòng
    const handleDeptUpdated = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setDepartmentsList(e.detail);
      } else {
        fetchUsersAndDepartments();
      }
    };
    window.addEventListener('departmentsUpdated', handleDeptUpdated);
    window.addEventListener('departmentsChanged', fetchUsersAndDepartments);
    return () => {
      window.removeEventListener('departmentsUpdated', handleDeptUpdated);
      window.removeEventListener('departmentsChanged', fetchUsersAndDepartments);
    };
  }, []);

  // Nếu URL có query param ?action=handover&assetId=xxx thì tự động chuyển sang tab bàn giao và chọn tài sản đó
  useEffect(() => {
    const action = searchParams.get('action');
    const assetIdParam = searchParams.get('assetId');
    if (action === 'handover') {
      setActiveTab('handover');
      if (assetIdParam) {
        const idNum = parseInt(assetIdParam);
        if (!isNaN(idNum)) {
          setSelectedAssetIds(prev => prev.includes(idNum) ? prev : [...prev, idNum]);
        }
      }
    }
  }, [searchParams]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/assettransfers');
      setTransfers(res.data);
    } catch (err) {
      console.error("Lỗi lấy lịch sử", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await api.get('/assets');
      setAssets(res.data);
    } catch (err) {
      console.error("Lỗi lấy tài sản", err);
    }
  };

  const fetchUsersAndDepartments = async () => {
    try {
      let depts = DEFAULT_DEPARTMENTS;
      try {
        const dRes = await api.get('/departments');
        if (Array.isArray(dRes.data) && dRes.data.length > 0) {
          depts = dRes.data;
          setDepartmentsList(depts);
          try {
            localStorage.setItem(LOCAL_DEP_KEY, JSON.stringify(depts));
          } catch {}
        }
      } catch {
        try {
          const cached = localStorage.getItem(LOCAL_DEP_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length >= DEFAULT_DEPARTMENTS.length) {
              depts = parsed;
              setDepartmentsList(parsed);
            }
          }
        } catch {}
      }

      const depMap = new Map<number, string>();
      depts.forEach(d => depMap.set(d.id, d.name));

      let localUserDepMap: Record<number, number> = {};
      try {
        localUserDepMap = JSON.parse(localStorage.getItem(LOCAL_USER_DEP_MAP_KEY) || '{}');
      } catch {}

      try {
        const uRes = await api.get('/users');
        if (Array.isArray(uRes.data)) {
          const formatted = uRes.data.map(u => {
            const mappedDepId = u.departmentId || localUserDepMap[u.id];
            const deptName = u.departmentName || (mappedDepId ? depMap.get(mappedDepId) : null) || 'Chưa phân khoa';
            return {
              ...u,
              departmentId: mappedDepId || null,
              departmentName: deptName,
              fullString: `${u.fullName || u.username} (${u.username}) - [${deptName}]`,
            };
          });
          setUsersList(formatted);

          if (!senderName) {
            const foundUser = formatted.find(u => u.username === currentUser?.username);
            if (foundUser) {
              setSenderName(foundUser.fullString);
            } else if (currentUser?.fullName) {
              setSenderName(currentUser.fullName);
            }
          }
        }
      } catch {}
    } catch (err) {
      console.error("Lỗi nạp danh sách tài khoản & khoa phòng", err);
    }
  };

  const handleManualSyncDepartments = async () => {
    setIsSyncingDept(true);
    await fetchUsersAndDepartments();
    setTimeout(() => {
      setIsSyncingDept(false);
      alert('Đã đồng bộ tức thì toàn bộ danh mục khoa phòng & tài khoản!');
    }, 400);
  };

  // Lọc danh sách người nhận theo khoa phòng nếu được chọn
  const filteredReceiverUsers = useMemo(() => {
    if (filterReceiverDept === 'all') return usersList;
    return usersList.filter(u => u.departmentName === filterReceiverDept);
  }, [usersList, filterReceiverDept]);

  const availableAssets = assets.filter(a => a.status === 1 || a.status === 2);
  const filteredPickerAssets = availableAssets.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (a.assetTag && a.assetTag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedAssetsList = assets.filter(a => selectedAssetIds.includes(a.id));

  const handleToggleAsset = (id: number) => {
    if (selectedAssetIds.includes(id)) {
      setSelectedAssetIds(selectedAssetIds.filter(i => i !== id));
    } else {
      setSelectedAssetIds([...selectedAssetIds, id]);
    }
  };

  const handleBulkHandover = async () => {
    if (selectedAssetIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 tài sản để bàn giao!");
      return;
    }
    if (!receiverName) {
      alert("Vui lòng chọn người nhận!");
      return;
    }

    const signatureData = sigCanvas.current && !sigCanvas.current.isEmpty() ? sigCanvas.current.toDataURL() : '';
    const fullNotes = `Người giao: ${senderName || 'Không có'}\nNgười nhận: ${receiverName}\nGhi chú: ${notes}`;

    let receivingDeptName = '';
    let receivingDeptId: number | null = null;

    if (filterReceiverDept && filterReceiverDept !== 'all') {
      receivingDeptName = filterReceiverDept;
    } else {
      const matchedDept = departmentsList.find(d => receiverName.includes(d.name));
      if (matchedDept) {
        receivingDeptName = matchedDept.name;
        receivingDeptId = matchedDept.id;
      } else {
        const match = receiverName.match(/\[(.*?)\]/) || receiverName.match(/\((.*?)\)/);
        if (match && match[1]) {
          receivingDeptName = match[1].replace('Đại diện khoa', '').replace('Đại diện', '').trim();
        }
      }
    }

    if (!receivingDeptId && receivingDeptName) {
      const matchedDept = departmentsList.find(d => d.name === receivingDeptName);
      if (matchedDept) receivingDeptId = matchedDept.id;
    }

    try {
      // 1. Tạo bản ghi lịch sử bàn giao
      await Promise.all(selectedAssetIds.map(assetId => 
        api.post('/assettransfers', {
          assetId,
          notes: fullNotes,
          signatureData,
          transferDate: new Date().toISOString()
        })
      ));
      
      // 2. Cập nhật trạng thái tài sản thành Đang sử dụng (2) và lưu khoa nhận
      await Promise.all(selectedAssetIds.map(assetId => {
        const asset = assets.find(a => a.id === assetId);
        if (asset) {
          const { category, transfers, assignedUser, ...assetClean } = asset as any;
          return api.put(`/assets/${assetId}`, { 
            ...assetClean, 
            status: 2,
            currentDepartment: receivingDeptName || assetClean.currentDepartment || 'Khoa nhận bàn giao',
            departmentId: receivingDeptId || assetClean.departmentId
          });
        }
        return Promise.resolve();
      }));

      alert("Bàn giao thành công!");
      // Reset form
      setReceiverName('');
      setNotes('');
      setSelectedAssetIds([]);
      sigCanvas.current?.clear();
      
      // Refresh data
      fetchTransfers();
      fetchAssets();
      setActiveTab('history');
      
    } catch (error) {
      console.error("Lỗi bàn giao", error);
      alert("Có lỗi xảy ra khi bàn giao!");
    }
  };

  const filteredTransfers = useMemo(() => {
    if (!historySearchTerm.trim()) return transfers;
    const term = historySearchTerm.toLowerCase();
    return transfers.filter(t => {
      const assetName = t.asset?.name?.toLowerCase() || '';
      const assetTag = t.asset?.assetTag?.toLowerCase() || '';
      const notes = t.notes?.toLowerCase() || '';
      const idStr = `tr-${t.id}`.toLowerCase();
      return assetName.includes(term) || assetTag.includes(term) || notes.includes(term) || idStr.includes(term);
    });
  }, [transfers, historySearchTerm]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [historySearchTerm]);

  // Paginated transfers
  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransfers.slice(start, start + pageSize);
  }, [filteredTransfers, currentPage, pageSize]);

  const handleExportTransfersExcel = () => {
    if (filteredTransfers.length === 0) {
      alert("Không có dữ liệu bàn giao để xuất Excel!");
      return;
    }
    const dataToExport = filteredTransfers.map((t, idx) => {
      let sender = '-';
      let receiver = '-';
      let realNotes = t.notes || '';
      if (realNotes.includes('Người giao:')) {
        const lines = realNotes.split('\n');
        sender = lines.find((l: string) => l.startsWith('Người giao:'))?.replace('Người giao:', '').trim() || '-';
        receiver = lines.find((l: string) => l.startsWith('Người nhận:'))?.replace('Người nhận:', '').trim() || '-';
        realNotes = lines.filter((l: string) => !l.startsWith('Người giao:') && !l.startsWith('Người nhận:')).join('; ').replace('Ghi chú:', '').trim();
      }
      return {
        'STT': idx + 1,
        'Mã bàn giao': `TR-${t.id}`,
        'Tên thiết bị': t.asset?.name || '',
        'Mã QR': t.asset?.assetTag || '',
        'Ngày bàn giao': new Date(t.transferDate).toLocaleString('vi-VN'),
        'Người giao': sender,
        'Người nhận': receiver,
        'Ghi chú': realNotes
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'LichSuBanGiao');
    XLSX.writeFile(workbook, 'LichSu_BanGiao_ThietBi.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* 1. MODULE HEADER BANNER SQUIRCLE GRADIENT */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c142c] via-[#0f1b3d] to-[#0c142c] border border-blue-500/20 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 ring-1 ring-white/20 shrink-0">
              <Handshake className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Quản lý Bàn giao &amp; Điều chuyển
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Biên bản &amp; Chữ ký số
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400 font-medium">
                Ghi nhận biên bản bàn giao thiết bị y tế, ký điện tử phân bổ về 36 khoa phòng và theo dõi vòng đời
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => { fetchTransfers(); fetchAssets(); }}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 transition-all font-semibold text-sm flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              title="Làm mới dữ liệu bàn giao"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>Làm mới</span>
            </button>

            <button
              onClick={handleExportTransfersExcel}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95 border border-emerald-400/30"
              title="Xuất danh sách lịch sử bàn giao ra file Excel"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={() => setActiveTab('handover')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer active:scale-95 border border-cyan-300/30"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Thực Hiện Bàn Giao</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CỤM 4 THẺ KPI SQUIRCLE GRADIENT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng lượt bàn giao */}
        <div 
          onClick={() => setActiveTab('history')}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 shadow-lg ${
            activeTab === 'history'
              ? 'bg-gradient-to-br from-blue-900/60 to-indigo-950/80 border-blue-400 ring-2 ring-blue-500/30 shadow-blue-500/20'
              : 'bg-[#0c142c]/90 hover:bg-[#0f1b3d] border-blue-500/20 hover:border-blue-400/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">Lượt bàn giao</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-cyan-400">{transfers.length}</span>
                <span className="text-xs text-slate-400">biên bản</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Đã lưu vết đầy đủ chữ ký số</p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 group-hover:scale-110 transition-transform">
              <History className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Lịch sử chi tiết</span>
            <span className="text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">Xem bảng →</span>
          </div>
        </div>

        {/* KPI 2: Thiết bị trong kho */}
        <div 
          onClick={() => setActiveTab('handover')}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 shadow-lg ${
            activeTab === 'handover'
              ? 'bg-gradient-to-br from-emerald-950/70 to-teal-950/80 border-emerald-400 ring-2 ring-emerald-500/30 shadow-emerald-500/20'
              : 'bg-[#0c142c]/90 hover:bg-[#0f1b3d] border-emerald-500/20 hover:border-emerald-400/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">Sẵn sàng bàn giao</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-emerald-400">{availableAssets.length}</span>
                <span className="text-xs text-slate-400">thiết bị</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Thiết bị trong kho và đang dùng</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <Handshake className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Tạo biên bản mới</span>
            <span className="text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">Bàn giao ngay →</span>
          </div>
        </div>

        {/* KPI 3: Thiết bị đang sử dụng */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-purple-500/20 bg-[#0c142c]/90 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-300/80">Đang phục vụ điều trị</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-purple-400">{assets.filter(a => a.status === 2).length}</span>
                <span className="text-xs text-slate-400">máy</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Đã phân bổ về các khoa phòng</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Hoạt động bình thường</span>
            <span className="text-purple-400 font-medium">Tại khoa</span>
          </div>
        </div>

        {/* KPI 4: 36 Khoa Phòng */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-amber-500/20 bg-[#0c142c]/90 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">Khoa phòng tiếp nhận</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-amber-400">{departmentsList.length}</span>
                <span className="text-xs text-slate-400">khoa/phòng</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Đồng bộ từ Quản lý Khoa Phòng</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Mạng lưới phân bổ</span>
            <span className="text-amber-400 font-medium">Toàn viện</span>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR CONTROLS & TAB SEGMENTED PILLS */}
      <div className="rounded-2xl bg-[#0c142c]/90 border border-blue-500/20 p-4 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Tab Switcher Pills */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-900/90 border border-slate-700/80 w-fit">
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'history' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Lịch Sử Bàn Giao ({transfers.length})</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('handover')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'handover' 
                ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-md shadow-cyan-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Handshake className="w-4 h-4" />
            <span>Thực Hiện Bàn Giao</span>
          </button>

          <Link 
            to="/reports"
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
            title="Xem báo cáo chi tiết trang thiết bị theo từng khoa"
          >
            <ClipboardList className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Báo Cáo Theo Khoa</span>
          </Link>
        </div>

        {/* Search Input khi ở tab Lịch sử */}
        {activeTab === 'history' && (
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              type="text"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900/80 text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm font-medium"
              placeholder="Tìm theo mã TR-..., tên thiết bị, người giao/nhận..."
              value={historySearchTerm}
              onChange={e => setHistorySearchTerm(e.target.value)}
            />
            {historySearchTerm && (
              <button 
                onClick={() => setHistorySearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. NỘI DUNG CHÍNH (TAB 1: LỊCH SỬ / TAB 2: BÀN GIAO) */}
      {activeTab === 'history' && (
        <div className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto min-h-[380px]">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-blue-950/70 border-b border-blue-500/20 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-4 px-6">Mã Bàn Giao</th>
                  <th className="py-4 px-6">Tài sản / Thiết bị</th>
                  <th className="py-4 px-6">Ngày bàn giao</th>
                  <th className="py-4 px-6">Người giao</th>
                  <th className="py-4 px-6">Người nhận &amp; Đơn vị</th>
                  <th className="py-4 px-6">Ghi chú</th>
                  <th className="py-4 px-6 text-right">Biên bản PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-slate-300">Đang tải lịch sử bàn giao...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                          <History className="w-8 h-8 text-cyan-400" />
                        </div>
                        <p className="text-base font-bold text-slate-200">Không tìm thấy lượt bàn giao phù hợp</p>
                        <p className="text-xs text-slate-400 mt-1 text-center">
                          {historySearchTerm ? 'Thử thay đổi từ khóa tìm kiếm.' : 'Các lượt bàn giao tài sản & thiết bị sẽ được lưu vết và hiển thị tại đây.'}
                        </p>
                        {historySearchTerm && (
                          <button
                            onClick={() => setHistorySearchTerm('')}
                            className="mt-4 px-4 py-2 text-xs font-semibold text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/50 rounded-xl transition-colors border border-cyan-500/30 cursor-pointer shadow-sm"
                          >
                            Xóa từ khóa tìm kiếm
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTransfers.map((t) => {
                    let sender = '-';
                    let receiver = '-';
                    let realNotes = t.notes || '';

                    if (realNotes.includes('Người giao:')) {
                      const lines = realNotes.split('\n');
                      sender = lines.find((l: string) => l.startsWith('Người giao:'))?.replace('Người giao:', '').trim() || '-';
                      receiver = lines.find((l: string) => l.startsWith('Người nhận:'))?.replace('Người nhận:', '').trim() || '-';
                      realNotes = lines.filter((l: string) => !l.startsWith('Người giao:') && !l.startsWith('Người nhận:')).join('\n').replace('Ghi chú:', '').trim();
                    }

                    return (
                      <tr key={t.id} className="hover:bg-blue-600/10 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-cyan-400">
                          TR-{t.id}
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-100">{t.asset?.name}</div>
                          <div className="text-xs font-mono text-cyan-300/80 mt-0.5">({t.asset?.assetTag})</div>
                        </td>
                        <td className="py-4 px-6 text-slate-300 font-medium">
                          {new Date(t.transferDate).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-4 px-6 text-slate-300 font-medium">
                          {sender}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-cyan-300">{receiver}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-300 max-w-xs truncate" title={realNotes}>
                          {realNotes || <span className="text-slate-500 italic">Không có</span>}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => generateTransferPDF(t)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Xuất PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between flex-wrap gap-4">
            <Pagination
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              totalItems={filteredTransfers.length}
              pageSize={pageSize}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* TAB 2: THỰC HIỆN BÀN GIAO */}
      {activeTab === 'handover' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
          
          {/* Cột trái: Thông tin các bên & Chữ ký */}
          <div className="space-y-6">
            <div className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 p-6 shadow-2xl backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-cyan-400 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-base text-white">Thông Tin Các Bên Bàn Giao</h3>
                </div>
                <button
                  type="button"
                  onClick={handleManualSyncDepartments}
                  disabled={isSyncingDept}
                  className="text-xs text-cyan-300 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Đồng bộ danh mục khoa phòng mới nhất từ Quản lý Khoa Phòng"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDept ? 'animate-spin' : ''}`} />
                  <span>Đồng bộ Khoa Phòng</span>
                </button>
              </div>

              {/* Người giao */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Người giao (Đại diện kho)</span>
                  <span className="text-xs font-normal text-slate-400">Chọn tài khoản</span>
                </label>
                <select 
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm cursor-pointer"
                >
                  <option value="">-- Chọn tài khoản người giao --</option>
                  {departmentsList.map(dept => {
                    const deptUsers = usersList.filter(u => u.departmentName === dept.name || u.departmentId === dept.id);
                    return (
                      <optgroup key={dept.id} label={`🏢 ${dept.name}`} className="bg-slate-900 text-slate-300">
                        <option value={`${dept.name} (Đại diện kho)`}>
                          🏢 Đại diện {dept.name}
                        </option>
                        {deptUsers.map(u => (
                          <option key={u.id} value={u.fullString}>
                            👤 {u.fullName ? `${u.fullName} (@${u.username})` : u.username} — [{dept.name}]
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {usersList.filter(u => !u.departmentId && (!u.departmentName || u.departmentName === 'Chưa phân khoa')).length > 0 && (
                    <optgroup label="🏢 Tài khoản chưa phân khoa" className="bg-slate-900 text-slate-300">
                      {usersList.filter(u => !u.departmentId && (!u.departmentName || u.departmentName === 'Chưa phân khoa')).map(u => (
                        <option key={u.id} value={u.fullString}>
                          👤 {u.fullName ? `${u.fullName} (@${u.username})` : u.username} — [Chưa phân khoa]
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Người nhận */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Người nhận <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    <select
                      value={filterReceiverDept}
                      onChange={e => setFilterReceiverDept(e.target.value)}
                      className="text-xs py-1 px-2 rounded-lg border border-slate-700 bg-slate-800 text-cyan-300 outline-none font-bold cursor-pointer"
                      title="Lọc nhanh danh sách theo từng khoa phòng"
                    >
                      <option value="all">Tất cả khoa ({departmentsList.length})</option>
                      {departmentsList.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <select 
                  value={receiverName}
                  onChange={e => setReceiverName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm cursor-pointer"
                >
                  <option value="">-- Chọn tài khoản nhân sự / khoa phòng nhận --</option>
                  {filterReceiverDept === 'all' ? (
                    <>
                      {departmentsList.map(dept => {
                        const deptUsers = usersList.filter(u => u.departmentName === dept.name || u.departmentId === dept.id);
                        return (
                          <optgroup key={dept.id} label={`🏢 ${dept.name}`} className="bg-slate-900 text-slate-300">
                            <option value={`${dept.name} (Đại diện khoa)`}>
                              🏢 Đại diện {dept.name}
                            </option>
                            {deptUsers.map(u => (
                              <option key={u.id} value={u.fullString}>
                                👤 {u.fullName ? `${u.fullName} (@${u.username})` : u.username} — [{dept.name}]
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                      {usersList.filter(u => !u.departmentId && (!u.departmentName || u.departmentName === 'Chưa phân khoa')).length > 0 && (
                        <optgroup label="🏢 Tài khoản chưa phân khoa" className="bg-slate-900 text-slate-300">
                          {usersList.filter(u => !u.departmentId && (!u.departmentName || u.departmentName === 'Chưa phân khoa')).map(u => (
                            <option key={u.id} value={u.fullString}>
                              👤 {u.fullName ? `${u.fullName} (@${u.username})` : u.username} — [Chưa phân khoa]
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  ) : (
                    <>
                      <optgroup label={`🏢 ${filterReceiverDept}`} className="bg-slate-900 text-slate-300">
                        <option value={`${filterReceiverDept} (Đại diện khoa)`}>
                          🏢 Đại diện {filterReceiverDept}
                        </option>
                        {filteredReceiverUsers.map(u => (
                          <option key={u.id} value={u.fullString}>
                            👤 {u.fullName ? `${u.fullName} (@${u.username})` : u.username} — [{u.departmentName || filterReceiverDept}]
                          </option>
                        ))}
                      </optgroup>
                    </>
                  )}
                </select>

                {receiverName && (
                  <div className="mt-2.5 p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-xs flex items-center gap-2">
                    <Building className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-slate-400">Đơn vị nhận: </span>
                      <strong className="text-cyan-300 font-bold">{receiverName}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Ghi chú thêm</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm min-h-[80px]"
                  placeholder="Tình trạng lúc giao, hồ sơ kỹ thuật kèm theo, yêu cầu bảo quản..."
                />
              </div>
            </div>

            {/* Vùng ký điện tử */}
            <div className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex justify-between items-end mb-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Chữ ký điện tử người nhận</label>
                <button 
                  onClick={() => sigCanvas.current?.clear()} 
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Xóa chữ ký
                </button>
              </div>
              <div className="border border-slate-700 rounded-2xl bg-white overflow-hidden shadow-inner">
                <SignatureCanvas 
                  ref={sigCanvas} 
                  canvasProps={{width: 450, height: 140, className: 'sigCanvas w-full'}} 
                />
              </div>
            </div>
          </div>

          {/* Cột phải: Danh sách tài sản & Xác nhận */}
          <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">
                Thiết Bị Bàn Giao ({selectedAssetIds.length} máy)
              </h3>
              <button 
                onClick={() => setShowAssetPicker(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 text-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> 
                <span>Chọn thiết bị từ Kho</span>
              </button>
            </div>

            {selectedAssetIds.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl bg-[#0c142c]/60 p-12 text-center min-h-[320px]">
                <Handshake className="w-14 h-14 text-slate-700 mb-3" />
                <p className="text-slate-300 font-bold text-base">Chưa có thiết bị nào được chọn.</p>
                <p className="text-slate-500 text-xs mt-1">Bấm nút "Chọn thiết bị từ Kho" để thêm vào biên bản.</p>
              </div>
            ) : (
              <div className="flex-1 border border-slate-800 rounded-3xl overflow-hidden bg-[#0c142c]/90 flex flex-col">
                <div className="overflow-y-auto flex-1 max-h-[420px] divide-y divide-slate-800">
                  {selectedAssetsList.map(asset => (
                    <div key={asset.id} className="p-4 flex items-center justify-between hover:bg-blue-600/10 transition-colors">
                      <div>
                        <p className="font-bold text-slate-100 text-sm">{asset.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-mono">
                          <span className="text-cyan-400">Mã: {asset.assetTag}</span>
                          {asset.serial && <span>SN: {asset.serial}</span>}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleToggleAsset(asset.id)}
                        className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Bỏ thiết bị này"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={handleBulkHandover}
              disabled={selectedAssetIds.length === 0 || !receiverName}
              className="w-full py-3.5 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 cursor-pointer shadow-emerald-500/25 text-sm"
            >
              Xác Nhận Bàn Giao {selectedAssetIds.length > 0 && `(${selectedAssetIds.length} thiết bị)`}
            </button>
          </div>
          
        </div>
      )}

      {/* 5. MODAL CHỌN TÀI SẢN TỪ KHO SQUIRCLE GLASS */}
      {showAssetPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl w-[720px] max-w-[95vw] overflow-hidden flex flex-col max-h-[85vh] border border-blue-500/30">
            <div className="px-6 py-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/70">
              <div>
                <h3 className="font-bold text-lg text-white">Chọn Thiết Bị Bàn Giao</h3>
                <p className="text-xs text-slate-400">Danh sách các thiết bị trong kho và sẵn sàng điều chuyển</p>
              </div>
              <button 
                onClick={() => setShowAssetPicker(false)} 
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-cyan-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Tìm theo tên hoặc mã QR..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-700 bg-slate-800/90 text-white rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-800/80">
              {filteredPickerAssets.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">Không tìm thấy tài sản nào phù hợp.</div>
              ) : (
                <ul className="space-y-1.5">
                  {filteredPickerAssets.map(asset => {
                    const isSelected = selectedAssetIds.includes(asset.id);
                    return (
                      <li 
                        key={asset.id}
                        onClick={() => handleToggleAsset(asset.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3.5 ${
                          isSelected 
                            ? 'border-cyan-400 bg-cyan-500/15' 
                            : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80'
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
                            {asset.assetTag} {asset.serial ? `• SN: ${asset.serial}` : ''}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                          asset.status === 2 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {asset.status === 2 ? 'Đang dùng' : 'Trong kho'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="p-4 border-t border-slate-800/80 flex justify-between items-center bg-slate-900/70">
              <span className="text-xs font-semibold text-slate-300">
                Đã chọn: <strong className="text-cyan-400 text-sm font-mono">{selectedAssetIds.length}</strong> thiết bị
              </span>
              <button 
                onClick={() => setShowAssetPicker(false)}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Hoàn tất chọn
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TransferHistory;
