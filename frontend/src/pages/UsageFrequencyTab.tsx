import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileSpreadsheet, 
  Search, 
  Calendar, 
  Building2, 
  RefreshCw, 
  PlusCircle, 
  Activity, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  X, 
  Edit3,
  Filter,
  Lock
} from 'lucide-react';
import api from '../api/axios';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import { Pagination } from '../components/Pagination';

const LOCAL_DEP_KEY = 'ASSET_MANAGEMENT_DEPARTMENTS_CACHE';

export interface DateHeader {
  dateStr: string;
  day: number;
  month: number;
  year: number;
  label: string;
}

export interface MatrixRow {
  assetId: number;
  name: string;
  serial: string;
  assetTag?: string;
  kyHieu?: string;
  manufacturer?: string;
  departmentName: string;
  status: number;
  dailyUsages: Record<number, number>;
  dailyUsagesByDate?: Record<string, number>;
  totalMonthUsage: number;
  activeDays: number;
  averagePerDay: number;
}

interface MonthlyReportResponse {
  filterType?: string;
  fromDate?: string;
  toDate?: string;
  year: number;
  month: number;
  daysInMonth: number;
  dateHeaders?: DateHeader[];
  totalUsageAll: number;
  activeAssetsCount: number;
  totalAssets: number;
  rows: MatrixRow[];
}

