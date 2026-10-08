import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import api from "../api/axios";
import Pagination from "../components/Pagination";
import { toast } from "../contexts/ToastContext";

type QualityGrade = 1 | 2 | 3 | 4 | 5 | 6;
const QUALITY_LABELS: Record<QualityGrade, string> = {
  1: "Cấp 1",
  2: "Cấp 2",
  3: "Cấp 3",
  4: "Cấp 4",
  5: "Cấp 5",
  6: "Cấp 6",
};
const QUALITY_COLORS: Record<QualityGrade, string> = {
  1: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  2: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  3: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  4: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  5: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
  6: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
};

interface ExpiryInfo {
  status: 'green' | 'gray' | 'blue' | 'orange' | 'purple' | 'red' | 'normal';
  label: string;
  shortLabel: string;
  rowClass: string;
  colorHex: string;
}

const getExpiryInfo = (expiryDate?: string): ExpiryInfo => {
  if (!expiryDate) return { status: 'normal', label: '', shortLabel: '', rowClass: '', colorHex: '' };
  const now = new Date();
  const exp = new Date(expiryDate);
  const diffTime = exp.getTime() - now.getTime();
  const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // xấp xỉ tháng

  if (diffMonths < 0) return { status: 'red', label: 'Hết hạn sử dụng', shortLabel: 'Hết hạn', rowClass: 'text-rose-400', colorHex: '#f43f5e' }; 
  if (diffMonths <= 1) return { status: 'purple', label: 'Hạn SD dưới 1 tháng', shortLabel: 'Dưới 1 tháng', rowClass: 'text-purple-400', colorHex: '#a855f7' };
  if (diffMonths <= 3) return { status: 'orange', label: 'Hạn SD dưới 3 tháng', shortLabel: 'Dưới 3 tháng', rowClass: 'text-amber-400', colorHex: '#f59e0b' };
  if (diffMonths <= 6) return { status: 'blue', label: 'Hạn SD dưới 6 tháng', shortLabel: 'Dưới 6 tháng', rowClass: 'text-sky-400', colorHex: '#38bdf8' };
  if (diffMonths <= 9) return { status: 'gray', label: 'Hạn SD dưới 9 tháng', shortLabel: 'Dưới 9 tháng', rowClass: 'text-slate-400', colorHex: '#94a3b8' };
  if (diffMonths <= 12) return { status: 'green', label: 'Hạn SD dưới 12 tháng', shortLabel: 'Dưới 12 tháng', rowClass: 'text-emerald-400', colorHex: '#10b981' };
  
  return { status: 'normal', label: 'Còn hạn (> 12 tháng)', shortLabel: 'Bình thường', rowClass: '', colorHex: '' };
};

const LEGEND_ITEMS = [
  { key: 'green', color: '#10b981', gradient: 'from-emerald-500 to-teal-600', label: 'Hạn sử dụng dưới 12 tháng', shortLabel: 'Dưới 12 tháng' },
  { key: 'gray', color: '#94a3b8', gradient: 'from-slate-500 to-slate-700', label: 'Hạn sử dụng dưới 9 tháng', shortLabel: 'Dưới 9 tháng' },
  { key: 'blue', color: '#38bdf8', gradient: 'from-sky-400 to-blue-600', label: 'Hạn sử dụng dưới 6 tháng', shortLabel: 'Dưới 6 tháng' },
  { key: 'orange', color: '#f59e0b', gradient: 'from-amber-400 to-orange-500', label: 'Hạn sử dụng dưới 3 tháng', shortLabel: 'Dưới 3 tháng' },
  { key: 'purple', color: '#a855f7', gradient: 'from-purple-500 to-indigo-600', label: 'Hạn sử dụng dưới 1 tháng', shortLabel: 'Dưới 1 tháng' },
  { key: 'red', color: '#f43f5e', gradient: 'from-rose-500 to-red-600', label: 'Hết hạn sử dụng', shortLabel: 'Hết hạn' },
];

