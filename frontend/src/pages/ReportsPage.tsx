import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Calendar, 
  Building2, 
  Building,
  Layers, 
  RefreshCw, 
  Warehouse, 
  PackageCheck, 
  ChevronDown, 
  ChevronRight,
  Sparkles,
  ClipboardList,
  ExternalLink,
  Briefcase
} from 'lucide-react';
import api from '../api/axios';
import * as XLSX from 'xlsx';
import { Pagination } from '../components/Pagination';
import { UsageFrequencyTab } from './UsageFrequencyTab';
import { WorkTasksReportTab } from './WorkTasksReportTab';

const LOCAL_DEP_KEY = 'ASSET_MANAGEMENT_DEPARTMENTS_CACHE';

interface AssetRecord {
  id: number;
  name: string;
  serial: string;
  assetTag: string;
  status: number;
  category?: { name: string; warehouse?: { name: string } };
  categoryId?: number;
  kyHieu?: string;
  manufacturer?: string;
  manufactureYear?: number;
  quantity?: number;
  currentDepartment?: string;
  departmentId?: number;
  purchaseDate?: string;
  // Thông tin liên kết từ Transfers
  lastTransferDate?: string;
  senderName?: string;
  receiverName?: string;
  notes?: string;
}

const ReportsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const reportContentRef = useRef<HTMLDivElement>(null);

  // Tab báo cáo hiện tại: 'departments' (theo khoa phòng), 'usage_frequency' (theo tần suất sử dụng), hoặc 'tasks' (thống kê theo công việc)
  const getInitialReportTab = (): 'departments' | 'usage_frequency' | 'tasks' => {
    const tab = searchParams.get('tab');
    if (tab === 'usage' || tab === 'usage_frequency') return 'usage_frequency';
    if (tab === 'tasks' || tab === 'work') return 'tasks';
    return 'departments';
  };

  const [activeReportTab, setActiveReportTab] = useState<'departments' | 'usage_frequency' | 'tasks'>(getInitialReportTab);

  // Đồng bộ khi URL search params thay đổi (khi click từ Sidebar menu con)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'usage' || tab === 'usage_frequency') {
      setActiveReportTab('usage_frequency');
    } else if (tab === 'tasks' || tab === 'work') {
      setActiveReportTab('tasks');
    } else if (tab === 'departments') {
      setActiveReportTab('departments');
    }
  }, [searchParams]);

  const handleSwitchTab = (tab: 'departments' | 'usage_frequency' | 'tasks') => {
    setActiveReportTab(tab);
    let tabParam = 'departments';
    if (tab === 'usage_frequency') tabParam = 'usage';
    else if (tab === 'tasks') tabParam = 'tasks';
    setSearchParams({ tab: tabParam });
  };

  // Bộ lọc thời gian
  const [timeFilterType, setTimeFilterType] = useState<'all' | 'day' | 'month' | 'quarter' | 'year'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Bộ lọc đơn vị & Kho
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Phân trang danh sách chi tiết (theo chuẩn Tài sản & Thiết bị)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Chế độ xem: 'table' (bảng chi tiết) hoặc 'grouped' (gom nhóm theo khoa)
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();

    // Lắng nghe sự kiện đồng bộ khoa phòng
    const handleSync = () => {
      fetchData();
    };
    window.addEventListener('departmentsChanged', handleSync);
    window.addEventListener('departmentsUpdated', handleSync);
    return () => {
      window.removeEventListener('departmentsChanged', handleSync);
      window.removeEventListener('departmentsUpdated', handleSync);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Tải khoa phòng
      let depts: any[] = [];
      try {
        const cached = localStorage.getItem(LOCAL_DEP_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) depts = parsed;
        }
        const depRes = await api.get('/departments');
        if (Array.isArray(depRes.data) && depRes.data.length > 0) {
          depts = depRes.data;
          localStorage.setItem(LOCAL_DEP_KEY, JSON.stringify(depRes.data));
        }
      } catch {
        const cached = localStorage.getItem(LOCAL_DEP_KEY);
        if (cached) depts = JSON.parse(cached);
      }
      setDepartments(depts);

      // 2. Tải lịch sử bàn giao để trích xuất mốc thời gian & thông tin người giao/nhận
      let rawTransfers: any[] = [];
      try {
        const trRes = await api.get('/assettransfers');
        if (Array.isArray(trRes.data)) {
          rawTransfers = trRes.data;
        }
      } catch (e) {
        console.error("Lỗi nạp transfers", e);
      }

      // Xây dựng bản đồ chuyển giao mới nhất cho từng thiết bị
      // Sắp xếp theo ngày giảm dần
      const sortedTransfers = [...rawTransfers].sort((a, b) => 
        new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime()
      );
      const latestTransferMap = new Map<number, any>();
      sortedTransfers.forEach(t => {
        if (t.assetId && !latestTransferMap.has(t.assetId)) {
          latestTransferMap.set(t.assetId, t);
        }
      });

      // 3. Tải danh sách tài sản & liên kết dữ liệu
      const assetRes = await api.get('/assets');
      const rawAssets: any[] = Array.isArray(assetRes.data) ? assetRes.data : [];

      const enrichedAssets: AssetRecord[] = rawAssets.map(a => {
        const transfer = latestTransferMap.get(a.id);
        let lastDate = transfer ? transfer.transferDate : undefined;
        let sender = '';
        let receiver = '';
        let parsedNotes = transfer ? transfer.notes || '' : '';

        if (parsedNotes.includes('Người giao:')) {
          const lines = parsedNotes.split('\n');
          sender = lines.find((l: string) => l.startsWith('Người giao:'))?.replace('Người giao:', '').trim() || '';
          receiver = lines.find((l: string) => l.startsWith('Người nhận:'))?.replace('Người nhận:', '').trim() || '';
        }

        // Xác định khoa nhận
        let deptName = a.currentDepartment || '';
        if (!deptName && receiver) {
          const matched = depts.find(d => receiver.includes(d.name));
          if (matched) deptName = matched.name;
          else {
            const match = receiver.match(/\[(.*?)\]/) || receiver.match(/\((.*?)\)/);
            if (match && match[1]) deptName = match[1].replace('Đại diện khoa', '').trim();
          }
        }

        // Nếu thiết bị đang sử dụng mà chưa gắn khoa -> gắn mặc định nếu có ghi nhận
        if (!deptName && a.status === 2 && receiver) {
          deptName = receiver;
        }

        return {
          ...a,
          currentDepartment: deptName || (a.status === 1 ? 'Kho Trang bị (Còn ở kho)' : undefined),
          lastTransferDate: lastDate,
          senderName: sender,
          receiverName: receiver,
          notes: parsedNotes
        };
      });

      setAssets(enrichedAssets);
    } catch (err) {
      console.error("Lỗi nạp dữ liệu báo cáo", err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Dữ liệu theo bộ lọc thời gian & từ khóa (chưa bị giới hạn bởi bộ lọc Khoa)
  const timeFilteredAssets = useMemo(() => {
    return assets.filter(item => {
      // Lọc theo từ khóa tìm kiếm
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = item.name?.toLowerCase().includes(term);
        const matchSerial = item.serial?.toLowerCase().includes(term);
        const matchKyHieu = item.kyHieu?.toLowerCase().includes(term);
        const matchMfg = item.manufacturer?.toLowerCase().includes(term);
        const matchDept = item.currentDepartment?.toLowerCase().includes(term);
        const matchReceiver = item.receiverName?.toLowerCase().includes(term);
        const matchSender = item.senderName?.toLowerCase().includes(term);

        if (!matchName && !matchSerial && !matchKyHieu && !matchMfg && !matchDept && !matchReceiver && !matchSender) {
          return false;
        }
      }

      // Lọc theo Mốc Thời Gian
      if (timeFilterType !== 'all') {
        const dateStr = item.lastTransferDate || item.purchaseDate;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;

        if (timeFilterType === 'day') {
          const target = new Date(selectedDate);
          if (
            d.getFullYear() !== target.getFullYear() ||
            d.getMonth() !== target.getMonth() ||
            d.getDate() !== target.getDate()
          ) {
            return false;
          }
        } else if (timeFilterType === 'month') {
          if (d.getFullYear() !== selectedYear || d.getMonth() + 1 !== Number(selectedMonth)) {
            return false;
          }
        } else if (timeFilterType === 'quarter') {
          const itemQuarter = Math.floor(d.getMonth() / 3) + 1;
          if (d.getFullYear() !== selectedYear || itemQuarter !== Number(selectedQuarter)) {
            return false;
          }
        } else if (timeFilterType === 'year') {
          if (d.getFullYear() !== Number(selectedYear)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [assets, searchTerm, timeFilterType, selectedDate, selectedMonth, selectedQuarter, selectedYear]);

  // 2. Thống kê nhanh tổng quan (chuẩn mực 4 thẻ số liệu)
  const stats = useMemo(() => {
    const total = timeFilteredAssets.length;
    const inWarehouse = timeFilteredAssets.filter(a => !a.currentDepartment || a.currentDepartment.includes('Còn ở kho') || a.status === 1).length;
    const handedOver = total - inWarehouse;
    
    // Đếm số khoa phòng độc lập đang có thiết bị
    const uniqueDepts = new Set<string>();
    timeFilteredAssets.forEach(a => {
      if (a.currentDepartment && !a.currentDepartment.includes('Còn ở kho') && a.status !== 1) {
        uniqueDepts.add(a.currentDepartment);
      }
    });

    return {
      total,
      handedOver,
      inWarehouse,
      activeDeptsCount: uniqueDepts.size
    };
  }, [timeFilteredAssets]);

  // 3. Danh sách tóm tắt các khoa phòng đang tiếp nhận thiết bị (kèm số lượng)
  const handedOverDepartmentsSummary = useMemo(() => {
    const map = new Map<string, number>();
    timeFilteredAssets.forEach(a => {
      const isAtWarehouse = !a.currentDepartment || a.currentDepartment.includes('Còn ở kho') || a.status === 1;
      if (!isAtWarehouse && a.currentDepartment) {
        map.set(a.currentDepartment, (map.get(a.currentDepartment) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([deptName, count]) => ({ deptName, count }));
  }, [timeFilteredAssets]);

  // 4. Lọc dữ liệu hiển thị cuối cùng theo Khoa / Kho
  const filteredData = useMemo(() => {
    return timeFilteredAssets.filter(item => {
      if (selectedDeptFilter === 'all') return true;
      if (selectedDeptFilter === 'warehouse') {
        return !item.currentDepartment || item.currentDepartment.includes('Còn ở kho') || item.status === 1;
      }
      if (selectedDeptFilter === 'handed_over') {
        const isAtWarehouse = !item.currentDepartment || item.currentDepartment.includes('Còn ở kho') || item.status === 1;
        return !isAtWarehouse;
      }
      return item.currentDepartment?.toLowerCase() === selectedDeptFilter.toLowerCase() ||
             (item.currentDepartment && item.currentDepartment.includes(selectedDeptFilter));
    });
  }, [timeFilteredAssets, selectedDeptFilter]);

  // Tự động điều chỉnh về trang 1 khi thay đổi bộ lọc hoặc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [timeFilterType, selectedDate, selectedMonth, selectedQuarter, selectedYear, selectedDeptFilter, searchTerm]);

  // Dữ liệu bảng chi tiết theo phân trang
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Toggle thu gọn/mở rộng nhóm
  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [name]: prev[name] === undefined ? true : !prev[name]
    }));
  };

  // 5. Gom nhóm theo từng Khoa phòng & Kho
  const groupedByDepartment = useMemo(() => {
    const map = new Map<string, AssetRecord[]>();

    filteredData.forEach(item => {
      let groupName = item.currentDepartment;
      if (!groupName || item.status === 1 || groupName.includes('Còn ở kho')) {
        groupName = 'Kho Trang bị (Còn ở kho)';
      }
      if (!map.has(groupName)) {
        map.set(groupName, []);
      }
      map.get(groupName)!.push(item);
    });

    const groups: { name: string; isWarehouse: boolean; items: AssetRecord[] }[] = [];
    map.forEach((items, name) => {
      groups.push({
        name,
        isWarehouse: name.includes('Còn ở kho'),
        items
      });
    });

    // Sắp xếp: Kho ở dưới cùng hoặc trên cùng, các khoa sắp chữ cái
    return groups.sort((a, b) => {
      if (a.isWarehouse) return 1;
      if (b.isWarehouse) return -1;
      return a.name.localeCompare(b.name, 'vi');
    });
  }, [filteredData]);

  // Xử lý khi người dùng nhấp vào từng thẻ thống kê trên khoanh đỏ
  const handleStatCardClick = (cardType: 'all' | 'handed_over' | 'warehouse' | 'active_depts') => {
    if (cardType === 'all') {
      setSelectedDeptFilter('all');
    } else if (cardType === 'handed_over') {
      setSelectedDeptFilter('handed_over');
      // Nếu đang xem gom nhóm mà chưa có khoa nào mở, mở rộng tất cả
      if (viewMode === 'grouped') {
        const allOpen: Record<string, boolean> = {};
        groupedByDepartment.forEach(g => allOpen[g.name] = true);
        setExpandedGroups(allOpen);
      }
    } else if (cardType === 'warehouse') {
      setSelectedDeptFilter('warehouse');
    } else if (cardType === 'active_depts') {
      // Chuyển sang chế độ xem gom nhóm theo khoa và mở rộng tất cả các khoa nhận
      setSelectedDeptFilter('handed_over');
      setViewMode('grouped');
      const allOpen: Record<string, boolean> = {};
      groupedByDepartment.forEach(g => allOpen[g.name] = true);
      setExpandedGroups(allOpen);
    }

    // Cuộn mượt màn hình tới bảng danh sách chi tiết / khoa phòng
    setTimeout(() => {
      reportContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Chọn nhanh xem riêng một khoa phòng cụ thể
  const handleSelectSpecificDept = (deptName: string) => {
    setSelectedDeptFilter(deptName);
    setTimeout(() => {
      reportContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Xuất file Excel đầy đủ 100% dữ liệu
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      alert("Không có dữ liệu để xuất Excel theo bộ lọc hiện tại!");
      return;
    }

    const exportRows = filteredData.map((item, idx) => {
      let deptDisplay = item.currentDepartment;
      if (!deptDisplay || item.status === 1 || deptDisplay.includes('Còn ở kho')) {
        deptDisplay = 'Kho Trang bị (Còn ở kho)';
      }

      let statusText = 'Đang sử dụng';
      if (item.status === 1) statusText = 'Rảnh / Trong kho';
      else if (item.status === 3) statusText = 'Đang bảo trì / Sửa chữa';
      else if (item.status === 4) statusText = 'Hỏng / Chờ xử lý';

      return {
        'STT': idx + 1,
        'Mã máy (Serial)': item.serial || '',
        'Mã QR Định danh': item.assetTag || '',
        'Tên Thiết Bị (Tài Sản)': item.name || '',
        'Ký Hiệu / Model': item.kyHieu || '',
        'Số Lượng': item.quantity || 1,
        'Hãng Sản Xuất': item.manufacturer || '',
        'Năm Sản Xuất': item.manufactureYear || '',
        'Kho Lưu Trữ': item.category?.warehouse?.name || 'Kho Trang bị',
        'KHOA NHẬN VÀ SỬ DỤNG': deptDisplay,
        'Người Nhận': item.receiverName || '',
        'Người / Khoa Giao': item.senderName || '',
        'Ngày Bàn Giao': item.lastTransferDate ? new Date(item.lastTransferDate).toLocaleDateString('vi-VN') : '',
        'Trạng Thái Thiết Bị': statusText,
        'Ghi Chú': item.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    
    // Căn chỉnh độ rộng các cột
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 22 }, // Serial
      { wch: 20 }, // QR
      { wch: 35 }, // Tên
      { wch: 18 }, // Ký hiệu
      { wch: 10 }, // SL
      { wch: 22 }, // Hãng
      { wch: 12 }, // Năm
      { wch: 18 }, // Kho
      { wch: 35 }, // KHOA NHẬN VÀ SỬ DỤNG
      { wch: 25 }, // Người nhận
      { wch: 25 }, // Người giao
      { wch: 16 }, // Ngày
      { wch: 22 }, // Trạng thái
      { wch: 30 }, // Ghi chú
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ThongKe_BanGiao_KhoaPhong");

    const timeStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    XLSX.writeFile(workbook, `BaoCao_ThongKe_ThietBi_KhoaPhong_${timeStamp}.xlsx`);
  };

  // In báo cáo
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. THANH CHUYỂN TAB SQUIRCLE PILL */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#0c142c]/90 border border-blue-500/20 shadow-xl backdrop-blur-md w-fit">
        <button
          type="button"
          onClick={() => handleSwitchTab('departments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeReportTab === 'departments'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Theo Khoa Phòng (Bàn Giao Thực Tế)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeReportTab === 'tasks'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Theo Công Việc (Đầu Mối & Tiến Độ)</span>
        </button>
      </div>

      {activeReportTab === 'tasks' ? (
        <WorkTasksReportTab />
      ) : activeReportTab === 'usage_frequency' ? (
        <UsageFrequencyTab />
      ) : (
        <>
          {/* 2. MODULE HEADER BANNER SQUIRCLE GRADIENT */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c142c] via-[#0f1b3d] to-[#0c142c] border border-blue-500/20 p-6 lg:p-7 shadow-2xl shadow-blue-950/40 backdrop-blur-xl">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Cột trái: Icon Squircle + Tiêu đề */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 ring-1 ring-white/20 shrink-0">
                  <ClipboardList className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Bàn giao thực tế 36 khoa phòng
                    </span>
                    <span className="text-slate-400 text-xs">• Bệnh viện Quân y 87</span>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                    Báo Cáo & Thống Kê Thiết Bị
                  </h1>
                  <p className="text-slate-400 text-xs lg:text-sm mt-0.5">
                    Theo dõi chính xác khoa nào đang tiếp nhận sử dụng thiết bị sau bàn giao và thiết bị nào còn lưu tại kho
                  </p>
                </div>
              </div>

              {/* Cột phải: Các nút hành động Squircle Pill */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  title="Làm mới dữ liệu"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>Làm mới</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Xuất toàn bộ 100% dữ liệu gốc ra file Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất Excel Đầy Đủ</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>In Báo Cáo</span>
                </button>
              </div>
            </div>
          </div>

      {/* 3. CỤM 4 THẺ SỐ LIỆU TỔNG HỢP SQUIRCLE GRADIENT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Tổng thiết bị */}
        <div 
          onClick={() => handleStatCardClick('all')}
          className={`p-4 rounded-2xl border shadow-xl flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
            selectedDeptFilter === 'all'
              ? 'bg-[#0c142c] border-2 border-cyan-400/80 shadow-cyan-500/20 scale-[1.02]'
              : 'bg-[#0c142c]/90 border-blue-500/20 hover:border-cyan-500/40 hover:scale-[1.01]'
          }`}
          title="Nhấp để xem toàn bộ 100% thiết bị trong hệ thống"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Thiết Bị</p>
                {selectedDeptFilter === 'all' && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" title="Đang xem tất cả"></span>
                )}
              </div>
              <h3 className="text-2xl font-black text-white mt-1">{stats.total}</h3>
              <p className="text-[11px] text-cyan-400 mt-0.5 flex items-center gap-1">
                <span>Tất cả tài sản quản lý</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStatCardClick('all');
              }}
              className="w-full py-1.5 px-2.5 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>📋 Xem Tất Cả ({stats.total} thiết bị)</span>
            </button>
          </div>
        </div>

        {/* Thẻ 2: Khoa Nhận & Sử Dụng */}
        <div 
          onClick={() => handleStatCardClick('handed_over')}
          className={`p-4 rounded-2xl border shadow-xl flex flex-col justify-between cursor-pointer transition-all duration-200 select-none relative ${
            selectedDeptFilter === 'handed_over' || (selectedDeptFilter !== 'all' && selectedDeptFilter !== 'warehouse' && viewMode !== 'grouped')
              ? 'bg-[#0c142c] border-2 border-emerald-400/80 shadow-emerald-500/20 scale-[1.02]'
              : 'bg-[#0c142c]/90 border-blue-500/20 hover:border-emerald-500/40 hover:scale-[1.01]'
          }`}
          title="Nhấp để lọc danh sách thiết bị bàn giao theo khoa nhận"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khoa Nhận & Sử Dụng</p>
                {(selectedDeptFilter === 'handed_over' || (selectedDeptFilter !== 'all' && selectedDeptFilter !== 'warehouse')) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Đang lọc"></span>
                )}
              </div>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">
                {selectedDeptFilter !== 'all' && selectedDeptFilter !== 'warehouse' && selectedDeptFilter !== 'handed_over'
                  ? `${filteredData.length}`
                  : stats.handedOver}
              </h3>
              <p className="text-[11px] text-emerald-400 mt-0.5 font-medium flex items-center gap-1">
                <span className="truncate max-w-[130px]" title={selectedDeptFilter !== 'all' && selectedDeptFilter !== 'warehouse' && selectedDeptFilter !== 'handed_over' ? selectedDeptFilter : 'Đã xuất kho bàn giao'}>
                  {selectedDeptFilter !== 'all' && selectedDeptFilter !== 'warehouse' && selectedDeptFilter !== 'handed_over'
                    ? `Khoa: ${selectedDeptFilter}`
                    : 'Đã xuất kho bàn giao'}
                </span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/30 shrink-0">
              <PackageCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Bộ lọc khoa phòng trực tiếp trên Thẻ 2 */}
          <div className="mt-3 pt-2.5 border-t border-slate-800" onClick={e => e.stopPropagation()}>
            <select
              value={selectedDeptFilter === 'all' || selectedDeptFilter === 'warehouse' ? '' : selectedDeptFilter}
              onChange={(e) => {
                const val = e.target.value;
                if (!val || val === 'handed_over') {
                  handleStatCardClick('handed_over');
                } else {
                  handleSelectSpecificDept(val);
                }
              }}
              className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm transition-all"
            >
              <option value="handed_over">Tất cả ({stats.handedOver} máy)</option>
              <optgroup label="🏢 Khoa đang tiếp nhận máy" className="bg-slate-900 text-white">
                {handedOverDepartmentsSummary.map(d => (
                  <option key={d.deptName} value={d.deptName}>
                    🏢 {d.deptName} ({d.count} máy)
                  </option>
                ))}
              </optgroup>
              <optgroup label="🏢 Danh mục tất cả khoa phòng" className="bg-slate-900 text-white">
                {departments.filter(dep => !handedOverDepartmentsSummary.some(h => h.deptName === dep.name)).map(dep => (
                  <option key={dep.id} value={dep.name}>
                    🏢 {dep.name} (0 máy)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Thẻ 3: Còn ở kho */}
        <div 
          onClick={() => handleStatCardClick('warehouse')}
          className={`p-4 rounded-2xl border shadow-xl flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
            selectedDeptFilter === 'warehouse'
              ? 'bg-[#0c142c] border-2 border-amber-400/80 shadow-amber-500/20 scale-[1.02]'
              : 'bg-[#0c142c]/90 border-blue-500/20 hover:border-amber-500/40 hover:scale-[1.01]'
          }`}
          title="Nhấp để link tới danh sách thiết bị còn tồn tại Kho Trang bị"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thiết Bị Còn Ở Kho</p>
                {selectedDeptFilter === 'warehouse' && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Đang chọn"></span>
                )}
              </div>
              <h3 className="text-2xl font-black text-amber-400 mt-1">{stats.inWarehouse}</h3>
              <p className="text-[11px] text-amber-400 mt-0.5 font-medium flex items-center gap-1">
                <span>Sẵn sàng điều phối</span>
                <ExternalLink className="w-3 h-3" />
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/30 shrink-0">
              <Warehouse className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStatCardClick('warehouse');
              }}
              className="w-full py-1.5 px-2.5 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🏢 Kho Trang Bị ({stats.inWarehouse} máy)</span>
            </button>
          </div>
        </div>

        {/* Thẻ 4: Số khoa đang sử dụng */}
        <div 
          onClick={() => handleStatCardClick('active_depts')}
          className={`p-4 rounded-2xl border shadow-xl flex flex-col justify-between cursor-pointer transition-all duration-200 select-none relative ${
            (selectedDeptFilter === 'handed_over' && viewMode === 'grouped') || (selectedDeptFilter !== 'all' && selectedDeptFilter !== 'warehouse' && viewMode === 'grouped')
              ? 'bg-[#0c142c] border-2 border-purple-400/80 shadow-purple-500/20 scale-[1.02]'
              : 'bg-[#0c142c]/90 border-blue-500/20 hover:border-purple-500/40 hover:scale-[1.01]'
          }`}
          title="Nhấp để xem danh sách gom nhóm theo từng khoa phòng tiếp nhận"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khoa Phòng Tiếp Nhận</p>
                {((selectedDeptFilter === 'handed_over' && viewMode === 'grouped') || (selectedDeptFilter !== 'all' && selectedDeptFilter !== 'warehouse')) && (
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" title="Đang chọn"></span>
                )}
              </div>
              <h3 className="text-2xl font-black text-purple-400 mt-1">{stats.activeDeptsCount}</h3>
              <p className="text-[11px] text-purple-400 mt-0.5 font-medium flex items-center gap-1">
                <span>Đơn vị đang sử dụng</span>
                <ExternalLink className="w-3 h-3" />
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/30 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          {/* Bộ lọc khoa phòng trực tiếp trên Thẻ 4 */}
          <div className="mt-3 pt-2.5 border-t border-slate-800" onClick={e => e.stopPropagation()}>
            <select
              value={selectedDeptFilter === 'all' || selectedDeptFilter === 'warehouse' ? '' : selectedDeptFilter}
              onChange={(e) => {
                const val = e.target.value;
                if (!val || val === 'handed_over') {
                  handleStatCardClick('active_depts');
                } else {
                  setSelectedDeptFilter(val);
                  setViewMode('grouped');
                  setExpandedGroups({ [val]: true });
                  setTimeout(() => {
                    reportContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }
              }}
              className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-purple-300 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm transition-all"
            >
              <option value="handed_over">Tất cả ({stats.activeDeptsCount} đơn vị tiếp nhận)</option>
              <optgroup label="🏢 Khoa đang tiếp nhận máy" className="bg-slate-900 text-white">
                {handedOverDepartmentsSummary.map(d => (
                  <option key={d.deptName} value={d.deptName}>
                    🏢 {d.deptName} ({d.count} máy)
                  </option>
                ))}
              </optgroup>
              <optgroup label="🏢 Danh mục tất cả khoa phòng" className="bg-slate-900 text-white">
                {departments.filter(dep => !handedOverDepartmentsSummary.some(h => h.deptName === dep.name)).map(dep => (
                  <option key={dep.id} value={dep.name}>
                    🏢 {dep.name} (0 máy)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Thanh Điều Hướng Nhanh Tới Các Khoa Được Giao Nhận (Quick Jump Chips) */}
      {handedOverDepartmentsSummary.length > 0 && (
        <div className="p-3 rounded-2xl bg-white dark:bg-[#182232] border border-gray-200 dark:border-slate-800/80 shadow-xs flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-300 shrink-0 mr-1">
            <Building className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Khoa được giao nhận:</span>
          </div>

          <button
            type="button"
            onClick={() => handleStatCardClick('handed_over')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedDeptFilter === 'handed_over'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/50'
            }`}
          >
            <span>Tất cả các khoa ({stats.handedOver} TB)</span>
          </button>

          {handedOverDepartmentsSummary.map(({ deptName, count }) => {
            const isSelected = selectedDeptFilter === deptName;
            return (
              <button
                key={deptName}
                type="button"
                onClick={() => handleSelectSpecificDept(deptName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-slate-700/60 text-gray-700 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 border border-transparent hover:border-blue-200 dark:hover:border-blue-800'
                }`}
                title={`Nhấp để lọc và xem riêng thiết bị tại ${deptName}`}
              >
                <span>🏢 {deptName}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Khối Bộ Lọc Nâng Cao (Thời Gian, Khoa Phòng & Chế Độ Xem) */}
      <div className="bg-white dark:bg-[#182232] p-5 rounded-2xl border border-gray-200 dark:border-slate-800/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-gray-100 dark:border-slate-700/60">
          
          {/* Bộ lọc thời gian: Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> Thời gian:
            </span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'day', label: 'Theo Ngày' },
              { id: 'month', label: 'Theo Tháng' },
              { id: 'quarter', label: 'Theo Quý' },
              { id: 'year', label: 'Theo Năm' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTimeFilterType(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  timeFilterType === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-slate-700/60 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Công tắc chế độ xem: Bảng vs Gom nhóm theo khoa */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700/60 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bảng Chi Tiết</span>
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'grouped'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Gom Nhóm Theo Khoa</span>
            </button>
          </div>
        </div>

        {/* Hàng điều khiển chi tiết: Lựa chọn ngày/tháng/quý/năm + Lọc khoa + Ô tìm kiếm */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Cột 1: Điều khiển thời gian chi tiết */}
          <div className="md:col-span-4">
            {timeFilterType === 'day' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            {timeFilterType === 'month' && (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                >
                  {[2023, 2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
            )}

            {timeFilterType === 'quarter' && (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedQuarter}
                  onChange={e => setSelectedQuarter(Number(e.target.value))}
                  className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                >
                  <option value={1}>Quý 1 (Tháng 1 - 3)</option>
                  <option value={2}>Quý 2 (Tháng 4 - 6)</option>
                  <option value={3}>Quý 3 (Tháng 7 - 9)</option>
                  <option value={4}>Quý 4 (Tháng 10 - 12)</option>
                </select>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                >
                  {[2023, 2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
            )}

            {timeFilterType === 'year' && (
              <div>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                >
                  {[2023, 2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
            )}

            {timeFilterType === 'all' && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700/30 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Thống kê toàn bộ mốc thời gian hệ thống</span>
              </div>
            )}
          </div>

          {/* Cột 2: Chọn lọc theo Khoa / Kho */}
          <div className="md:col-span-4">
            <select
              value={selectedDeptFilter}
              onChange={e => setSelectedDeptFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">-- Tất cả đơn vị & Kho ({assets.length} thiết bị) --</option>
              <option value="handed_over">🏥 Tất cả các khoa nhận bàn giao ({stats.handedOver} thiết bị)</option>
              <option value="warehouse">🏢 Kho Trang bị (Còn ở kho: {stats.inWarehouse} thiết bị)</option>
              <optgroup label="🏢 Từng khoa phòng cụ thể">
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Cột 3: Tìm kiếm từ khóa */}
          <div className="md:col-span-4 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm tên, serial, ký hiệu, người nhận..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

        </div>
      </div>

      {/* NỘI DUNG BÁO CÁO (Được scroll tới khi bấm vào các thẻ thống kê) */}
      <div ref={reportContentRef} className="scroll-mt-6">
      {loading ? (
        <div className="bg-white dark:bg-[#182232] p-12 rounded-2xl border border-gray-200 dark:border-slate-800 text-center text-gray-500 dark:text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-sm font-semibold">Đang tổng hợp báo cáo và thống kê dữ liệu...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white dark:bg-[#182232] p-12 rounded-2xl border border-gray-200 dark:border-slate-800 text-center text-gray-500 dark:text-slate-400 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-gray-900 dark:text-white">
            {selectedDeptFilter !== 'all' && selectedDeptFilter !== 'warehouse' && selectedDeptFilter !== 'handed_over' 
              ? `${selectedDeptFilter} hiện chưa tiếp nhận thiết bị nào`
              : 'Không tìm thấy thiết bị nào'}
          </p>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {selectedDeptFilter !== 'all' && selectedDeptFilter !== 'warehouse' && selectedDeptFilter !== 'handed_over' 
              ? 'Khoa phòng này chưa có máy nào được bàn giao hoặc đưa vào sử dụng trong mốc thời gian đã chọn.'
              : 'Hãy thử thay đổi mốc thời gian hoặc bộ lọc khoa phòng ở trên.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleStatCardClick('handed_over')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Xem các khoa đang có máy ({stats.handedOver} máy)
            </button>
            <button
              type="button"
              onClick={() => handleStatCardClick('all')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Xem tất cả ({stats.total} thiết bị)
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* CHẾ ĐỘ 1: BẢNG DANH SÁCH CHI TIẾT */
        <div className="bg-white dark:bg-[#182232] rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-700 dark:text-slate-300">
                Danh Sách Chi Tiết ({filteredData.length} thiết bị)
              </span>
              {selectedDeptFilter !== 'all' && selectedDeptFilter !== 'warehouse' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <span>🏢 {selectedDeptFilter === 'handed_over' ? 'Tất cả khoa nhận' : selectedDeptFilter}</span>
                  <button 
                    type="button" 
                    onClick={() => handleStatCardClick('all')} 
                    className="hover:text-red-500 font-bold ml-1"
                    title="Bỏ lọc khoa"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
              * Dữ liệu xuất Excel luôn bảo toàn 100% độ dài ký tự
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50/80 dark:bg-slate-700/40 border-b border-gray-100 dark:border-slate-700 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Mã máy (Serial)</th>
                  <th className="py-3 px-4">Tên Thiết Bị (Tài Sản)</th>
                  <th className="py-3 px-4">Ký Hiệu / Model</th>
                  <th className="py-3 px-4 text-center">SL</th>
                  <th className="py-3 px-4">Hãng SX</th>
                  <th className="py-3 px-4">Kho Lưu Trữ</th>
                  {/* CỘT ĐẶC THÙ THEO YÊU CẦU */}
                  <th className="py-3 px-4 bg-blue-50/70 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-black">
                    KHOA NHẬN VÀ SỬ DỤNG
                  </th>
                  <th className="py-3 px-4">Người Nhận</th>
                  <th className="py-3 px-4">Ngày Bàn Giao</th>
                  <th className="py-3 px-4">Người / Khoa Giao</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                {paginatedData.map((item, idx) => {
                  const isWarehouse = !item.currentDepartment || 
                    item.currentDepartment.includes('Còn ở kho') || 
                    item.status === 1;
                  const stt = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-medium text-gray-500 dark:text-slate-400">
                        {stt}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-gray-900 dark:text-white">
                        {item.serial || item.assetTag || '-'}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white max-w-xs truncate" title={item.name}>
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                        {item.kyHieu || '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-gray-700 dark:text-slate-200">
                        {item.quantity || 1}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                        {item.manufacturer || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-slate-400">
                        {item.category?.warehouse?.name || 'Kho Trang bị'}
                      </td>

                      {/* Cột Khoa nhận và sử dụng */}
                      <td className="py-3 px-4 bg-blue-50/30 dark:bg-blue-900/10">
                        {isWarehouse ? (
                          <button
                            type="button"
                            onClick={() => handleStatCardClick('warehouse')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 cursor-pointer transition-colors"
                            title="Nhấp để lọc toàn bộ thiết bị còn ở kho"
                          >
                            <Warehouse className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Kho Trang bị (Còn ở kho)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectSpecificDept(item.currentDepartment || '')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-700/50 cursor-pointer transition-colors"
                            title={`Nhấp để lọc và xem toàn bộ thiết bị tại ${item.currentDepartment}`}
                          >
                            <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>{item.currentDepartment}</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 text-gray-700 dark:text-slate-300">
                        {item.receiverName || (isWarehouse ? '-' : 'Đại diện khoa')}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-slate-400 font-mono">
                        {item.lastTransferDate ? new Date(item.lastTransferDate).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-slate-400">
                        {item.senderName || '-'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {item.status === 1 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            Rảnh / Trong kho
                          </span>
                        ) : item.status === 2 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            Đang sử dụng
                          </span>
                        ) : item.status === 3 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            Đang bảo trì
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
                            Cảnh báo hỏng
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination - Thanh điều hướng trang chuẩn như Tài sản & Thiết bị */}
          {filteredData.length > 0 && (
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/60">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredData.length}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>
      ) : (
        /* CHẾ ĐỘ 2: BÁO CÁO TỔNG HỢP GOM NHÓM THEO TỪNG KHOA */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 dark:text-slate-200">
              Tổng Hợp Thiết Bị Theo Từng Đơn Vị ({groupedByDepartment.length} đơn vị)
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const allOpen: Record<string, boolean> = {};
                  groupedByDepartment.forEach(g => allOpen[g.name] = true);
                  setExpandedGroups(allOpen);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Mở rộng tất cả
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setExpandedGroups({})}
                className="text-xs text-gray-500 hover:underline font-semibold"
              >
                Thu gọn tất cả
              </button>
            </div>
          </div>

          {groupedByDepartment.map(group => {
            const isExpanded = expandedGroups[group.name] ?? true;

            return (
              <div 
                key={group.name}
                className="bg-white dark:bg-[#182232] rounded-2xl border border-gray-200 dark:border-slate-800/80 shadow-xs overflow-hidden transition-all"
              >
                {/* Header nhóm Khoa */}
                <div 
                  onClick={() => toggleGroup(group.name)}
                  className={`p-4 flex items-center justify-between cursor-pointer select-none transition-colors ${
                    group.isWarehouse 
                      ? 'bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-900/10 dark:hover:bg-amber-900/20' 
                      : 'bg-blue-50/40 hover:bg-blue-50/70 dark:bg-blue-900/10 dark:hover:bg-blue-900/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      group.isWarehouse 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' 
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}>
                      {group.isWarehouse ? <Warehouse className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {group.name}
                        {group.isWarehouse && (
                          <span className="text-[11px] font-normal text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-md">
                            Chưa bàn giao
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        Tổng cộng: <strong className="text-gray-900 dark:text-white font-bold">{group.items.length}</strong> thiết bị đang quản lý
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 shadow-xs">
                      {group.items.length} thiết bị
                    </span>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {/* Bảng con danh sách thiết bị thuộc khoa */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-slate-700/60 overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-gray-50/50 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-700/60 text-[11px] font-bold text-gray-500 dark:text-slate-400">
                        <tr>
                          <th className="py-2.5 px-4 w-12 text-center">STT</th>
                          <th className="py-2.5 px-4">Mã máy (Serial)</th>
                          <th className="py-2.5 px-4">Tên Thiết Bị</th>
                          <th className="py-2.5 px-4">Ký Hiệu</th>
                          <th className="py-2.5 px-4">Hãng SX</th>
                          <th className="py-2.5 px-4">Ngày Nhận Bàn Giao</th>
                          <th className="py-2.5 px-4">Người Nhận Đại Diện</th>
                          <th className="py-2.5 px-4 text-center">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800/40">
                        {group.items.map((it, idx) => (
                          <tr key={it.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-4 text-center text-gray-400">{idx + 1}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-gray-900 dark:text-white">{it.serial || it.assetTag}</td>
                            <td className="py-2.5 px-4 font-bold text-gray-800 dark:text-slate-200">{it.name}</td>
                            <td className="py-2.5 px-4 text-gray-600 dark:text-slate-300">{it.kyHieu || '-'}</td>
                            <td className="py-2.5 px-4 text-gray-600 dark:text-slate-300">{it.manufacturer || '-'}</td>
                            <td className="py-2.5 px-4 text-gray-600 dark:text-slate-400 font-mono">
                              {it.lastTransferDate ? new Date(it.lastTransferDate).toLocaleDateString('vi-VN') : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-gray-700 dark:text-slate-300 font-medium">
                              {it.receiverName || (group.isWarehouse ? '-' : 'Đại diện khoa')}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {it.status === 1 ? (
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Rảnh</span>
                              ) : it.status === 2 ? (
                                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Đang sử dụng</span>
                              ) : it.status === 3 ? (
                                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Bảo trì</span>
                              ) : (
                                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Hỏng</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
      </>
      )}
    </div>
  );
};

export default ReportsPage;