export const UsageFrequencyTab: React.FC = () => {
  const currentDate = new Date();
  const todayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const firstDayOfMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;

  // Kiểm tra quyền Admin để mở khóa sửa ngày quá khứ
  const { isAdmin } = useAuth();
  const userIsAdmin = isAdmin ? isAdmin() : false;

  // Chế độ lọc: 'month' (Theo tháng) hoặc 'custom_range' (Từ ngày ... đến ngày ...)
  const [filterMode, setFilterMode] = useState<'month' | 'custom_range'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [fromDate, setFromDate] = useState<string>(firstDayOfMonth);
  const [toDate, setToDate] = useState<string>(todayStr);

  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Bộ lọc hiển thị máy: 'active_only' (chỉ máy có lượt dùng trong giai đoạn) | 'all' (tất cả máy)
  const [usageFilter, setUsageFilter] = useState<'active_only' | 'all'>('active_only');

  // Phân trang ma trận (chuẩn theo Tài sản & Thiết bị)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const [loading, setLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<MonthlyReportResponse | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);

  // Toàn bộ thiết bị từ Quản lý Thiết bị (Assets)
  const [allAssets, setAllAssets] = useState<any[]>([]);

  // Modal Ghi nhận hàng loạt
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchDate, setBatchDate] = useState<string>(todayStr);
  const [batchDeptFilter, setBatchDeptFilter] = useState<string>('all');
  const [batchSearchTerm, setBatchSearchTerm] = useState<string>('');
  const [batchEntries, setBatchEntries] = useState<Record<number, { selected: boolean; count: number; notes: string; departmentName?: string }>>({});
  const [savingBatch, setSavingBatch] = useState<boolean>(false);

  // Danh sách máy trong modal ghi nhận & Picker chọn máy từ Quản lý Thiết bị
  const [modalAssetList, setModalAssetList] = useState<any[]>([]);
  const [showAddAssetPicker, setShowAddAssetPicker] = useState<boolean>(false);
  const [pickerSearchTerm, setPickerSearchTerm] = useState<string>('');

  // Modal Sửa nhanh 1 ô
  const [editingCell, setEditingCell] = useState<{
    assetId: number;
    assetName: string;
    serial: string;
    departmentName: string;
    day: number;
    dateStr?: string;
    count: number;
    notes: string;
  } | null>(null);
  const [savingCell, setSavingCell] = useState<boolean>(false);

  // Tải danh mục khoa phòng
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await api.get('/departments');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setDepartments(res.data);
          localStorage.setItem(LOCAL_DEP_KEY, JSON.stringify(res.data));
          return;
        }
      } catch {}
      try {
        const cached = localStorage.getItem(LOCAL_DEP_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setDepartments(parsed);
        }
      } catch {}
    };
    loadDepartments();

    // Tải toàn bộ máy từ Quản lý Thiết bị (Assets)
    const loadAllAssets = async () => {
      try {
        const res = await api.get('/assets');
        if (Array.isArray(res.data)) {
          setAllAssets(res.data);
        }
      } catch (err) {
        console.error("Lỗi tải danh mục tài sản:", err);
      }
    };
    loadAllAssets();

    window.addEventListener('departmentsChanged', loadDepartments);
    window.addEventListener('departmentsUpdated', loadDepartments);
    return () => {
      window.removeEventListener('departmentsChanged', loadDepartments);
      window.removeEventListener('departmentsUpdated', loadDepartments);
    };
  }, []);

  // Tải dữ liệu báo cáo tần suất
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        department: selectedDept
      };

      if (filterMode === 'month') {
        params.year = selectedYear;
        params.month = selectedMonth;
      } else {
        params.fromDate = fromDate;
        params.toDate = toDate;
      }

      const res = await api.get('/deviceusages/monthly', { params });
      setReportData(res.data);
    } catch (err) {
      console.error('Lỗi tải báo cáo tần suất:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedYear, selectedMonth, selectedDept, filterMode, fromDate, toDate]);

  // Danh sách các cột ngày động
  const dateHeaders = useMemo<DateHeader[]>(() => {
    if (reportData?.dateHeaders && reportData.dateHeaders.length > 0) {
      return reportData.dateHeaders;
    }
    const daysCount = reportData?.daysInMonth || 30;
    return Array.from({ length: daysCount }, (_, i) => {
      const d = i + 1;
      const dStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        dateStr: dStr,
        day: d,
        month: selectedMonth,
        year: selectedYear,
        label: `${d}`
      };
    });
  }, [reportData, selectedYear, selectedMonth]);

  // Lọc danh sách máy theo trạng thái có lượt dùng và từ khóa tìm kiếm
  const filteredRows = useMemo(() => {
    if (!reportData?.rows) return [];
    
    let rows = reportData.rows;

    // Lọc theo trạng thái có lượt sử dụng trong giai đoạn: Nếu 'active_only', chỉ hiển thị các máy có lượt dùng (> 0)
    if (usageFilter === 'active_only') {
      rows = rows.filter(r => (r.totalMonthUsage || 0) > 0);
    }

    // Lọc theo từ khóa tìm kiếm (Tên máy, Serial, Ký hiệu, Khoa)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(
        r =>
          r.name?.toLowerCase().includes(term) ||
          r.serial?.toLowerCase().includes(term) ||
          r.kyHieu?.toLowerCase().includes(term) ||
          r.departmentName?.toLowerCase().includes(term)
      );
    }

    return rows;
  }, [reportData, usageFilter, searchTerm]);

  // Tự động điều chỉnh về trang 1 khi thay đổi bộ lọc hoặc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDept, searchTerm, usageFilter, selectedYear, selectedMonth, filterMode, fromDate, toDate]);

  // Phân trang danh sách ma trận (chuẩn theo Tài sản & Thiết bị)
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Thống kê nhanh 4 thẻ
  const stats = useMemo(() => {
    const totalUsage = reportData?.totalUsageAll || 0;
    const activeAssets = reportData?.activeAssetsCount || 0;
    const totalAssets = reportData?.totalAssets || 0;
    const totalDays = dateHeaders.length > 0 ? dateHeaders.length : (reportData?.daysInMonth || 30);

    const avgUsagePerDay = totalDays > 0 ? (totalUsage / totalDays).toFixed(1) : '0';
    const activeRate = totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 0;

    // Tìm máy có tần suất cao nhất
    let topDevice = { name: 'Chưa có', count: 0, dept: '' };
    if (reportData?.rows && reportData.rows.length > 0) {
      const sorted = [...reportData.rows].sort((a, b) => b.totalMonthUsage - a.totalMonthUsage);
      if (sorted[0] && sorted[0].totalMonthUsage > 0) {
        topDevice = {
          name: sorted[0].name,
          count: sorted[0].totalMonthUsage,
          dept: sorted[0].departmentName
        };
      }
    }

    return {
      totalUsage,
      activeAssets,
      totalAssets,
      activeRate,
      avgUsagePerDay,
      totalDays,
      topDevice
    };
  }, [reportData, dateHeaders]);

  // Mở modal ghi nhận hàng loạt
  const handleOpenBatchModal = () => {
    // Tự động đồng bộ khoa phòng đang lọc ở trang chính
    const defaultDept = selectedDept && selectedDept !== 'all' ? selectedDept : (departments[0]?.name || 'all');
    setBatchDeptFilter(defaultDept);
    setShowAddAssetPicker(false);
    setPickerSearchTerm('');

    // Nạp danh sách máy vào modal:
    // Hợp nhất các máy từ reportData.rows và allAssets
    const baseList: any[] = [];
    const seenIds = new Set<number>();

    // 1. Máy từ reportData.rows
    if (reportData?.rows && reportData.rows.length > 0) {
      reportData.rows.forEach(r => {
        if (!seenIds.has(r.assetId)) {
          seenIds.add(r.assetId);
          baseList.push({
            id: r.assetId,
            name: r.name,
            serial: r.serial,
            kyHieu: r.kyHieu,
            departmentName: r.departmentName
          });
        }
      });
    }

    // 2. Máy từ allAssets
    if (allAssets.length > 0) {
      allAssets.forEach(a => {
        if (!seenIds.has(a.id)) {
          seenIds.add(a.id);
          baseList.push({
            id: a.id,
            name: a.name,
            serial: a.serial,
            kyHieu: a.kyHieu,
            departmentName: a.currentDepartment || 'Kho Trang bị (Còn ở kho)'
          });
        }
      });
    }

    setModalAssetList(baseList);

    // Khởi tạo batchEntries
    const initial: Record<number, { selected: boolean; count: number; notes: string; departmentName?: string }> = {};
    const dayNum = parseInt(batchDate.split('-')[2] || '1', 10);
    baseList.forEach(r => {
      const matchReport = reportData?.rows?.find(x => x.assetId === r.id);
      const existingCount = matchReport?.dailyUsagesByDate?.[batchDate] ?? matchReport?.dailyUsages?.[dayNum] ?? 0;
      initial[r.id] = {
        selected: existingCount > 0,
        count: existingCount > 0 ? existingCount : 1,
        notes: '',
        departmentName: r.departmentName
      };
    });
    setBatchEntries(initial);
    setShowBatchModal(true);
  };

  // Thêm một máy từ picker vào danh sách ghi nhận
  const handleAddAssetToBatch = (asset: any) => {
    // Thêm vào modalAssetList nếu chưa có
    setModalAssetList(prev => {
      if (prev.some(x => x.id === asset.id)) return prev;
      return [
        {
          id: asset.id,
          name: asset.name,
          serial: asset.serial,
          kyHieu: asset.kyHieu,
          departmentName: batchDeptFilter !== 'all' ? batchDeptFilter : (asset.currentDepartment || 'Kho Trang bị')
        },
        ...prev
      ];
    });

    // Bật selected cho máy đó
    setBatchEntries(prev => ({
      ...prev,
      [asset.id]: {
        selected: true,
        count: prev[asset.id]?.count || 1,
        notes: prev[asset.id]?.notes || '',
        departmentName: batchDeptFilter !== 'all' ? batchDeptFilter : (asset.currentDepartment || 'Kho Trang bị')
      }
    }));
  };

  // Cập nhật khi đổi ngày trong batch modal
  const handleBatchDateChange = (newDate: string) => {
    setBatchDate(newDate);
    const dayNum = parseInt(newDate.split('-')[2] || '1', 10);
    setBatchEntries(prev => {
      const updated = { ...prev };
      modalAssetList.forEach(r => {
        const matchReport = reportData?.rows?.find(x => x.assetId === r.id);
        const existingCount = matchReport?.dailyUsagesByDate?.[newDate] ?? matchReport?.dailyUsages?.[dayNum] ?? 0;
        updated[r.id] = {
          selected: existingCount > 0 ? true : (prev[r.id]?.selected || false),
          count: existingCount > 0 ? existingCount : (prev[r.id]?.count || 1),
          notes: prev[r.id]?.notes || '',
          departmentName: prev[r.id]?.departmentName || r.departmentName
        };
      });
      return updated;
    });
  };

  // Chọn / bỏ chọn tất cả trong modal ghi nhận
  const handleToggleSelectAllBatch = (select: boolean) => {
    setBatchEntries(prev => {
      const updated = { ...prev };
      modalAssetList.forEach(r => {
        if (batchDeptFilter === 'all' || r.departmentName === batchDeptFilter || (prev[r.id]?.departmentName === batchDeptFilter)) {
          updated[r.id] = {
            ...updated[r.id],
            selected: select,
            count: updated[r.id]?.count || 1,
            notes: updated[r.id]?.notes || '',
            departmentName: batchDeptFilter !== 'all' ? batchDeptFilter : (updated[r.id]?.departmentName || r.departmentName)
          };
        }
      });
      return updated;
    });
  };

  // Lưu hàng loạt lượt sử dụng
  const handleSaveBatch = async () => {
    setSavingBatch(true);
    try {
      const itemsToSave: { assetId: number; usageCount: number; departmentName: string; notes: string }[] = [];
      
      Object.entries(batchEntries).forEach(([assetIdStr, entry]) => {
        if (entry.selected && entry.count > 0) {
          const asset = modalAssetList.find(r => r.id === Number(assetIdStr)) || reportData?.rows.find(r => r.assetId === Number(assetIdStr));
          const targetDeptName = batchDeptFilter !== 'all' 
            ? batchDeptFilter 
            : (entry.departmentName || asset?.departmentName || 'Kho Trang bị');

          itemsToSave.push({
            assetId: Number(assetIdStr),
            usageCount: entry.count,
            departmentName: targetDeptName,
            notes: entry.notes || ''
          });
        }
      });

      if (itemsToSave.length === 0) {
        alert('Vui lòng chọn ít nhất 1 thiết bị và nhập số lượt sử dụng > 0!');
        setSavingBatch(false);
        return;
      }

      await api.post('/deviceusages/batch', {
        usageDate: batchDate,
        items: itemsToSave
      });

      setShowBatchModal(false);
      await fetchReport();
      alert(`Đã ghi nhận thành công lượt sử dụng cho ${itemsToSave.length} thiết bị ngày ${batchDate}!`);
    } catch (err: any) {
      console.error('Lỗi lưu lượt sử dụng hàng loạt:', err);
      alert('Có lỗi xảy ra khi lưu lượt sử dụng: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingBatch(false);
    }
  };

  // Mở modal sửa nhanh 1 ô
  const handleCellClick = (row: MatrixRow, day: number, dateStr?: string) => {
    const dStr = dateStr || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Kiểm tra quy tắc khóa sau 23h59: Chỉ Admin mới có quyền sửa ngày khác ngày hôm nay
    if (!userIsAdmin && dStr !== todayStr) {
      alert(`🔒 DỮ LIỆU ĐÃ ĐƯỢC CHỐT SỔ VÀ KHÓA!\n\nLượt sử dụng ngày ${dStr} đã tự động khóa sau 23h59 trong ngày.\nChỉ duy nhất tài khoản Quản trị viên (Admin) mới có quyền chỉnh sửa khác ngày hệ thống.`);
      return;
    }

    const currentCount = (row.dailyUsagesByDate && row.dailyUsagesByDate[dStr] !== undefined)
      ? row.dailyUsagesByDate[dStr]
      : (row.dailyUsages[day] || 0);

    setEditingCell({
      assetId: row.assetId,
      assetName: row.name,
      serial: row.serial,
      departmentName: row.departmentName,
      day,
      dateStr: dStr,
      count: currentCount,
      notes: ''
    });
  };

  // Lưu nhanh 1 ô
  const handleSaveSingleCell = async (overrideCount?: number) => {
    if (!editingCell) return;
    setSavingCell(true);
    try {
      const countToSave = overrideCount !== undefined ? overrideCount : editingCell.count;
      const targetDate = editingCell.dateStr || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(editingCell.day).padStart(2, '0')}`;
      
      await api.post('/deviceusages', {
        assetId: editingCell.assetId,
        usageDate: targetDate,
        usageCount: countToSave,
        departmentName: editingCell.departmentName,
        notes: editingCell.notes
      });

      setEditingCell(null);
      await fetchReport();
    } catch (err: any) {
      console.error('Lỗi lưu lượt dùng ô:', err);
      alert('Lỗi lưu dữ liệu: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingCell(false);
    }
  };

  // Xuất file Excel ma trận đầy đủ 100% dữ liệu
  const handleExportExcel = () => {
    if (!filteredRows || filteredRows.length === 0) {
      alert('Không có dữ liệu để xuất Excel!');
      return;
    }

    const exportData = filteredRows.map((r, idx) => {
      const rowObj: Record<string, any> = {
        'STT': idx + 1,
        'Mã máy (Serial)': r.serial || '',
        'Tên Thiết Bị': r.name || '',
        'Ký Hiệu / Model': r.kyHieu || '',
        'Khoa Phòng Sử Dụng': r.departmentName || '',
        'Hãng Sản Xuất': r.manufacturer || '',
      };

      dateHeaders.forEach(hdr => {
        const count = r.dailyUsagesByDate?.[hdr.dateStr] ?? r.dailyUsages[hdr.day] ?? 0;
        rowObj[hdr.label] = count;
      });

      rowObj['Tổng Lượt Sử Dụng'] = r.totalMonthUsage;
      rowObj['Số Ngày Vận Hành'] = r.activeDays;
      rowObj['TB Lượt/Ngày'] = r.averagePerDay;
      
      let rating = 'Chưa dùng';
      if (r.totalMonthUsage >= 50) rating = 'Rất cao';
      else if (r.totalMonthUsage >= 20) rating = 'Tích cực';
      else if (r.totalMonthUsage >= 5) rating = 'Trung bình';
      else if (r.totalMonthUsage > 0) rating = 'Thấp';
      rowObj['Đánh Giá'] = rating;

      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    const cols = [
      { wch: 6 },  // STT
      { wch: 22 }, // Serial
      { wch: 35 }, // Tên máy
      { wch: 18 }, // Ký hiệu
      { wch: 30 }, // Khoa phòng
      { wch: 20 }, // Hãng
    ];
    dateHeaders.forEach(() => {
      cols.push({ wch: 7 }); // Mỗi ngày
    });
    cols.push({ wch: 16 }); // Tổng
    cols.push({ wch: 16 }); // Ngày dùng
    cols.push({ wch: 14 }); // TB/ngày
    cols.push({ wch: 16 }); // Đánh giá
    worksheet['!cols'] = cols;

    const workbook = XLSX.utils.book_new();
    const sheetName = filterMode === 'month' 
      ? `TanSuat_Thang_${selectedMonth}_${selectedYear}`
      : `TanSuat_Tu_${fromDate}_Den_${toDate}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

    const fileName = filterMode === 'month'
      ? `BaoCao_TanSuat_SuDung_May_Thang_${selectedMonth}_${selectedYear}.xlsx`
      : `BaoCao_TanSuat_SuDung_May_Tu_${fromDate}_Den_${toDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Bộ lọc & Công cụ chính */}
      <div className="bg-white dark:bg-[#182232] p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Tiêu đề & Nút thao tác */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Thống Kê Tần Suất Vận Hành & Lượt Sử Dụng Máy
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                {filterMode === 'month' 
                  ? `Tháng ${selectedMonth}/${selectedYear}`
                  : `Từ ${fromDate} đến ${toDate} (${dateHeaders.length} ngày)`}
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {filterMode === 'month'
                ? `Ghi nhận số lượt hoạt động mỗi ngày từ ngày 1 đến ${stats.totalDays} của từng thiết bị tại các khoa phòng`
                : `Thống kê chi tiết theo từng ngày trong khoảng thời gian đã chọn (${dateHeaders.length} ngày)`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenBatchModal}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Mở bảng tích chọn và nhập số lượt máy sử dụng hôm nay"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Ghi Nhận Lượt Dùng Hôm Nay</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Xuất bảng ma trận tần suất ra Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel Tần Suất</span>
            </button>

            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Thanh chuyển chế độ thời gian & Lọc hiển thị máy */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800/80 flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Chế độ thời gian */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Thời gian:
              </span>
              <div className="inline-flex rounded-xl p-1 bg-gray-100 dark:bg-[#111827] border border-gray-200 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setFilterMode('month')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterMode === 'month'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <span>📅 Theo Tháng</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('custom_range');
                    setUsageFilter('active_only'); // Mặc định chỉ hiện máy có lượt dùng khi chọn ngày
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterMode === 'custom_range'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <span>📆 Từ Ngày ... Tới Ngày</span>
                </button>
              </div>
            </div>

            {/* Lọc máy: Chỉ máy có lượt dùng vs Tất cả máy */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600 dark:text-slate-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-500" />
                Danh sách máy:
              </span>
              <div className="inline-flex rounded-xl p-1 bg-gray-100 dark:bg-[#111827] border border-gray-200 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setUsageFilter('active_only')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    usageFilter === 'active_only'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                  title="Chỉ hiển thị các máy đã được check/ghi nhận lượt sử dụng trong khoảng thời gian đã chọn"
                >
                  <span className={`w-2 h-2 rounded-full ${usageFilter === 'active_only' ? 'bg-white animate-pulse' : 'bg-emerald-500'}`}></span>
                  <span>Chỉ máy có lượt dùng ({stats.activeAssets})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUsageFilter('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    usageFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                  title="Hiển thị tất cả 360 thiết bị kể cả các máy chưa có lượt sử dụng"
                >
                  <span>Tất cả máy ({stats.totalAssets})</span>
                </button>
              </div>
            </div>
          </div>

          {filterMode === 'custom_range' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Chọn nhanh:</span>
              <button
                type="button"
                onClick={() => {
                  setFromDate(todayStr);
                  setToDate(todayStr);
                }}
                className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-gray-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const past = new Date();
                  past.setDate(now.getDate() - 6);
                  setFromDate(past.toISOString().split('T')[0]);
                  setToDate(todayStr);
                }}
                className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-gray-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              >
                7 ngày qua
              </button>
              <button
                type="button"
                onClick={() => {
                  setFromDate(firstDayOfMonth);
                  setToDate(todayStr);
                }}
                className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-gray-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              >
                Tháng này
              </button>
            </div>
          )}
        </div>

        {/* Dòng điều khiển bộ lọc: Tháng/Năm hoặc Từ ngày/Tới ngày + Khoa phòng + Tìm kiếm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
          {filterMode === 'month' ? (
            <>
              {/* Lọc Tháng */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
                  Tháng
                </label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>

              {/* Lọc Năm */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
                  Năm
                </label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Từ Ngày */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-blue-500" />
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Tới Ngày */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-500" />
                  Tới ngày
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Lọc Khoa Phòng */}
          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-blue-500" />
              Khoa Phòng Sử Dụng
            </label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">🏢 Tất cả các đơn vị & Kho</option>
              <option value="handed_over">🏥 Tất cả thiết bị đã bàn giao các khoa</option>
              <option value="warehouse">📦 Thiết bị lưu kho / chưa bàn giao</option>
              <option disabled>──────────</option>
              {departments.map((dept: any) => (
                <option key={dept.id || dept.name} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ô Tìm kiếm máy */}
          <div className="sm:col-span-2 md:col-span-4 lg:col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
              Tìm kiếm máy
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tên máy, Serial, Model..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-gray-800 dark:text-slate-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Thẻ Thống Kê Tổng Hợp Tần Suất */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Tổng lượt */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
              Tổng Lượt Sử Dụng ({stats.totalDays} ngày)
            </p>
            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {stats.totalUsage.toLocaleString('vi-VN')} <span className="text-xs font-medium text-gray-500">lượt</span>
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
              {filterMode === 'month' 
                ? `Từ ngày 1 đến ${stats.totalDays} tháng ${selectedMonth}`
                : `Từ ${fromDate} đến ${toDate}`}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Thẻ 2: Số máy vận hành */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Thiết Bị Có Hoạt Động</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.activeAssets} <span className="text-xs font-semibold text-gray-400">/ {stats.totalAssets} máy</span>
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              Đạt tỷ lệ vận hành {stats.activeRate}%
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Thẻ 3: Tần suất trung bình */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Tần Suất Trung Bình</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats.avgUsagePerDay} <span className="text-xs font-medium text-gray-500">lượt/ngày</span>
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
              Tính trên toàn bộ {stats.totalDays} ngày
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Thẻ 4: Máy hoạt động nhiều nhất */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Máy Dùng Nhiều Nhất</p>
            <h3 className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1 truncate" title={stats.topDevice.name}>
              {stats.topDevice.name}
            </h3>
            <p className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold mt-0.5">
              {stats.topDevice.count > 0 ? `${stats.topDevice.count} lượt (${stats.topDevice.dept})` : 'Chưa có lượt dùng'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Bảng Ma Trận Tần Suất Sử Dụng */}
      <div className="bg-white dark:bg-[#182232] rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Tiêu đề bảng & ghi chú hướng dẫn */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-[#151c28]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-800 dark:text-slate-200">
              {filterMode === 'month' 
                ? `Ma Trận Lượt Sử Dụng Theo Ngày (1 – ${stats.totalDays})`
                : `Ma Trận Lượt Sử Dụng (Từ ${fromDate} Đến ${toDate} - ${dateHeaders.length} ngày)`}
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${
              usageFilter === 'active_only'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80'
                : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
            }`}>
              {usageFilter === 'active_only' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
              {filteredRows.length} máy {usageFilter === 'active_only' ? 'có lượt dùng' : 'tổng cộng'}
            </span>

            {/* Nút chuyển nhanh tại đầu bảng */}
            <div className="inline-flex rounded-lg p-0.5 bg-gray-200/70 dark:bg-[#111827] border border-gray-300/60 dark:border-slate-700/60 text-[11px] ml-1">
              <button
                type="button"
                onClick={() => setUsageFilter('active_only')}
                className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                  usageFilter === 'active_only'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-emerald-600'
                }`}
                title="Chỉ hiển thị các máy có phát sinh lượt dùng"
              >
                Chỉ máy có lượt ({stats.activeAssets})
              </button>
              <button
                type="button"
                onClick={() => setUsageFilter('all')}
                className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                  usageFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-blue-600'
                }`}
                title="Hiển thị tất cả 360 máy"
              >
                Tất cả ({stats.totalAssets})
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
              <span>Có sử dụng</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-gray-200 dark:bg-slate-700"></span>
              <span>Không dùng (0)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm border-2 border-blue-500"></span>
              <span>Hôm nay</span>
            </div>
            <span className="text-[11px] text-gray-400 italic">💡 Nhấp trực tiếp vào ô để sửa nhanh số lượt</span>
          </div>
        </div>

        {/* Vùng cuộn ngang bảng ma trận */}
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-100/90 dark:bg-[#111827] text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] font-bold border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
              <tr>
                {/* Cột cố định STT */}
                <th className="py-3 px-2 text-center sticky left-0 z-20 bg-gray-100 dark:bg-[#111827] border-r border-gray-200 dark:border-slate-800 w-12 min-w-[48px]">
                  STT
                </th>
                {/* Cột cố định Mã máy */}
                <th className="py-3 px-3 sticky left-12 z-20 bg-gray-100 dark:bg-[#111827] border-r border-gray-200 dark:border-slate-800 min-w-[140px] max-w-[160px]">
                  Mã Máy (Serial)
                </th>
                {/* Cột cố định Tên thiết bị */}
                <th className="py-3 px-3 sticky left-[188px] z-20 bg-gray-100 dark:bg-[#111827] border-r border-gray-200 dark:border-slate-800 min-w-[200px] max-w-[240px]">
                  Tên Thiết Bị
                </th>
                {/* Cột cố định Khoa phòng */}
                <th className="py-3 px-3 sticky left-[408px] z-20 bg-gray-100 dark:bg-[#111827] border-r border-gray-200 dark:border-slate-800 min-w-[160px] max-w-[200px]">
                  Khoa Phòng Sử Dụng
                </th>

                {/* Các cột Ngày động */}
                {dateHeaders.map(hdr => {
                  const isToday = hdr.dateStr === todayStr;
                  return (
                    <th
                      key={hdr.dateStr}
                      className={`py-2 px-1 text-center min-w-[36px] border-r border-gray-200 dark:border-slate-800 font-semibold ${
                        isToday ? 'bg-blue-100/80 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-black ring-1 ring-blue-400/50' : ''
                      }`}
                      title={`Ngày ${hdr.dateStr}`}
                    >
                      <span className="block">{hdr.label}</span>
                    </th>
                  );
                })}

                {/* Các cột tổng kết */}
                <th className="py-3 px-3 text-center bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-r border-gray-200 dark:border-slate-800 min-w-[80px] font-bold">
                  Tổng Lượt
                </th>
                <th className="py-3 px-3 text-center bg-gray-100 dark:bg-[#111827] border-r border-gray-200 dark:border-slate-800 min-w-[75px]">
                  Số Ngày
                </th>
                <th className="py-3 px-3 text-center bg-gray-100 dark:bg-[#111827] border-r border-gray-200 dark:border-slate-800 min-w-[75px]">
                  TB/Ngày
                </th>
                <th className="py-3 px-3 text-center bg-gray-100 dark:bg-[#111827] min-w-[100px]">
                  Đánh Giá
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80 text-gray-800 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={dateHeaders.length + 8} className="py-12 text-center text-gray-500 dark:text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Đang nạp ma trận tần suất sử dụng...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={dateHeaders.length + 8} className="py-12 text-center text-gray-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                      <Activity className="w-8 h-8 text-gray-400/60" />
                      <p className="font-semibold text-sm text-gray-800 dark:text-slate-200">
                        {usageFilter === 'active_only'
                          ? `Không có thiết bị nào được ghi nhận lượt sử dụng trong khoảng thời gian này`
                          : `Không tìm thấy thiết bị nào phù hợp với bộ lọc`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {usageFilter === 'active_only'
                          ? `Bạn có thể chọn khoảng ngày khác hoặc bấm nút bên dưới để xem toàn bộ danh mục máy`
                          : `Vui lòng thử tìm kiếm với từ khóa khác`}
                      </p>
                      {usageFilter === 'active_only' && (
                        <button
                          type="button"
                          onClick={() => setUsageFilter('all')}
                          className="mt-2 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          Hiển thị tất cả {stats.totalAssets} máy
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const stt = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={row.assetId}
                      className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* STT */}
                      <td className="py-2.5 px-2 text-center sticky left-0 z-10 bg-white group-hover:bg-blue-50/50 dark:bg-[#182232] dark:group-hover:bg-[#1e2a3c] border-r border-gray-200 dark:border-slate-800 font-medium text-gray-500 w-12 min-w-[48px]">
                        {stt}
                      </td>

                      {/* Mã máy (Serial) */}
                      <td
                        className="py-2.5 px-3 sticky left-12 z-10 bg-white group-hover:bg-blue-50/50 dark:bg-[#182232] dark:group-hover:bg-[#1e2a3c] border-r border-gray-200 dark:border-slate-800 font-mono font-semibold text-gray-900 dark:text-white truncate min-w-[140px] max-w-[160px]"
                        title={row.serial}
                      >
                        {row.serial?.length > 25 ? `${row.serial.slice(0, 25)}...` : row.serial}
                      </td>

                      {/* Tên Thiết Bị */}
                      <td
                        className="py-2.5 px-3 sticky left-[188px] z-10 bg-white group-hover:bg-blue-50/50 dark:bg-[#182232] dark:group-hover:bg-[#1e2a3c] border-r border-gray-200 dark:border-slate-800 font-medium text-gray-900 dark:text-white truncate min-w-[200px] max-w-[240px]"
                        title={row.name}
                      >
                        {row.name?.length > 25 ? `${row.name.slice(0, 25)}...` : row.name}
                      </td>

                      {/* Khoa Phòng */}
                      <td
                        className="py-2.5 px-3 sticky left-[408px] z-10 bg-white group-hover:bg-blue-50/50 dark:bg-[#182232] dark:group-hover:bg-[#1e2a3c] border-r border-gray-200 dark:border-slate-800 truncate min-w-[160px] max-w-[200px]"
                        title={row.departmentName}
                      >
                        <span className={`inline-flex items-center gap-1 font-medium ${
                          row.departmentName.includes('Còn ở kho') || row.status === 1
                            ? 'text-gray-500 dark:text-slate-400'
                            : 'text-blue-700 dark:text-blue-300'
                        }`}>
                          <Building2 className="w-3 h-3 shrink-0" />
                          {row.departmentName?.length > 25 ? `${row.departmentName.slice(0, 25)}...` : row.departmentName}
                        </span>
                      </td>

                      {/* Các ô Ngày động */}
                      {dateHeaders.map(hdr => {
                        const count = row.dailyUsagesByDate?.[hdr.dateStr] ?? row.dailyUsages[hdr.day] ?? 0;
                        const isToday = hdr.dateStr === todayStr;
                        const isEditable = userIsAdmin || isToday;

                        return (
                          <td
                            key={hdr.dateStr}
                            onClick={() => handleCellClick(row, hdr.day, hdr.dateStr)}
                            className={`py-1.5 px-0.5 text-center border-r border-gray-100 dark:border-slate-800/80 select-none transition-colors ${
                              isEditable
                                ? 'cursor-pointer hover:bg-blue-100/70 dark:hover:bg-blue-900/50'
                                : 'cursor-not-allowed hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
                            } ${
                              isToday ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                            }`}
                            title={
                              isEditable
                                ? (isToday ? `Bấm để sửa: ${row.name} - Hôm nay (${count} lượt)` : `🔑 Quyền Admin: Bấm để sửa ngày ${hdr.dateStr} (${count} lượt)`)
                                : `🔒 ĐÃ KHÓA SAU 23h59: Ngày ${hdr.dateStr} (${count} lượt) - Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa`
                            }
                          >
                            {count > 0 ? (
                              <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-1 rounded-md text-[11px] font-bold border shadow-2xs ${
                                isEditable
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40'
                              }`}>
                                {count}
                              </span>
                            ) : (
                              <span className="text-gray-300 dark:text-slate-600 text-[10px] font-medium">
                                -
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Tổng Lượt Sử Dụng */}
                      <td className="py-2.5 px-3 text-center bg-blue-50/30 dark:bg-blue-950/20 border-r border-gray-200 dark:border-slate-800 font-bold text-blue-700 dark:text-blue-400">
                        {row.totalMonthUsage}
                      </td>

                      {/* Số Ngày Vận Hành */}
                      <td className="py-2.5 px-3 text-center border-r border-gray-200 dark:border-slate-800 font-semibold text-gray-700 dark:text-slate-300">
                        {row.activeDays} <span className="text-[10px] text-gray-400 font-normal">ngày</span>
                      </td>

                      {/* TB Lượt/Ngày */}
                      <td className="py-2.5 px-3 text-center border-r border-gray-200 dark:border-slate-800 font-semibold text-gray-700 dark:text-slate-300">
                        {row.averagePerDay}
                      </td>

                      {/* Đánh Giá Hiệu Suất */}
                      <td className="py-2.5 px-3 text-center">
                        {row.totalMonthUsage >= 50 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            🔥 Rất cao
                          </span>
                        ) : row.totalMonthUsage >= 20 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            ⭐ Tích cực
                          </span>
                        ) : row.totalMonthUsage >= 5 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            ✔ Trung bình
                          </span>
                        ) : row.totalMonthUsage > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            Thấp
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                            Chưa dùng
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Thanh điều hướng trang chuẩn như Tài sản & Thiết bị */}
        {filteredRows.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/60">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredRows.length}
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

      {/* MODAL 1: GHI NHẬN LƯỢT DÙNG HÀNG LOẠT TRONG NGÀY (SỬ DỤNG PORTAL) */}
      {showBatchModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#182232] rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl w-[900px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden shrink-0">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-blue-50/50 dark:bg-[#151c28]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-600 text-white">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Ghi Nhận Lượt Sử Dụng Máy Hàng Ngày
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Chọn khoa phòng, tích chọn máy và nhập số lượt hoạt động trong ngày
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toolbar: Chọn Ngày & Lọc Khoa */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50/30 dark:bg-[#111827]/40">
              {/* Chọn Ngày ghi nhận */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    Ngày Ghi Nhận
                  </span>
                  {!userIsAdmin ? (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                      <Lock className="w-3 h-3" /> Cố định hôm nay
                    </span>
                  ) : (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold flex items-center gap-0.5">
                      🔑 Quyền Admin
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={userIsAdmin ? batchDate : todayStr}
                  disabled={!userIsAdmin}
                  onChange={e => handleBatchDateChange(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182232] text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    !userIsAdmin ? 'opacity-75 cursor-not-allowed bg-gray-100 dark:bg-slate-800/80 text-gray-500' : ''
                  }`}
                />
                {!userIsAdmin && (
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 italic">
                    Dữ liệu các ngày trước đã khóa sau 23h59. Chỉ Quản trị viên mới được ghi nhận khác ngày.
                  </p>
                )}
              </div>

              {/* Lọc theo khoa phòng */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  Khoa Phòng
                </label>
                <select
                  value={batchDeptFilter}
                  onChange={e => setBatchDeptFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182232] text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">🏢 Tất cả các đơn vị</option>
                  {departments.map((dept: any) => (
                    <option key={dept.id || dept.name} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ô tìm máy trong modal */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1">
                  Tìm nhanh máy
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tên máy, Serial..."
                    value={batchSearchTerm}
                    onChange={e => setBatchSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182232] text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Thanh thao tác nhanh: Chọn tất cả / Bỏ chọn tất cả / Nút chọn thêm máy từ Quản lý Thiết bị */}
            <div className="px-5 py-2.5 bg-gray-50 dark:bg-[#131c2a] border-b border-gray-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAllBatch(true)}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-100 text-[11px] cursor-pointer"
                >
                  Tích chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSelectAllBatch(false)}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-200 text-[11px] cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAssetPicker(!showAddAssetPicker)}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1.5 cursor-pointer transition-all ${
                    showAddAssetPicker
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{showAddAssetPicker ? 'Đóng chọn thêm máy' : '+ Chọn thêm máy từ Quản lý Thiết bị'}</span>
                </button>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
                Đã chọn: <strong className="text-blue-600 dark:text-blue-400">{Object.values(batchEntries).filter(e => e.selected).length}</strong> máy
              </span>
            </div>

            {/* KHAY CHỌN THÊM MÁY TỪ QUẢN LÝ THIẾT BỊ (PICKER) */}
            {showAddAssetPicker && (
              <div className="p-4 bg-blue-50/70 dark:bg-slate-900/90 border-b border-blue-200 dark:border-blue-900/50 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                      📦 Chọn máy từ Quản lý Thiết bị để đưa vào khoa: <strong className="text-cyan-600 dark:text-cyan-400">{batchDeptFilter === 'all' ? 'Tất cả khoa' : batchDeptFilter}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">
                    Tổng kho: {allAssets.length} thiết bị
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={pickerSearchTerm}
                    onChange={e => setPickerSearchTerm(e.target.value)}
                    placeholder="Gõ tên thiết bị, serial hoặc ký hiệu để tìm máy..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-[#182232] text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800/80 rounded-xl border border-blue-200/60 dark:border-slate-800 bg-white dark:bg-[#151c28]">
                  {allAssets
                    .filter(a => {
                      if (!pickerSearchTerm.trim()) return true;
                      const term = pickerSearchTerm.toLowerCase();
                      return (
                        (a.name || '').toLowerCase().includes(term) ||
                        (a.serial || '').toLowerCase().includes(term) ||
                        (a.kyHieu || '').toLowerCase().includes(term)
                      );
                    })
                    .slice(0, 50)
                    .map(asset => {
                      const alreadyIn = modalAssetList.some(x => x.id === asset.id);
                      return (
                        <div key={asset.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-blue-50/50 dark:hover:bg-slate-800/50 text-xs">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">{asset.name}</p>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono">
                              SN: {asset.serial || asset.kyHieu || '—'} {asset.currentDepartment ? `• ${asset.currentDepartment}` : '• Chưa bàn giao (Kho)'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddAssetToBatch(asset)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                              alreadyIn
                                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                            }`}
                          >
                            {alreadyIn ? '✓ Đã trong danh sách' : '+ Đưa vào khoa này'}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Danh sách các máy cần ghi nhận */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100 dark:divide-slate-800/80">
              {modalAssetList
                .filter(r => {
                  const dept = r.departmentName || batchEntries[r.id]?.departmentName || '';
                  if (batchDeptFilter !== 'all' && !dept.includes(batchDeptFilter)) {
                    return false;
                  }
                  if (batchSearchTerm.trim()) {
                    const term = batchSearchTerm.toLowerCase();
                    return (
                      (r.name || '').toLowerCase().includes(term) ||
                      (r.serial || '').toLowerCase().includes(term)
                    );
                  }
                  return true;
                }).length === 0 ? (
                  <div className="py-12 text-center text-gray-500 dark:text-slate-400">
                    <p className="font-bold text-sm text-gray-700 dark:text-slate-300 mb-1">
                      {batchDeptFilter === 'all'
                        ? 'Chưa có thiết bị nào trong danh sách'
                        : `Khoa phòng "${batchDeptFilter}" chưa có máy nào được gán`}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
                      Bạn có thể chọn máy từ Quản lý Thiết bị để ghi nhận lượt sử dụng cho khoa phòng này
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddAssetPicker(true)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>+ Chọn máy từ Quản lý Thiết bị</span>
                    </button>
                  </div>
                ) : (
                  modalAssetList
                    .filter(r => {
                      const dept = r.departmentName || batchEntries[r.id]?.departmentName || '';
                      if (batchDeptFilter !== 'all' && !dept.includes(batchDeptFilter)) {
                        return false;
                      }
                      if (batchSearchTerm.trim()) {
                        const term = batchSearchTerm.toLowerCase();
                        return (
                          (r.name || '').toLowerCase().includes(term) ||
                          (r.serial || '').toLowerCase().includes(term)
                        );
                      }
                      return true;
                    })
                    .map(row => {
                      const entry = batchEntries[row.id] || { selected: false, count: 1, notes: '' };

                      return (
                        <div
                          key={row.id}
                          className={`py-3 px-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            entry.selected
                              ? 'bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40'
                              : 'hover:bg-gray-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Checkbox + Thông tin máy */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={entry.selected}
                              onChange={e => {
                                const checked = e.target.checked;
                                setBatchEntries(prev => ({
                                  ...prev,
                                  [row.id]: {
                                    ...entry,
                                    selected: checked
                                  }
                                }));
                              }}
                              className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {row.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-slate-400 flex-wrap">
                                <span className="font-mono font-medium">Serial: {row.serial || row.kyHieu || '—'}</span>
                                <span>•</span>
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  {batchDeptFilter !== 'all' ? batchDeptFilter : (row.departmentName || 'Kho Trang bị')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Nhập số lượt + Ghi chú */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-gray-500 font-medium">Số lượt:</span>
                              <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-[#111827]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newCount = Math.max(1, entry.count - 1);
                                    setBatchEntries(prev => ({
                                      ...prev,
                                      [row.id]: { ...entry, count: newCount, selected: true }
                                    }));
                                  }}
                                  className="px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  max={999}
                                  value={entry.count}
                                  onChange={e => {
                                    const val = parseInt(e.target.value) || 1;
                                    setBatchEntries(prev => ({
                                      ...prev,
                                      [row.id]: { ...entry, count: val, selected: true }
                                    }));
                                  }}
                                  className="w-12 text-center text-xs font-bold py-1 bg-transparent border-none focus:outline-none text-gray-800 dark:text-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBatchEntries(prev => ({
                                      ...prev,
                                      [row.id]: { ...entry, count: entry.count + 1, selected: true }
                                    }));
                                  }}
                                  className="px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Ghi chú nhanh */}
                            <input
                              type="text"
                              placeholder="Ghi chú ca trực..."
                              value={entry.notes}
                              onChange={e => {
                                setBatchEntries(prev => ({
                                  ...prev,
                                  [row.id]: { ...entry, notes: e.target.value }
                                }));
                              }}
                              className="w-32 sm:w-40 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-gray-800 dark:text-slate-200 placeholder-gray-400 focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })
                )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#151c28]">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleSaveBatch}
                disabled={savingBatch}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {savingBatch ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lưu Tất Cả Lượt Sử Dụng</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: SỬA NHANH 1 Ô TRONG MA TRẬN (SỬ DỤNG PORTAL) */}
      {editingCell && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#182232] rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl w-[480px] max-w-[92vw] p-6 space-y-4 shrink-0">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Cập Nhật Lượt Sử Dụng
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-1">
                <p className="font-bold text-gray-900 dark:text-white text-sm">
                  {editingCell.assetName}
                </p>
                <p className="text-gray-500 dark:text-slate-400 font-mono text-[11px]">
                  Mã máy: {editingCell.serial} • Khoa: {editingCell.departmentName}
                </p>
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <p className="text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                    Mốc thời gian: {editingCell.dateStr ? `Ngày ${editingCell.dateStr}` : `Ngày ${editingCell.day}/${selectedMonth}/${selectedYear}`}
                  </p>
                  {editingCell.dateStr && editingCell.dateStr !== todayStr && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      🔑 Quyền Admin sửa ngày đã khóa
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1">
                  Số lượt sử dụng trong ngày:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCell(prev => prev ? { ...prev, count: Math.max(0, prev.count - 1) } : null)}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 text-base cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={editingCell.count}
                    onChange={e => setEditingCell(prev => prev ? { ...prev, count: Math.max(0, parseInt(e.target.value) || 0) } : null)}
                    className="flex-1 text-center py-2 text-base font-bold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingCell(prev => prev ? { ...prev, count: prev.count + 1 } : null)}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 text-base cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1">
                  Ghi chú (tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú người dùng, ca trực..."
                  value={editingCell.notes}
                  onChange={e => setEditingCell(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleSaveSingleCell(0)}
                disabled={savingCell}
                className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold cursor-pointer"
                title="Đặt số lượt về 0 (xóa lượt)"
              >
                Đặt về 0 (Xóa)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSingleCell()}
                  disabled={savingCell}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingCell ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Lưu</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