type Category = { id: number; name: string };
type Equipment = {
  id: number; name: string; code: string; unit: string; quantity: number;
  usingUnit: string; manufactureYear?: number; useYear?: number;
  expiryDate?: string;
  warrantyPeriod: string; qualityGrade?: QualityGrade; notes: string;
  categoryId: number; categoryName?: string;
};
type EquipmentForm = Omit<Equipment, "id" | "categoryName">;

const EMPTY_FORM: EquipmentForm = {
  name: "", code: "", unit: "", quantity: 1, usingUnit: "",
  manufactureYear: undefined, useYear: undefined, expiryDate: "", warrantyPeriod: "",
  qualityGrade: undefined, notes: "", categoryId: 0,
};

export default function EquipmentsPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showSelectAssetModal, setShowSelectAssetModal] = useState(false);
  const [assetList, setAssetList] = useState<any[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<number>>(new Set());
  const [importingAssets, setImportingAssets] = useState(false);
  const [editItem, setEditItem] = useState<Equipment | null>(null);
  const [form, setForm] = useState<EquipmentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Expiry legend highlight and filter state
  const [hoveredExpiryStatus, setHoveredExpiryStatus] = useState<string | null>(null);
  const [selectedExpiryStatus, setSelectedExpiryStatus] = useState<string | null>(null);

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCat, selectedExpiryStatus]);

  const showMsg = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eqRes, catRes] = await Promise.all([
        api.get("/equipments", { params: { search: search || undefined, categoryId: filterCat || undefined } }),
        api.get("/categories"),
      ]);
      setItems(eqRes.data);
      setCategories(catRes.data);
    } catch { showMsg("error", "Không thể tải dữ liệu."); }
    finally { setLoading(false); }
  }, [search, filterCat]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (showSelectAssetModal) {
      api.get("/assets").then(res => setAssetList(res.data)).catch(err => console.error("Lỗi tải tài sản", err));
    } else {
      setSelectedAssetIds(new Set()); // Reset khi đóng modal
    }
  }, [showSelectAssetModal]);

  const handleToggleSelectAll = () => {
    if (selectedAssetIds.size === assetList.length && assetList.length > 0) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(assetList.map(a => a.id)));
    }
  };

  const handleToggleSelectAsset = (id: number) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAssetIds(next);
  };

  const handleImportSelectedAssets = async () => {
    if (selectedAssetIds.size === 0) return;
    setImportingAssets(true);
    try {
      const selected = assetList.filter(a => selectedAssetIds.has(a.id));
      let count = 0;
      for (const asset of selected) {
        await api.post('/equipments', {
           name: asset.name,
           code: asset.assetTag || asset.serial || '',
           unit: 'Cái',
           quantity: asset.quantity || 1,
           usingUnit: '',
           manufactureYear: asset.manufactureYear || null,
           useYear: asset.namSD || null,
           warrantyPeriod: '',
           qualityGrade: undefined,
           notes: 'Nhập từ kho Tài sản',
           categoryId: asset.categoryId || categories[0]?.id || 1
        });
        count++;
      }
      toast.success(`Đã nhập thành công ${count} thiết bị từ Kho Tài sản!`);
      showMsg("success", `Đã nhập thành công ${count} thiết bị.`);
      setShowSelectAssetModal(false);
      fetchData();
    } catch {
      toast.error("Có lỗi xảy ra khi nhập tài sản.");
      showMsg("error", "Có lỗi xảy ra khi nhập tài sản.");
    } finally {
      setImportingAssets(false);
    }
  };

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (item: Equipment) => {
    setEditItem(item);
    setForm({ 
      name: item.name, code: item.code, unit: item.unit, quantity: item.quantity,
      usingUnit: item.usingUnit, manufactureYear: item.manufactureYear, useYear: item.useYear,
      expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : "",
      warrantyPeriod: item.warrantyPeriod, qualityGrade: item.qualityGrade, notes: item.notes,
      categoryId: item.categoryId 
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { 
      toast.error("Vui lòng nhập tên thiết bị.");
      showMsg("error", "Vui lòng nhập tên thiết bị."); 
      return; 
    }
    if (!form.categoryId) { 
      toast.error("Vui lòng chọn danh mục.");
      showMsg("error", "Vui lòng chọn danh mục."); 
      return; 
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code?.trim() || null,
        unit: form.unit?.trim() || 'Bộ',
        quantity: parseInt(String(form.quantity)) || 1,
        usingUnit: form.usingUnit?.trim() || null,
        manufactureYear: form.manufactureYear ? parseInt(String(form.manufactureYear)) : null,
        useYear: form.useYear ? parseInt(String(form.useYear)) : null,
        warrantyPeriod: form.warrantyPeriod?.trim() || null,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
        qualityGrade: form.qualityGrade ? parseInt(String(form.qualityGrade)) : null,
        notes: form.notes?.trim() || null,
        categoryId: parseInt(String(form.categoryId)) || 1
      };

      if (editItem) {
        await api.put(`/equipments/${editItem.id}`, payload);
        toast.success(`Đã cập nhật thiết bị "${payload.name}" (Số lượng: ${payload.quantity}) thành công!`);
        showMsg("success", "Cập nhật thành công!");
      } else {
        await api.post("/equipments", payload);
        toast.success(`Đã thêm mới thiết bị "${payload.name}" thành công!`);
        showMsg("success", "Thêm mới thành công!");
      }
      setShowForm(false);
      await fetchData();
    } catch (err: any) { 
      console.error(err);
      const errMsg = err?.response?.data?.message || (err?.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(", ") : "Có lỗi xảy ra. Vui lòng thử lại.");
      toast.error(errMsg);
      showMsg("error", errMsg); 
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/equipments/${deleteId}`);
      toast.success("Đã xóa thiết bị và tự động đồng bộ sang Tài sản & Thiết bị!");
      showMsg("success", "Đã xóa thiết bị thành công.");
      setDeleteId(null);
      fetchData();
      window.dispatchEvent(new Event('assetsUpdated'));
    } catch { 
      toast.error("Không thể xóa thiết bị này.");
      showMsg("error", "Không thể xóa."); 
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post("/equipments/import-excel", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const { added, errors } = res.data;
      toast.success(`Đã nhập thành công ${added} thiết bị từ file Excel!`);
      showMsg("success", `Đã nhập ${added} thiết bị.${errors.length > 0 ? " " + errors.length + " hàng lỗi." : ""}`);
      fetchData();
    } catch { 
      toast.error("Import thất bại. Vui lòng kiểm tra lại file Excel.");
      showMsg("error", "Import thất bại. Kiểm tra lại file Excel."); 
    }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleDownloadTemplate = async () => {
    const res = await api.get("/equipments/export-template", { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a"); a.href = url; a.download = "Mau_NhapThietBi.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  const f = (field: keyof EquipmentForm, val: unknown) => setForm(prev => ({ ...prev, [field]: val }));

  const handleExportExcel = () => {
    const dataToExport = items.map((eq, index) => ({
      'STT': index + 1,
      'TÊN THIẾT BỊ': eq.name,
      'MÃ TB': eq.code,
      'ĐƠN VỊ': eq.unit,
      'SL': eq.quantity,
      'ĐƠN VỊ SỬ DỤNG': eq.usingUnit,
      'DANH MỤC': eq.categoryName || 'Mặc định',
      'NĂM SX': eq.manufactureYear || '-',
      'NĂM SD': eq.useYear || '-',
      'HẠN SD': eq.expiryDate ? new Date(eq.expiryDate).toLocaleDateString('vi-VN') : '-',
      'BẢO HÀNH': eq.warrantyPeriod ? `${eq.warrantyPeriod} tháng` : '-',
      'CHẤT LƯỢNG': typeof eq.qualityGrade === 'number' ? `${eq.qualityGrade}%` : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ThietBi');
    XLSX.writeFile(workbook, 'DanhSachThietBi.xlsx');
  };

  // Tính toán số liệu thống kê cho 4 thẻ KPI
  const countTotal = items.length;
  const countUnder1M = items.filter(it => getExpiryInfo(it.expiryDate).status === 'purple').length;
  const countUnder3M = items.filter(it => getExpiryInfo(it.expiryDate).status === 'orange').length;
  const countExpired = items.filter(it => getExpiryInfo(it.expiryDate).status === 'red').length;

  // Lọc dữ liệu theo trạng thái hạn dùng đã chọn
  const filteredItems = items.filter(item => {
    if (!selectedExpiryStatus) return true;
    return getExpiryInfo(item.expiryDate).status === selectedExpiryStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. MODULE HEADER BANNER SQUIRCLE GRADIENT */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c142c] via-[#0f1b3d] to-[#0c142c] border border-blue-500/20 p-6 lg:p-7 shadow-2xl shadow-blue-950/40 backdrop-blur-xl">
        {/* Glow hiệu ứng nền */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Cột trái: Icon Squircle + Tiêu đề */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 ring-1 ring-white/20 shrink-0">
              <span className="material-symbols-outlined text-[32px]">medical_services</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Định mức trang bị y tế
                </span>
                <span className="text-slate-400 text-xs">• Bệnh viện Quân y 87</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                Quản lý Thiết bị Y tế
              </h1>
              <p className="text-slate-400 text-xs lg:text-sm mt-0.5">
                Theo dõi định mức 360 thiết bị, phân cấp chất lượng Cấp 1–6 và giám sát hạn sử dụng đa tầng
              </p>
            </div>
          </div>

          {/* Cột phải: Các nút hành động Squircle Pill */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button 
              onClick={handleExportExcel} 
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Xuất 100% dữ liệu gốc ra file Excel"
            >
              <span className="material-symbols-outlined text-[18px]">export_notes</span>
              Xuất Excel
            </button>
            <button 
              onClick={handleDownloadTemplate} 
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              File mẫu
            </button>
            <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">{importing ? "hourglass_empty" : "upload_file"}</span>
              {importing ? "Đang nhập..." : "Import Excel"}
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
            <button 
              onClick={() => setShowSelectAssetModal(true)} 
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-900/80 to-purple-900/80 hover:from-indigo-800 hover:to-purple-800 border border-indigo-500/40 text-indigo-200 text-xs font-semibold shadow-md shadow-indigo-950/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">playlist_add</span>
              Nhập từ Kho TS
            </button>
            <button 
              onClick={openAdd} 
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Thêm thiết bị
            </button>
          </div>
        </div>
      </div>

      {/* Thông báo Alert Toast */}
      {msg && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ${
          msg.type === "success" 
            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30" 
            : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
        }`}>
          <span className="material-symbols-outlined text-[20px]">
            {msg.type === "success" ? "check_circle" : "error"}
          </span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* 2. CỤM 4 THẺ CHỈ SỐ KPI SQUIRCLE GRADIENT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Tổng thiết bị */}
        <div 
          onClick={() => setSelectedExpiryStatus(null)}
          className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
            selectedExpiryStatus === null
              ? "bg-[#0c142c] border-2 border-cyan-400/60 shadow-lg shadow-cyan-500/20 scale-[1.02]"
              : "bg-[#0c142c]/90 border border-blue-500/20 hover:border-cyan-500/40 hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Thiết Bị</p>
              <h3 className="text-2xl font-black text-white mt-1">{countTotal}</h3>
              <p className="text-[11px] text-cyan-400 mt-0.5">360 định mức toàn viện</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
              <span className="material-symbols-outlined text-[24px]">inventory_2</span>
            </div>
          </div>
        </div>

        {/* Thẻ 2: Hạn SD dưới 1 tháng */}
        <div 
          onClick={() => setSelectedExpiryStatus(prev => prev === 'purple' ? null : 'purple')}
          className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
            selectedExpiryStatus === 'purple'
              ? "bg-[#0c142c] border-2 border-purple-400/80 shadow-lg shadow-purple-500/20 scale-[1.02]"
              : "bg-[#0c142c]/90 border border-blue-500/20 hover:border-purple-500/40 hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hạn Dưới 1 Tháng</p>
              <h3 className="text-2xl font-black text-purple-400 mt-1">{countUnder1M}</h3>
              <p className="text-[11px] text-purple-300/80 mt-0.5">Cần kiểm định / thay mới</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/30">
              <span className="material-symbols-outlined text-[24px]">alarm</span>
            </div>
          </div>
        </div>

        {/* Thẻ 3: Hạn SD dưới 3 tháng */}
        <div 
          onClick={() => setSelectedExpiryStatus(prev => prev === 'orange' ? null : 'orange')}
          className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
            selectedExpiryStatus === 'orange'
              ? "bg-[#0c142c] border-2 border-amber-400/80 shadow-lg shadow-amber-500/20 scale-[1.02]"
              : "bg-[#0c142c]/90 border border-blue-500/20 hover:border-amber-500/40 hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hạn Dưới 3 Tháng</p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">{countUnder3M}</h3>
              <p className="text-[11px] text-amber-300/80 mt-0.5">Lên kế hoạch bảo trì định kỳ</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/30">
              <span className="material-symbols-outlined text-[24px]">schedule</span>
            </div>
          </div>
        </div>

        {/* Thẻ 4: Đã hết hạn */}
        <div 
          onClick={() => setSelectedExpiryStatus(prev => prev === 'red' ? null : 'red')}
          className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
            selectedExpiryStatus === 'red'
              ? "bg-[#0c142c] border-2 border-rose-400/80 shadow-lg shadow-rose-500/20 scale-[1.02]"
              : "bg-[#0c142c]/90 border border-blue-500/20 hover:border-rose-500/40 hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đã Hết Hạn SD</p>
              <h3 className="text-2xl font-black text-rose-400 mt-1">{countExpired}</h3>
              <p className="text-[11px] text-rose-300/80 mt-0.5">Cảnh báo ngưng sử dụng</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-500/30">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. THANH ĐIỀU KHIỂN & CHÚ GIẢI SQUIRCLE INTERACTIVE */}
      <div className="rounded-2xl bg-[#0c142c]/90 border border-blue-500/20 p-4 shadow-xl backdrop-blur-md space-y-3.5">
        {/* Hàng 1: Tìm kiếm & Dropdown danh mục */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-cyan-400 text-[20px]">
              search
            </span>
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Tìm kiếm theo tên thiết bị, mã số, đơn vị sử dụng..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900/80 text-white placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" 
            />
            {search && (
              <button 
                onClick={() => setSearch("")} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
          
          <div className="sm:w-64">
            <select 
              value={filterCat} 
              onChange={e => setFilterCat(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900/80 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all"
            >
              <option value="">Tất cả danh mục ({categories.length})</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {(search || filterCat || selectedExpiryStatus) && (
            <button 
              onClick={() => { setSearch(""); setFilterCat(""); setSelectedExpiryStatus(null); }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Hàng 2: Squircle Pills Chú giải Hạn sử dụng */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <span className="material-symbols-outlined text-[18px] text-cyan-400">palette</span>
            <span>Phân loại Hạn sử dụng:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {LEGEND_ITEMS.map((legend) => {
              const isHovered = hoveredExpiryStatus === legend.key;
              const isSelected = selectedExpiryStatus === legend.key;
              const count = items.filter(it => getExpiryInfo(it.expiryDate).status === legend.key).length;

              return (
                <div
                  key={legend.key}
                  onMouseEnter={() => setHoveredExpiryStatus(legend.key)}
                  onMouseLeave={() => setHoveredExpiryStatus(null)}
                  onClick={() => setSelectedExpiryStatus(prev => prev === legend.key ? null : legend.key)}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                    (isHovered || isSelected)
                      ? 'border-white/40 bg-slate-800 shadow-md ring-2 ring-cyan-400/40 scale-105'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/80'
                  }`}
                  title={`Bấm để lọc: ${legend.label}`}
                >
                  {/* Chấm tròn phát sáng Squircle */}
                  <span 
                    className="w-2.5 h-2.5 rounded-full shadow-sm"
                    style={{ backgroundColor: legend.color, boxShadow: `0 0 8px ${legend.color}` }}
                  />
                  <span className="font-semibold text-xs" style={{ color: legend.color }}>
                    {legend.shortLabel}
                  </span>
                  <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-white/10 text-white">
                    {count}
                  </span>
                </div>
              );
            })}

            {selectedExpiryStatus && (
              <button 
                onClick={() => setSelectedExpiryStatus(null)}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline ml-1 cursor-pointer"
              >
                Hiện tất cả
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. CONTAINER BẢNG DỮ LIỆU SQUIRCLE GLASS TABLE */}
      <div className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 shadow-2xl overflow-hidden backdrop-blur-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <span className="material-symbols-outlined text-4xl animate-spin text-cyan-400">progress_activity</span>
            <span className="font-medium text-sm">Đang tải danh sách thiết bị y tế...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-900/40 to-slate-900/60 border border-blue-500/20 flex items-center justify-center text-cyan-400 shadow-lg">
                <span className="material-symbols-outlined text-[32px]">medical_services</span>
              </div>
              <p className="font-bold text-lg text-white">
                {search || selectedExpiryStatus ? 'Không tìm thấy thiết bị y tế phù hợp' : 'Chưa có thiết bị nào trong danh sách'}
              </p>
              <p className="text-xs text-slate-400 max-w-md">
                {search || selectedExpiryStatus 
                  ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn cấp độ hạn dùng khác.' 
                  : 'Bấm nút "Thêm thiết bị" hoặc "Nhập từ Kho TS" ở góc trên để bắt đầu.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-blue-950/70 border-b border-blue-500/20 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                    {["#", "Tên Thiết Bị", "Mã TB", "Đơn Vị", "SL", "Đơn Vị SD", "Danh Mục", "Năm SX", "Năm SD", "Hạn SD", "Bảo Hành", "Chất Lượng", "Thao Tác"].map((h, i) => (
                      <th key={i} className="px-4 py-3.5 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item, idx) => {
                    const expiry = getExpiryInfo(item.expiryDate);
                    const activeFilter = hoveredExpiryStatus || selectedExpiryStatus;
                    const isHighlighted = activeFilter && expiry.status === activeFilter;
                    const isDimmed = activeFilter && expiry.status !== activeFilter;
                    const stt = (currentPage - 1) * pageSize + idx + 1;

                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors duration-150 ${
                          isHighlighted ? 'bg-cyan-500/15' : 'hover:bg-blue-600/10'
                        } ${isDimmed ? 'opacity-30' : ''}`}
                        title={expiry.label ? `Trạng thái: ${expiry.label}` : undefined}
                      >
                        {/* STT */}
                        <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{stt}</td>

                        {/* Tên Thiết Bị */}
                        <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                          <span style={expiry.colorHex ? { color: expiry.colorHex } : undefined}>
                            {item.name}
                          </span>
                        </td>

                        {/* Mã TB: Tuân thủ quy tắc <= 25 ký tự */}
                        <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap text-slate-300">
                          {item.code ? (
                            item.code.length > 25 ? (
                              <span 
                                className="cursor-help hover:text-cyan-300 underline decoration-dotted underline-offset-2" 
                                title={`Mã TB đầy đủ: ${item.code}`}
                              >
                                {item.code.slice(0, 25)}...
                              </span>
                            ) : (
                              item.code
                            )
                          ) : <span className="text-slate-500">-</span>}
                        </td>

                        {/* Đơn vị */}
                        <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">{item.unit || "-"}</td>

                        {/* SL */}
                        <td className="px-4 py-3.5 font-extrabold text-cyan-300 whitespace-nowrap">{item.quantity}</td>

                        {/* Đơn vị SD */}
                        <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">{item.usingUnit || <span className="text-slate-500">-</span>}</td>

                        {/* Danh mục */}
                        <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">{item.categoryName || <span className="text-slate-500">Mặc định</span>}</td>

                        {/* Năm SX */}
                        <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap font-mono">{item.manufactureYear || "-"}</td>

                        {/* Năm SD */}
                        <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap font-mono">{item.useYear || "-"}</td>

                        {/* Hạn SD kèm Pill Squircle */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-200">
                              {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('vi-VN') : "-"}
                            </span>
                            {expiry.status !== 'normal' && expiry.colorHex && (
                              <span 
                                className="text-[10px] px-2 py-0.5 rounded-lg font-bold border whitespace-nowrap shadow-sm"
                                style={{ 
                                  borderColor: `${expiry.colorHex}50`, 
                                  color: expiry.colorHex,
                                  backgroundColor: `${expiry.colorHex}15`
                                }}
                              >
                                {expiry.shortLabel}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Bảo hành */}
                        <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">{item.warrantyPeriod ? `${item.warrantyPeriod}` : "-"}</td>

                        {/* Phân cấp chất lượng */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {item.qualityGrade ? (
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-sm ${QUALITY_COLORS[item.qualityGrade]}`}>
                              {QUALITY_LABELS[item.qualityGrade]}
                            </span>
                          ) : <span className="text-slate-500">-</span>}
                        </td>

                        {/* Thao tác Squircle Icon Buttons */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => openEdit(item)} 
                              className="w-8 h-8 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95" 
                              title="Chỉnh sửa thiết bị"
                            >
                              <span className="material-symbols-outlined text-[17px]">edit</span>
                            </button>
                            <button 
                              onClick={() => setDeleteId(item.id)} 
                              className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95" 
                              title="Xóa thiết bị"
                            >
                              <span className="material-symbols-outlined text-[17px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Component */}
            {filteredItems.length > 0 && (
              <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredItems.length}
                  pageSize={pageSize}
                  pageSizeOptions={[10, 20, 50, 100]}
                  onPageChange={(page) => setCurrentPage(page)}
                  onPageSizeChange={(size) => setPageSize(size)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* 5. MODAL FORM THÊM / SỬA SQUIRCLE */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl border border-blue-500/30 w-full max-w-[660px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-500/20 sticky top-0 bg-[#0c142c] z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-md">
                  <span className="material-symbols-outlined text-[20px]">{editItem ? "edit_note" : "add_box"}</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">{editItem ? "Chỉnh Sửa Thiết Bị" : "Thêm Thiết Bị Y Tế Mới"}</h3>
                  <p className="text-xs text-slate-400">Điền thông tin định mức và hạn sử dụng</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Tên Thiết bị <span className="text-rose-400">*</span></label>
                  <input 
                    value={form.name} 
                    onChange={e => f("name", e.target.value)} 
                    placeholder="VD: Máy hút dịch, Hệ thống nội soi..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Mã Thiết bị</label>
                  <input 
                    value={form.code} 
                    onChange={e => f("code", e.target.value)} 
                    placeholder="VD: TB.3.56012.001"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Đơn vị tính</label>
                  <input 
                    value={form.unit} 
                    onChange={e => f("unit", e.target.value)} 
                    placeholder="VD: Cái, Bộ, Chiếc, Hệ thống..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Số lượng</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={form.quantity} 
                    onChange={e => f("quantity", parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Danh mục <span className="text-rose-400">*</span></label>
                  <select 
                    value={form.categoryId || ""} 
                    onChange={e => f("categoryId", parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Đơn vị sử dụng</label>
                  <input 
                    value={form.usingUnit} 
                    onChange={e => f("usingUnit", e.target.value)} 
                    placeholder="VD: Khoa Cấp cứu, Khoa Hồi sức, Khoa Khám bệnh..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Năm sản xuất</label>
                  <input 
                    type="number" 
                    min={1900} 
                    max={2100} 
                    value={form.manufactureYear || ""} 
                    onChange={e => f("manufactureYear", e.target.value ? parseInt(e.target.value) : undefined)} 
                    placeholder="VD: 2021"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Năm đưa vào sử dụng</label>
                  <input 
                    type="number" 
                    min={1900} 
                    max={2100} 
                    value={form.useYear || ""} 
                    onChange={e => f("useYear", e.target.value ? parseInt(e.target.value) : undefined)} 
                    placeholder="VD: 2022"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Hạn sử dụng</label>
                  <input 
                    type="date" 
                    value={form.expiryDate || ""} 
                    onChange={e => f("expiryDate", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Thời gian bảo hành</label>
                  <input 
                    value={form.warrantyPeriod} 
                    onChange={e => f("warrantyPeriod", e.target.value)} 
                    placeholder="VD: 12 tháng, 24 tháng..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Phân cấp chất lượng</label>
                  <select 
                    value={form.qualityGrade || ""} 
                    onChange={e => f("qualityGrade", e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all"
                  >
                    <option value="">-- Chọn phân cấp --</option>
                    <option value="1">Cấp 1</option>
                    <option value="2">Cấp 2</option>
                    <option value="3">Cấp 3</option>
                    <option value="4">Cấp 4</option>
                    <option value="5">Cấp 5</option>
                    <option value="6">Cấp 6</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Ghi chú</label>
                  <textarea 
                    value={form.notes} 
                    onChange={e => f("notes", e.target.value)} 
                    rows={2} 
                    placeholder="Ghi chú thêm về thiết bị..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all resize-none" 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-blue-500/20 bg-slate-900/60 rounded-b-3xl">
              <button 
                onClick={() => setShowForm(false)} 
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSave} 
                disabled={saving} 
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-blue-500/30 transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editItem ? "Lưu thay đổi" : "Xác nhận thêm mới"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL CHỌN TỪ TÀI SẢN CHUNG SQUIRCLE */}
      {showSelectAssetModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={e => e.target === e.currentTarget && setShowSelectAssetModal(false)}>
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl border border-blue-500/30 w-full max-w-[820px] flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-500/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <span className="material-symbols-outlined text-[20px]">playlist_add</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Chọn từ Kho Tài Sản & Thiết Bị</h3>
                  <p className="text-xs text-slate-400">Chọn thiết bị từ danh mục chung để nạp vào theo dõi định mức</p>
                </div>
              </div>
              <button onClick={() => setShowSelectAssetModal(false)} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">
                        <input 
                          type="checkbox" 
                          checked={assetList.length > 0 && selectedAssetIds.size === assetList.length}
                          onChange={handleToggleSelectAll}
                          className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3">Tên Tài Sản</th>
                      <th className="px-4 py-3">Mã QR / Serial</th>
                      <th className="px-4 py-3">Danh Mục</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {assetList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                          Không có tài sản nào trong kho.
                        </td>
                      </tr>
                    ) : (
                      assetList.map(a => (
                        <tr key={a.id} className={`hover:bg-blue-600/10 transition-colors ${selectedAssetIds.has(a.id) ? 'bg-cyan-500/10' : ''}`}>
                          <td className="px-4 py-3 text-center">
                            <input 
                              type="checkbox" 
                              checked={selectedAssetIds.has(a.id)}
                              onChange={() => handleToggleSelectAsset(a.id)}
                              className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-white">{a.name}</td>
                          <td className="px-4 py-3 font-mono text-cyan-300 text-xs">{a.assetTag || a.serial || '-'}</td>
                          <td className="px-4 py-3 text-slate-300">{a.category?.name || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-blue-500/20 shrink-0 bg-slate-900/60 rounded-b-3xl">
              <div className="text-xs font-bold text-cyan-400">
                Đã chọn: {selectedAssetIds.size} thiết bị
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSelectAssetModal(false)} 
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleImportSelectedAssets} 
                  disabled={selectedAssetIds.size === 0 || importingAssets} 
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {importingAssets && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Xác nhận nhập vào danh sách
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL XÁC NHẬN XÓA SQUIRCLE */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl border border-rose-500/30 p-7 max-w-[400px] w-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-rose-500/30 mb-4">
              <span className="material-symbols-outlined text-[30px]">delete_forever</span>
            </div>
            <h3 className="font-extrabold text-lg text-white mb-2">Xác nhận xóa thiết bị?</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Thiết bị này sẽ bị xóa khỏi danh sách quản lý định mức. Thao tác này không thể hoàn tác.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setDeleteId(null)} 
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold text-xs transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleDelete} 
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-500/30 transition-all"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
