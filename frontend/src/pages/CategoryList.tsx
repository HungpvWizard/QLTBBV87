import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, X, Edit, Trash2, Warehouse, Tags, Layers, RotateCcw, AlertTriangle, Info } from 'lucide-react';
import api from '../api/axios';

const CategoryList = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'warehouses' | 'categories'>('warehouses');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Category
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catWarehouseId, setCatWarehouseId] = useState<number | ''>('');

  // Modal Warehouse
  const [showWhModal, setShowWhModal] = useState(false);
  const [whName, setWhName] = useState('');
  const [whDesc, setWhDesc] = useState('');
  const [editWhId, setEditWhId] = useState<number | null>(null);

  // Modal Delete Confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'warehouse' | 'category';
    id: number;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, whRes] = await Promise.all([
        api.get('/categories'),
        api.get('/warehouses')
      ]);
      setCategories(catRes.data);
      setWarehouses(whRes.data);
    } catch (error) {
      console.error("Lỗi tải dữ liệu", error);
    } finally {
      setLoading(false);
    }
  };

  // Warehouse Handlers
  const openAddWarehouse = () => {
    setEditWhId(null);
    setWhName('');
    setWhDesc('');
    setShowWhModal(true);
  };

  const openEditWarehouse = (w: any) => {
    setEditWhId(w.id);
    setWhName(w.name);
    setWhDesc(w.description || '');
    setShowWhModal(true);
  };

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName.trim()) return;

    try {
      if (editWhId) {
        await api.put(`/warehouses/${editWhId}`, { id: editWhId, name: whName.trim(), description: whDesc.trim() });
      } else {
        await api.post('/warehouses', { name: whName.trim(), description: whDesc.trim() });
      }
      setWhName('');
      setWhDesc('');
      setEditWhId(null);
      setShowWhModal(false);
      fetchData();
    } catch (error: any) {
      console.error("Lỗi lưu kho", error);
      alert(error.response?.data?.message || "Lỗi khi lưu thông tin kho!");
    }
  };

  // Category Handlers
  const openAddCategory = () => {
    setEditCatId(null);
    setCatName('');
    setCatDesc('');
    setCatWarehouseId(warehouses[0]?.id || '');
    setShowCatModal(true);
  };

  const openEditCategory = (c: any) => {
    setEditCatId(c.id);
    setCatName(c.name);
    setCatDesc(c.description || '');
    setCatWarehouseId(c.warehouseId || '');
    setShowCatModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catWarehouseId) {
      alert("Vui lòng nhập tên danh mục và chọn kho lưu trữ!");
      return;
    }

    try {
      if (editCatId) {
        await api.put(`/categories/${editCatId}`, {
          id: editCatId,
          name: catName.trim(),
          description: catDesc.trim(),
          warehouseId: Number(catWarehouseId),
          type: 1
        });
      } else {
        await api.post('/categories', {
          name: catName.trim(),
          description: catDesc.trim(),
          warehouseId: Number(catWarehouseId),
          type: 1
        });
      }
      setCatName('');
      setCatDesc('');
      setCatWarehouseId('');
      setEditCatId(null);
      setShowCatModal(false);
      fetchData();
    } catch (error: any) {
      console.error("Lỗi lưu danh mục", error);
      alert(error.response?.data?.message || "Lỗi khi lưu danh mục!");
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      setIsDeleting(true);
      if (deleteConfirm.type === 'warehouse') {
        await api.delete(`/warehouses/${deleteConfirm.id}`);
      } else {
        await api.delete(`/categories/${deleteConfirm.id}`);
      }
      setDeleteConfirm(null);
      fetchData();
    } catch (error: any) {
      console.error("Lỗi xóa:", error);
      alert(error.response?.data?.message || "Không thể xóa mục này do có ràng buộc dữ liệu!");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter lists
  const filteredWarehouses = useMemo(() => {
    if (!searchTerm.trim()) return warehouses;
    const term = searchTerm.toLowerCase().trim();
    return warehouses.filter(w =>
      w.name?.toLowerCase().includes(term) ||
      w.description?.toLowerCase().includes(term) ||
      `kho-${w.id}`.toLowerCase().includes(term)
    );
  }, [warehouses, searchTerm]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.toLowerCase().trim();
    return categories.filter(c => {
      const wh = warehouses.find(w => w.id === c.warehouseId);
      return (
        c.name?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        wh?.name?.toLowerCase().includes(term)
      );
    });
  }, [categories, warehouses, searchTerm]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalWh = warehouses.length;
    const totalCat = categories.length;
    // Find warehouse with most categories
    let maxCatCount = 0;
    let topWarehouse = 'Chưa có';
    warehouses.forEach(w => {
      const count = categories.filter(c => c.warehouseId === w.id).length;
      if (count > maxCatCount) {
        maxCatCount = count;
        topWarehouse = w.name;
      }
    });
    const avgCatPerWh = totalWh > 0 ? (totalCat / totalWh).toFixed(1) : 0;
    return { totalWh, totalCat, topWarehouse, maxCatCount, avgCatPerWh };
  }, [warehouses, categories]);

  return (
    <div className="space-y-6">
      {/* 1. MODULE HEADER BANNER SQUIRCLE GRADIENT */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c142c] via-[#0f1b3d] to-[#0c142c] border border-blue-500/20 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 shrink-0">
              <Warehouse className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Kho & Danh mục Thiết bị
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Cấu trúc hệ thống
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400 font-medium">
                Thiết lập hệ thống kho lưu trữ, phân nhóm danh mục trang thiết bị y tế và quản trị danh mục dùng chung
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchData}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 transition-all font-semibold text-sm flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              title="Làm mới dữ liệu kho và danh mục"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>Làm mới</span>
            </button>

            {activeTab === 'warehouses' ? (
              <button
                onClick={openAddWarehouse}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer active:scale-95 border border-cyan-300/30"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Thêm Kho Mới</span>
              </button>
            ) : (
              <button
                onClick={openAddCategory}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer active:scale-95 border border-purple-300/30"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Thêm Danh Mục</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. CỤM 4 THẺ KPI SQUIRCLE GRADIENT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng số Kho */}
        <div 
          onClick={() => setActiveTab('warehouses')}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 shadow-lg ${
            activeTab === 'warehouses'
              ? 'bg-gradient-to-br from-blue-900/60 to-indigo-950/80 border-blue-400 ring-2 ring-blue-500/30 shadow-blue-500/20'
              : 'bg-[#0c142c]/90 hover:bg-[#0f1b3d] border-blue-500/20 hover:border-blue-400/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">Kho lưu trữ</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-cyan-400">{stats.totalWh}</span>
                <span className="text-xs text-slate-400">kho</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Các kho vật tư, thiết bị y tế</p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 group-hover:scale-110 transition-transform">
              <Warehouse className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Danh sách kho</span>
            <span className="text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">Xem chi tiết →</span>
          </div>
        </div>

        {/* KPI 2: Tổng Danh mục */}
        <div 
          onClick={() => setActiveTab('categories')}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 shadow-lg ${
            activeTab === 'categories'
              ? 'bg-gradient-to-br from-purple-900/60 to-indigo-950/80 border-purple-400 ring-2 ring-purple-500/30 shadow-purple-500/20'
              : 'bg-[#0c142c]/90 hover:bg-[#0f1b3d] border-purple-500/20 hover:border-purple-400/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-300/80">Danh mục thiết bị</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-purple-400">{stats.totalCat}</span>
                <span className="text-xs text-slate-400">nhóm danh mục</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Phân loại máy móc, tài sản</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 group-hover:scale-110 transition-transform">
              <Tags className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Danh mục chi tiết</span>
            <span className="text-purple-400 font-bold group-hover:translate-x-0.5 transition-transform">Xem chi tiết →</span>
          </div>
        </div>

        {/* KPI 3: Kho lớn nhất */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-500/20 bg-[#0c142c]/90 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">Kho đa dạng nhất</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-xl font-black text-emerald-400 truncate max-w-[170px]" title={stats.topWarehouse}>
                  {stats.topWarehouse}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">
                Chứa <span className="font-bold text-white">{stats.maxCatCount}</span> nhóm danh mục
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Layers className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Kho trọng điểm</span>
            <span className="text-emerald-400 font-medium">Trung tâm</span>
          </div>
        </div>

        {/* KPI 4: Tỷ lệ trung bình */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-amber-500/20 bg-[#0c142c]/90 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">Mật độ trung bình</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-amber-400">{stats.avgCatPerWh}</span>
                <span className="text-xs text-slate-400">danh mục/kho</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Phân bổ đồng đều danh mục</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <span className="material-symbols-outlined text-2xl">hub</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Chỉ số cấu trúc</span>
            <span className="text-amber-400 font-medium">Tiêu chuẩn</span>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR CONTROLS & TAB SEGMENTED PILLS */}
      <div className="rounded-2xl bg-[#0c142c]/90 border border-blue-500/20 p-4 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Tab Switcher Pills */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-900/90 border border-slate-700/80 w-fit">
          <button 
            onClick={() => setActiveTab('warehouses')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'warehouses' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            <span>Quản lý Kho ({warehouses.length})</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('categories')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'categories' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tags className="w-4 h-4" />
            <span>Quản lý Danh mục ({categories.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
          <input 
            type="text"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900/80 text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm font-medium"
            placeholder={`Tìm kiếm ${activeTab === 'warehouses' ? 'kho' : 'danh mục'} theo tên, mô tả...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4. SQUIRCLE GLASS TABLE */}
      <div className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-h-[380px]">
          {activeTab === 'warehouses' ? (
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-blue-950/70 border-b border-blue-500/20 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-4 px-6">Mã Kho</th>
                  <th className="py-4 px-6">Tên Kho Lưu Trữ</th>
                  <th className="py-4 px-6">Mô tả chức năng</th>
                  <th className="py-4 px-6 text-center">Số danh mục</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-slate-300">Đang tải danh sách kho...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredWarehouses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                          <Warehouse className="w-8 h-8 text-cyan-400" />
                        </div>
                        <p className="text-base font-bold text-slate-200">
                          {searchTerm ? 'Không tìm thấy kho nào phù hợp' : 'Chưa có kho lưu trữ'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 text-center">
                          {searchTerm ? 'Hãy thử tìm kiếm với từ khóa khác.' : 'Bấm nút "+ Thêm Kho Mới" để bắt đầu thiết lập kho.'}
                        </p>
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="mt-4 px-4 py-2 text-xs font-semibold text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/50 rounded-xl transition-colors border border-cyan-500/30 cursor-pointer shadow-sm"
                          >
                            Xóa từ khóa tìm kiếm
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredWarehouses.map(w => {
                    const catCount = categories.filter(c => c.warehouseId === w.id).length;
                    return (
                      <tr key={w.id} className="hover:bg-blue-600/10 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-cyan-400">
                          KHO-{w.id}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                              <Warehouse className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-slate-100 text-sm">{w.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-300 max-w-md truncate" title={w.description || 'Chưa có mô tả'}>
                          {w.description || <span className="italic text-slate-500">Chưa có mô tả</span>}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            {catCount} danh mục
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditWarehouse(w)}
                              className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="Chỉnh sửa kho"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Sửa</span>
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'warehouse', id: w.id, name: w.name })}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="Xóa kho"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gradient-to-r from-purple-950/70 via-slate-900/90 to-purple-950/70 border-b border-purple-500/20 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-4 px-6">Tên Danh Mục</th>
                  <th className="py-4 px-6">Trực thuộc Kho</th>
                  <th className="py-4 px-6">Mô tả danh mục</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-slate-300">Đang tải danh mục...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                          <Tags className="w-8 h-8 text-purple-400" />
                        </div>
                        <p className="text-base font-bold text-slate-200">
                          {searchTerm ? 'Không tìm thấy danh mục nào phù hợp' : 'Chưa có danh mục thiết bị'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 text-center">
                          {searchTerm ? 'Hãy thử tìm kiếm với từ khóa khác.' : 'Bấm nút "+ Thêm Danh Mục" để phân loại thiết bị.'}
                        </p>
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="mt-4 px-4 py-2 text-xs font-semibold text-purple-400 bg-purple-950/40 hover:bg-purple-900/50 rounded-xl transition-colors border border-purple-500/30 cursor-pointer shadow-sm"
                          >
                            Xóa từ khóa tìm kiếm
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map(c => {
                    const wh = warehouses.find(w => w.id === c.warehouseId);
                    const whName = wh?.name || 'Kho Hệ Thống (Mặc định)';
                    return (
                      <tr key={c.id} className="hover:bg-purple-600/10 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                              <Tags className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-white">{c.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/90 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1.5">
                            <Warehouse className="w-3.5 h-3.5 text-cyan-400" />
                            {whName}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-300 max-w-md truncate" title={c.description || 'Chưa có mô tả'}>
                          {c.description || <span className="italic text-slate-500">Chưa có mô tả</span>}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditCategory(c)}
                              className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="Chỉnh sửa danh mục"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Sửa</span>
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'category', id: c.id, name: c.name })}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="Xóa danh mục"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 5. MODAL THÊM / SỬA KHO SQUIRCLE GLASS */}
      {showWhModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl w-[520px] max-w-[92vw] overflow-hidden border border-blue-500/30">
            <div className="px-6 py-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {editWhId ? 'Cập nhật Kho Lưu Trữ' : 'Thêm Kho Mới'}
                  </h3>
                  <p className="text-xs text-slate-400">Thiết lập thông tin kho chứa thiết bị</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWhModal(false)} 
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveWarehouse} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Tên Kho <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
                  placeholder="VD: Kho CNTT, Kho Thiết bị Y tế, Kho Hành chính..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Mô tả chức năng kho
                </label>
                <textarea
                  value={whDesc}
                  onChange={(e) => setWhDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm min-h-[100px]"
                  placeholder="Mô tả các loại thiết bị sẽ lưu trữ trong kho này..."
                />
              </div>
              
              <div className="pt-4 border-t border-slate-800/80 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowWhModal(false)} 
                  className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-bold rounded-xl transition-all cursor-pointer text-sm"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 text-sm cursor-pointer"
                >
                  {editWhId ? 'Lưu cập nhật' : 'Thêm Kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL THÊM / SỬA DANH MỤC SQUIRCLE GLASS */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl w-[520px] max-w-[92vw] overflow-hidden border border-purple-500/30">
            <div className="px-6 py-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                  <Tags className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {editCatId ? 'Cập nhật Danh Mục' : 'Thêm Danh Mục Mới'}
                  </h3>
                  <p className="text-xs text-slate-400">Phân nhóm thiết bị theo chủng loại</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCatModal(false)} 
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Danh mục này thuộc Kho nào? <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={catWarehouseId}
                  onChange={(e) => setCatWarehouseId(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm cursor-pointer"
                >
                  <option value="">-- Chọn Kho lưu trữ --</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Tên danh mục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                  placeholder="VD: Máy siêu âm, Laptop, Monitor, Máy X-Quang..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Mô tả chi tiết
                </label>
                <textarea
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm min-h-[90px]"
                  placeholder="Mô tả danh mục này dùng cho thiết bị gì..."
                />
              </div>
              
              <div className="pt-4 border-t border-slate-800/80 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCatModal(false)} 
                  className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-bold rounded-xl transition-all cursor-pointer text-sm"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/25 active:scale-95 text-sm cursor-pointer"
                >
                  {editCatId ? 'Lưu cập nhật' : 'Lưu Danh Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL XÁC NHẬN XÓA SQUIRCLE GLASS */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl w-[480px] max-w-[92vw] overflow-hidden border border-rose-500/30">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/20">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">
                Xác nhận xóa {deleteConfirm.type === 'warehouse' ? 'Kho' : 'Danh mục'}?
              </h3>
              <p className="text-sm text-slate-300 mb-4">
                Bạn có chắc chắn muốn xóa {deleteConfirm.type === 'warehouse' ? 'kho' : 'danh mục'}{' '}
                <span className="font-bold text-rose-400 font-mono">"{deleteConfirm.name}"</span> không?
              </p>
              
              <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-xs text-amber-300 text-left mb-6 flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  {deleteConfirm.type === 'warehouse' 
                    ? 'Lưu ý: Không thể xóa kho nếu bên trong vẫn còn danh mục thiết bị lưu trữ.' 
                    : 'Lưu ý: Không thể xóa danh mục nếu đang có tài sản hoặc thiết bị thuộc danh mục này.'}
                </span>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirm(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer text-sm"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white transition-all active:scale-95 shadow-lg shadow-rose-600/30 inline-flex items-center gap-2 cursor-pointer text-sm"
                >
                  {isDeleting ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Xác nhận Xóa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CategoryList;
