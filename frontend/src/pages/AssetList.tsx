import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, QrCode, Handshake, X, Wrench, AlertTriangle, ExternalLink, Download, Plus, User, Building2, Building, RefreshCw, Pencil, Trash2, ArrowRightLeft, Save, FileSpreadsheet } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';
import QRScanner from '../components/QRScanner';
import SignatureCanvas from 'react-signature-canvas';
import * as XLSX from 'xlsx';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../contexts/ToastContext';

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

interface Asset {
  id: number;
  name: string;
  serial: string;
  assetTag: string;
  status: number;
  category?: { name: string };
  assignedUserId?: number;
  categoryId?: number;
  kyHieu?: string;
  manufacturer?: string;
  manufactureYear?: number;
  quantity?: number;
  currentDepartment?: string;
  departmentId?: number;
}

const renderCell25 = (text?: string | number | null, fallback = '-') => {
  if (text === null || text === undefined || text === '') {
    return <span className="text-gray-400 dark:text-slate-500">{fallback}</span>;
  }
  const str = String(text).trim();
  if (str.length > 25) {
    return (
      <span 
        className="cursor-help hover:text-primary dark:hover:text-blue-400 hover:underline decoration-dotted underline-offset-2 transition-colors"
        title={str}
      >
        {str.slice(0, 25)}...
      </span>
    );
  }
  return <span title={str}>{str}</span>;
};

const AssetList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [assets, setAssets] = useState<Asset[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [repairRequests, setRepairRequests] = useState<any[]>([]);
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<number | null>(null);
  const [manualStatusOverrides, setManualStatusOverrides] = useState<Record<number, number>>({});

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  useEffect(() => {
    const s = searchParams.get('status');
    if (s) {
      setStatusFilter(s);
    } else {
      setStatusFilter('all');
    }

    const action = searchParams.get('action');
    if (action === 'create') {
      setShowAddModal(true);
    }
  }, [searchParams]);

  // Đóng modal thêm trang bị và dọn URL query action
  const handleCloseAddModal = () => {
    setShowAddModal(false);
    if (searchParams.get('action') === 'create') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      setSearchParams(nextParams, { replace: true });
    }
  };

  // Tự động quay về trang 1 khi lọc hoặc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);
  
  // Handover state đồng bộ Quản lý Khoa Phòng chuẩn theo Hình 1
  const { user: currentUser } = useAuth();
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [handoverSelectedAssetIds, setHandoverSelectedAssetIds] = useState<number[]>([]);
  const [showAssetPickerModal, setShowAssetPickerModal] = useState(false);
  const [pickerSearchTerm, setPickerSearchTerm] = useState('');
  
  const [senderName, setSenderName] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [filterReceiverDept, setFilterReceiverDept] = useState<string>('all');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);
  
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

  const [viewQrAsset, setViewQrAsset] = useState<any>(null);
  const sigCanvas = useRef<any>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  useEffect(() => {
    fetchAssets();
    fetchCategories();
    fetchWarehouses();
    fetchUsersAndDepartments();
    fetchRepairRequests();

    // Lắng nghe sự kiện đồng bộ khoa phòng từ Quản lý Khoa Phòng và các tab khác
    const handleSync = (e?: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setDepartmentsList(e.detail);
      }
      fetchUsersAndDepartments();
    };

    const handleAssetsSync = () => {
      fetchAssets();
    };

    window.addEventListener('departmentsChanged', handleSync);
    window.addEventListener('departmentsUpdated', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('assetsUpdated', handleAssetsSync);
    window.addEventListener('equipmentDeleted', handleAssetsSync);

    return () => {
      window.removeEventListener('departmentsChanged', handleSync);
      window.removeEventListener('departmentsUpdated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('assetsUpdated', handleAssetsSync);
      window.removeEventListener('equipmentDeleted', handleAssetsSync);
    };
  }, []);

  const fetchUsersAndDepartments = async () => {
    // 1. Nạp khoa phòng: ưu tiên API, fallback cache localStorage, fallback DEFAULT_DEPARTMENTS
    let depts = DEFAULT_DEPARTMENTS;
    try {
      const cached = localStorage.getItem(LOCAL_DEP_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= DEFAULT_DEPARTMENTS.length) {
          depts = parsed;
          setDepartmentsList(parsed);
        }
      }
      const depRes = await api.get('/departments');
      if (Array.isArray(depRes.data) && depRes.data.length > 0) {
        depts = depRes.data;
        setDepartmentsList(depRes.data);
        localStorage.setItem(LOCAL_DEP_KEY, JSON.stringify(depRes.data));
      }
    } catch {
      try {
        const cached = localStorage.getItem(LOCAL_DEP_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length >= DEFAULT_DEPARTMENTS.length) depts = parsed;
        }
      } catch {}
      setDepartmentsList(depts);
    }

    // 2. Nạp users và đồng bộ khoa phòng
    try {
      const userRes = await api.get('/users');
      const rawUsers = userRes.data || [];
      let localMap: Record<number, number> = {};
      try {
        localMap = JSON.parse(localStorage.getItem(LOCAL_USER_DEP_MAP_KEY) || '{}');
      } catch {}

      const depMap = new Map<number, string>();
      depts.forEach((d: any) => depMap.set(d.id, d.name));

      const processedUsers = rawUsers.map((u: any) => {
        let depId = u.departmentId;
        if (!depId && localMap[u.id]) {
          depId = localMap[u.id];
        }
        const depName = u.departmentName || (depId ? depMap.get(depId) : null) || 'Chưa phân khoa';
        const displayName = u.fullName ? `${u.fullName} (@${u.username})` : u.username;
        const fullString = `${u.fullName || u.username} (${depName})`;

        return {
          ...u,
          departmentId: depId,
          departmentName: depName,
          displayName,
          fullString,
        };
      });

      setUsersList(processedUsers);
      return { depts, users: processedUsers };
    } catch (err) {
      console.error("Lỗi nạp danh sách tài khoản cho bàn giao", err);
      return { depts, users: [] };
    }
  };

  const handleManualSyncDepartments = async () => {
    setIsSyncingDept(true);
    try {
      const res = await fetchUsersAndDepartments();
      const count = res?.depts?.length || departmentsList.length;
      toast.success(`Đã đồng bộ thành công ${count} khoa phòng từ Quản lý Khoa Phòng!`);
    } catch {
      toast.error("Đã xảy ra lỗi khi đồng bộ danh mục khoa phòng.");
    } finally {
      setIsSyncingDept(false);
    }
  };


  // Lọc danh sách người nhận theo khoa phòng nếu được chọn
  const filteredReceiverUsers = useMemo(() => {
    if (filterReceiverDept === 'all') return usersList;
    return usersList.filter(u => u.departmentName === filterReceiverDept);
  }, [usersList, filterReceiverDept]);

  // Danh sách tài sản được chọn bàn giao
  const handoverSelectedAssets = useMemo(() => {
    return assets.filter(a => handoverSelectedAssetIds.includes(a.id));
  }, [assets, handoverSelectedAssetIds]);

  // Danh sách tài sản khả dụng trong kho để chọn thêm vào đợt bàn giao
  const availablePickerAssets = useMemo(() => {
    const term = pickerSearchTerm.toLowerCase();
    return assets.filter(a => 
      !handoverSelectedAssetIds.includes(a.id) &&
      (a.name.toLowerCase().includes(term) ||
       (a.assetTag && a.assetTag.toLowerCase().includes(term)) ||
       (a.serial && a.serial.toLowerCase().includes(term)))
    );
  }, [assets, handoverSelectedAssetIds, pickerSearchTerm]);

  const openHandoverModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setHandoverSelectedAssetIds([asset.id]);
    setReceiverName('');
    setFilterReceiverDept('all');
    setHandoverNotes('');
    
    // Tự động làm mới danh mục khoa phòng & nhân sự khi mở modal bàn giao
    fetchUsersAndDepartments();

    // Gợi ý người giao từ user đang đăng nhập
    if (currentUser) {
      const matched = usersList.find((u: any) => u.username === currentUser.username);
      if (matched) {
        setSenderName(matched.fullString);
      } else {
        setSenderName(currentUser.fullName ? `${currentUser.fullName} (@${currentUser.username})` : currentUser.username);
      }
    }
    
    setShowHandoverModal(true);
  };

  const handleTogglePickerAsset = (id: number) => {
    if (handoverSelectedAssetIds.includes(id)) {
      setHandoverSelectedAssetIds(handoverSelectedAssetIds.filter(i => i !== id));
    } else {
      setHandoverSelectedAssetIds([...handoverSelectedAssetIds, id]);
    }
  };

  const handleRemoveHandoverAsset = (id: number) => {
    setHandoverSelectedAssetIds(handoverSelectedAssetIds.filter(i => i !== id));
  };

  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets');
      setAssets(response.data);
    } catch (error) {
      console.error("Lỗi khi tải tài sản", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error("Lỗi tải danh mục", error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(response.data);
    } catch (error) {
      console.error("Lỗi tải kho", error);
    }
  };

  const fetchRepairRequests = async () => {
    try {
      const res = await api.get('/repairrequests');
      setRepairRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Lỗi tải phiếu đề nghị", err);
    }
  };

  // Map assetId -> phiếu đề nghị đang chờ tiếp nhận (1) hoặc đang xử lý (2)
  const pendingRepairMap = useMemo(() => {
    const map = new Map<number, any>();
    repairRequests.forEach(req => {
      if ((req.status === 1 || req.status === 2) && req.assetId) {
        map.set(req.assetId, req);
      }
    });
    return map;
  }, [repairRequests]);

  // Trạng thái hiển thị hiệu lực:
  // Nếu có can thiệp thủ công từ dropdown -> dùng trạng thái ghi đè
  // Nếu thiết bị đang có phiếu đề nghị chờ xử lý -> Tự động hiển thị là Bảo trì (3)
  // Ngược lại -> dùng asset.status
  const getEffectiveStatus = (asset: Asset) => {
    if (manualStatusOverrides[asset.id] !== undefined) {
      return manualStatusOverrides[asset.id];
    }
    if (pendingRepairMap.has(asset.id)) {
      return 3;
    }
    return asset.status;
  };

  const handleStatusChange = async (assetId: number, newStatus: number) => {
    const pending = pendingRepairMap.get(assetId);
    if (pending && newStatus !== 3) {
      const statusLabel = ['', 'Rảnh', 'Đang sử dụng', 'Bảo trì', 'Hỏng'][newStatus] || 'mới';
      const confirmChange = window.confirm(
        `Thiết bị này đang có Phiếu đề nghị bảo trì #${pending.id} (${pending.status === 1 ? 'Chờ tiếp nhận' : 'Đang xử lý'}).\n\nBạn có chắc chắn muốn chuyển trạng thái thiết bị sang "${statusLabel}" không?`
      );
      if (!confirmChange) return;
    }

    try {
      setIsUpdatingStatusId(assetId);
      const asset = assets.find(a => a.id === assetId);
      try {
        await api.patch(`/assets/${assetId}/status`, { status: newStatus });
      } catch (patchErr: any) {
        if (patchErr.response?.status === 405 || patchErr.response?.status === 404) {
          if (asset) {
            await api.put(`/assets/${assetId}`, { ...asset, status: newStatus });
          }
        } else {
          throw patchErr;
        }
      }
      setManualStatusOverrides(prev => ({ ...prev, [assetId]: newStatus }));
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: newStatus } : a));
      toast.success("Cập nhật trạng thái thiết bị thành công!");
    } catch (error: any) {
      console.error("Lỗi cập nhật trạng thái", error);
      toast.error(error.response?.data?.message || "Không thể cập nhật trạng thái thiết bị.");
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  // Add Asset State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState({ 
    name: '', 
    serial: '', 
    categoryId: 1,
    quantity: 1,
    manufactureYear: '',
    manufacturer: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    price: 0,
    status: 1,
    kyHieu: '',
    nuocSX: '',
    namSD: '',
    soLuuHanh: '',
    hdTu: '',
    hdDen: '',
    tuNgay: '',
    denNgay: '',
    legacyId: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setNewAsset({ 
      name: '', serial: '', categoryId: 1, quantity: 1, 
      manufactureYear: '', manufacturer: '', 
      purchaseDate: new Date().toISOString().split('T')[0], price: 0, status: 1,
      kyHieu: '', nuocSX: '', namSD: '', soLuuHanh: '', 
      hdTu: '', hdDen: '', tuNgay: '', denNgay: '', legacyId: ''
    });
  };

  // Đồng bộ sang Quản lý Thiết bị khi Thêm mới & Import Excel
  const [selectedAddWarehouseId, setSelectedAddWarehouseId] = useState<number>(1);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any[]>([]);
  const [pendingImportFileName, setPendingImportFileName] = useState('');
  const [selectedImportWarehouseId, setSelectedImportWarehouseId] = useState<number>(1);
  const [isImportingExcel, setIsImportingExcel] = useState(false);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name) return;
    try {
      const res = await api.post('/assets', {
        ...newAsset,
        quantity: parseInt(String(newAsset.quantity)) || 1,
        manufactureYear: newAsset.manufactureYear ? parseInt(newAsset.manufactureYear) : null,
        namSD: newAsset.namSD ? parseInt(newAsset.namSD) : null,
        hdTu: newAsset.hdTu ? new Date(newAsset.hdTu).toISOString() : null,
        hdDen: newAsset.hdDen ? new Date(newAsset.hdDen).toISOString() : null,
        tuNgay: newAsset.tuNgay ? new Date(newAsset.tuNgay).toISOString() : null,
        denNgay: newAsset.denNgay ? new Date(newAsset.denNgay).toISOString() : null
      });
      const created = res.data;

      // BẮT BUỘC: Đồng bộ ngay lập tức sang Quản lý Thiết bị theo Kho đã chọn
      const selectedWh = warehouses.find(w => w.id === selectedAddWarehouseId);
      const targetCat = categories.find(c => c.warehouseId === selectedAddWarehouseId) || categories.find(c => c.id === newAsset.categoryId) || categories[0];

      try {
        await api.post('/equipments', {
          name: newAsset.name,
          code: created?.assetTag || created?.serial || newAsset.serial || `TB-${Date.now()}`,
          unit: 'Bộ',
          quantity: parseInt(String(newAsset.quantity)) || 1,
          usingUnit: selectedWh?.name || 'Kho lưu trữ',
          manufactureYear: newAsset.manufactureYear ? parseInt(String(newAsset.manufactureYear)) : null,
          useYear: newAsset.namSD ? parseInt(String(newAsset.namSD)) : null,
          warrantyPeriod: newAsset.hdDen ? `Đến ${new Date(newAsset.hdDen).toLocaleDateString('vi-VN')}` : '',
          expiryDate: newAsset.denNgay || newAsset.hdDen || null,
          qualityGrade: 1,
          notes: `Đồng bộ từ Tài sản & Thiết bị (${selectedWh?.name || ''})`,
          categoryId: targetCat?.id || 1
        });
      } catch (eqErr) {
        console.error("Lỗi khi tự động đồng bộ sang Quản lý Thiết bị:", eqErr);
      }

      handleCloseAddModal();
      resetForm();
      await fetchAssets();
      const whName = selectedWh ? selectedWh.name : 'kho đã chọn';
      toast.success(`Đã thêm mới và đồng bộ thành công sang Quản lý Thiết bị (${whName})!`);
    } catch (err) {
      toast.error("Lỗi khi thêm trang bị mới. Vui lòng kiểm tra lại thông tin.");
    }
  };

  // Edit Asset State (Chỉnh sửa trang bị)
  const [editAsset, setEditAsset] = useState<any | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const openEditModal = (asset: any) => {
    setEditAsset({
      ...asset,
      quantity: asset.quantity || 1,
      manufactureYear: asset.manufactureYear ? String(asset.manufactureYear) : '',
      namSD: asset.namSD ? String(asset.namSD) : '',
      hdTu: asset.hdTu ? asset.hdTu.split('T')[0] : '',
      hdDen: asset.hdDen ? asset.hdDen.split('T')[0] : '',
      tuNgay: asset.tuNgay ? asset.tuNgay.split('T')[0] : '',
      denNgay: asset.denNgay ? asset.denNgay.split('T')[0] : '',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAsset || !editAsset.name) return;
    setIsSubmittingEdit(true);
    try {
      const { category, transfers, assignedUser, ...cleanPayload } = editAsset;
      await api.put(`/assets/${editAsset.id}`, {
        ...cleanPayload,
        quantity: parseInt(String(editAsset.quantity)) || 1,
        manufactureYear: editAsset.manufactureYear ? parseInt(editAsset.manufactureYear) : null,
        namSD: editAsset.namSD ? parseInt(editAsset.namSD) : null,
        hdTu: editAsset.hdTu ? new Date(editAsset.hdTu).toISOString() : null,
        hdDen: editAsset.hdDen ? new Date(editAsset.hdDen).toISOString() : null,
        tuNgay: editAsset.tuNgay ? new Date(editAsset.tuNgay).toISOString() : null,
        denNgay: editAsset.denNgay ? new Date(editAsset.denNgay).toISOString() : null,
        purchaseDate: editAsset.purchaseDate ? new Date(editAsset.purchaseDate).toISOString() : new Date().toISOString()
      });
      setEditAsset(null);
      await fetchAssets();
      toast.success("Cập nhật thông tin trang bị thành công!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Lỗi khi cập nhật thông tin trang bị!");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Asset State (Xóa trang bị)
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<any | null>(null);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);

  const handleDeleteSubmit = async () => {
    if (!deleteConfirmAsset) return;
    setIsDeletingAsset(true);
    try {
      await api.delete(`/assets/${deleteConfirmAsset.id}`);
      setAssets(prev => prev.filter(a => a.id !== deleteConfirmAsset.id));
      setDeleteConfirmAsset(null);
      toast.success(`Đã xóa thành công tài sản: ${deleteConfirmAsset.name}`);
      await fetchAssets();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Lỗi khi xóa tài sản!");
    } finally {
      setIsDeletingAsset(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const validRows = (data as any[]).filter(row => row.TEN_TB || row.Name || row.name);
        if (validRows.length === 0) {
          toast.warning("File Excel không chứa bản ghi thiết bị hợp lệ.");
          return;
        }

        setPendingImportData(validRows);
        setPendingImportFileName(file.name);
        if (warehouses && warehouses.length > 0) {
          setSelectedImportWarehouseId(warehouses[0].id);
        }
        setShowImportModal(true);
      } catch (err) {
        console.error(err);
        toast.error("Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImportExcel = async () => {
    if (!pendingImportData || pendingImportData.length === 0) return;
    setIsImportingExcel(true);
    try {
      let successCount = 0;
      const selectedWh = warehouses.find(w => w.id === selectedImportWarehouseId);
      const targetCat = categories.find(c => c.warehouseId === selectedImportWarehouseId) || categories[0];

      for (const row of pendingImportData) {
        const parseDate = (d: any) => {
          if (!d) return null;
          if (!isNaN(d) && typeof d === 'number') {
            const date = new Date(Math.round((d - 25569) * 86400 * 1000));
            return date.toISOString();
          }
          const dObj = new Date(d);
          return isNaN(dObj.getTime()) ? null : dObj.toISOString();
        };

        const safeStr = (val: any) => val ? String(val) : '';
        const name = safeStr(row.TEN_TB || row.Name || row.name);
        const serial = safeStr(row.MA_MAY || row.Serial || row.serial);
        const quantity = parseInt(row.Quantity || row.quantity) || 1;
        const manufactureYear = parseInt(row.NAM_SX || row.ManufactureYear) || null;
        const namSD = parseInt(row.NAM_SD) || null;
        const hdTu = parseDate(row.HD_TU);
        const hdDen = parseDate(row.HD_DEN);
        const tuNgay = parseDate(row.TU_NGAY);
        const denNgay = parseDate(row.DEN_NGAY);

        // 1. Thêm vào Assets
        const assetRes = await api.post('/assets', {
          name: name,
          serial: serial,
          categoryId: targetCat?.id || 1,
          quantity: quantity,
          manufactureYear: manufactureYear,
          manufacturer: safeStr(row.CONGTY_SX || row.Manufacturer),
          purchaseDate: row.PurchaseDate || row.purchaseDate || new Date().toISOString(),
          price: parseFloat(row.Price || row.price) || 0,
          status: 1,
          kyHieu: safeStr(row.KY_HIEU),
          nuocSX: safeStr(row.NUOC_SX),
          namSD: namSD,
          soLuuHanh: safeStr(row.SO_LUU_HANH),
          hdTu: hdTu,
          hdDen: hdDen,
          tuNgay: tuNgay,
          denNgay: denNgay,
          legacyId: safeStr(row.ID)
        });
        const createdAsset = assetRes.data;

        // 2. Đồng bộ luôn sang Equipments
        try {
          await api.post('/equipments', {
            name: name,
            code: createdAsset?.assetTag || serial || `TB-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            unit: 'Bộ',
            quantity: quantity,
            usingUnit: selectedWh?.name || 'Kho lưu trữ',
            manufactureYear: manufactureYear,
            useYear: namSD,
            warrantyPeriod: hdDen ? `Đến ${new Date(hdDen).toLocaleDateString('vi-VN')}` : '',
            expiryDate: denNgay || hdDen || null,
            qualityGrade: 1,
            notes: `Import Excel đồng bộ từ Tài sản & Thiết bị (${selectedWh?.name || ''})`,
            categoryId: targetCat?.id || 1
          });
        } catch (eqErr) {
          console.error("Lỗi đồng bộ sang Equipments khi import:", eqErr);
        }

        successCount++;
      }

      const whName = selectedWh ? selectedWh.name : 'Kho đã chọn';
      toast.success(`Đã import và đồng bộ thành công ${successCount} tài sản sang Quản lý Thiết bị (${whName})!`);
      setShowImportModal(false);
      setPendingImportData([]);
      setPendingImportFileName('');
      await fetchAssets();
    } catch (err) {
      console.error(err);
      toast.error("Có dữ liệu lỗi trong lúc import. Vui lòng kiểm tra lại file Excel.");
    } finally {
      setIsImportingExcel(false);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = filteredAssets.map((asset, index) => {
      const cat = categories.find(c => c.id === asset.categoryId);
      const wh = warehouses.find(w => w.id === cat?.warehouseId);
      const statusNames = ['', 'Rảnh', 'Đang sử dụng', 'Bảo trì', 'Hỏng'];
      const effectiveStatus = getEffectiveStatus(asset);
      return {
        'STT': index + 1,
        'TÊN THIẾT BỊ': asset.name,
        'MÃ QR': asset.assetTag,
        'KHO': wh ? wh.name : '-',
        'DANH MỤC': cat ? cat.name : '-',
        'MÃ MÁY (SERIAL)': asset.serial || '-',
        'KÝ HIỆU': asset.kyHieu || '-',
        'SỐ LƯỢNG': asset.quantity || 1,
        'HÃNG SX': asset.manufacturer || '-',
        'NĂM SX': asset.manufactureYear || '-',
        'TRẠNG THÁI': statusNames[effectiveStatus] || 'Khác'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TaiSan');
    XLSX.writeFile(workbook, 'DanhSachTaiSan_ThietBi.xlsx');
  };

  const handleScanSuccess = (decodedText: string) => {
    setShowScanner(false);
    const asset = assets.find(a => a.assetTag === decodedText);
    if (asset) {
      toast.info(`Đã tìm thấy tài sản: ${asset.name}`);
      openHandoverModal(asset);
    } else {
      toast.error("Không tìm thấy tài sản với mã QR này trong hệ thống.");
    }
  };

  const handleHandoverSubmit = async () => {
    if (handoverSelectedAssetIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một tài sản để bàn giao!");
      return;
    }
    if (!receiverName) {
      toast.warning("Vui lòng chọn Người nhận bàn giao!");
      return;
    }

    // Kiểm tra an toàn xem chữ ký có bị trống không
    let isSigEmpty = false;
    try {
      if (sigCanvas.current && typeof sigCanvas.current.isEmpty === 'function') {
        isSigEmpty = sigCanvas.current.isEmpty();
      }
    } catch (e) {
      console.warn("Không thể kiểm tra trạng thái chữ ký canvas:", e);
      isSigEmpty = false;
    }

    if (isSigEmpty) {
      toast.warning("Vui lòng ký tên xác nhận bàn giao vào ô chữ ký!");
      return;
    }

    // Bắt đầu gửi với loading indicator ngay lập tức
    setIsSubmittingHandover(true);

    try {
      // 1. Trích xuất hình ảnh chữ ký an toàn
      let signatureData = '';
      try {
        if (sigCanvas.current) {
          if (typeof sigCanvas.current.getTrimmedCanvas === 'function') {
            const trimmed = sigCanvas.current.getTrimmedCanvas();
            if (trimmed && typeof trimmed.toDataURL === 'function') {
              signatureData = trimmed.toDataURL('image/png');
            }
          }
          if (!signatureData && typeof sigCanvas.current.toDataURL === 'function') {
            signatureData = sigCanvas.current.toDataURL('image/png');
          }
        }
      } catch (canvasErr) {
        console.warn("Lỗi trích xuất chữ ký canvas, dùng fallback:", canvasErr);
        try {
          if (sigCanvas.current && typeof sigCanvas.current.toDataURL === 'function') {
            signatureData = sigCanvas.current.toDataURL('image/png');
          }
        } catch {}
      }

      // 2. Xác định khoa phòng nhận và user nhận
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

      // Tìm user người nhận cụ thể nếu có
      const matchedUser = usersList.find(u => 
        (u.fullString && receiverName.includes(u.fullString)) ||
        (u.username && receiverName.includes(`@${u.username}`)) ||
        (u.fullName && receiverName.includes(u.fullName))
      );
      const toUserId = matchedUser ? matchedUser.id : null;
      const fromUserId = currentUser?.id || null;

      const fullNotes = `Người giao: ${senderName || currentUser?.fullName || 'Đại diện Kho'}\nNgười nhận: ${receiverName}\nGhi chú: ${handoverNotes || 'Bàn giao tài sản'}`;

      // 3. Tạo bản ghi lịch sử bàn giao cho từng tài sản được chọn
      await Promise.all(handoverSelectedAssetIds.map(assetId => 
        api.post('/assettransfers', {
          assetId,
          fromUserId: fromUserId,
          toUserId: toUserId,
          notes: fullNotes,
          signatureData: signatureData || '',
          transferDate: new Date().toISOString()
        })
      ));
      
      // 4. Cập nhật trạng thái tài sản thành Đang sử dụng (2) và gắn khoa nhận sử dụng
      await Promise.all(handoverSelectedAssetIds.map(async (assetId) => {
        const asset = assets.find(a => a.id === assetId);
        if (asset) {
          // Bóc tách navigation properties để tránh xung đột tracking của EF Core
          const { category, transfers, assignedUser, ...assetClean } = asset as any;
          return api.put(`/assets/${assetId}`, { 
            ...assetClean, 
            status: 2, // Đang sử dụng
            assignedUserId: toUserId || assetClean.assignedUserId,
            currentDepartment: receivingDeptName || assetClean.currentDepartment || 'Khoa nhận bàn giao',
            departmentId: receivingDeptId || assetClean.departmentId
          });
        }
        return Promise.resolve();
      }));

      toast.success("Bàn giao tài sản thành công!");
      setShowHandoverModal(false);
      setReceiverName('');
      setHandoverNotes('');
      setHandoverSelectedAssetIds([]);
      try {
        sigCanvas.current?.clear();
      } catch {}
      await fetchAssets(); // Refresh danh sách tài sản
    } catch (err: any) {
      console.error("Lỗi bàn giao tài sản:", err);
      const errMsg = err?.response?.data?.message || err?.response?.data || err?.message || "Có lỗi xảy ra khi bàn giao tài sản!";
      toast.error(`Bàn giao không thành công: ${typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg)}`);
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const countAll = assets.length;
  const countFree = assets.filter(a => getEffectiveStatus(a) === 1).length;
  const countInUse = assets.filter(a => getEffectiveStatus(a) === 2).length;
  const countRepair = assets.filter(a => getEffectiveStatus(a) === 3).length;
  const countBroken = assets.filter(a => getEffectiveStatus(a) === 4).length;

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = !searchTerm.trim() || 
      asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetTag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.kyHieu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const effectiveStatus = getEffectiveStatus(asset);
    const matchesStatus = statusFilter === 'all' || effectiveStatus === Number(statusFilter);
    return matchesSearch && matchesStatus;
  });

  const paginatedAssets = filteredAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleStatusTabClick = (st: string) => {
    setStatusFilter(st);
    if (st === 'all') {
      searchParams.delete('status');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ status: st });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. MODULE HEADER BANNER SQUIRCLE GRADIENT */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 dark:from-[#0c142c] dark:via-[#0f1b3d] dark:to-[#0c142c] border border-blue-500/20 p-6 lg:p-7 shadow-2xl shadow-blue-950/40 backdrop-blur-xl">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/10 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-sky-400/20 dark:bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Cột trái: Icon Squircle + Tiêu đề */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 dark:bg-gradient-to-br dark:from-indigo-500 dark:via-purple-500 dark:to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 shrink-0 backdrop-blur-md">
              <span className="material-symbols-outlined text-[32px]">inventory_2</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 dark:bg-indigo-500/20 text-white dark:text-indigo-300 border border-white/30 dark:border-indigo-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-indigo-400 animate-pulse" />
                  Danh mục tài sản toàn viện
                </span>
                <span className="text-blue-100 dark:text-slate-400 text-xs">• Bệnh viện Quân y 87</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                Tài Sản & Thiết Bị
              </h1>
              <p className="text-blue-100/90 dark:text-slate-400 text-xs lg:text-sm mt-0.5">
                Quản lý tập trung toàn bộ tài sản, theo dõi mã QR, vị trí bàn giao và điều chuyển kho
              </p>
            </div>
          </div>

          {/* Cột phải: Các nút hành động Squircle Pill */}
          <div className="flex flex-wrap items-center gap-2.5">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button 
              onClick={handleExportExcel} 
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 border border-white/25 dark:border-emerald-500/30 text-white dark:text-emerald-300 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
              title="Xuất 100% dữ liệu gốc ra file Excel"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 dark:bg-slate-900/80 dark:hover:bg-slate-800 border border-white/25 dark:border-slate-700/60 text-white dark:text-slate-300 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Import Excel
            </button>
            <button 
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 dark:bg-slate-900/80 dark:hover:bg-slate-800 border border-white/25 dark:border-slate-700/60 text-white dark:text-slate-300 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
            >
              <QrCode className="w-4 h-4 text-cyan-200 dark:text-cyan-400" />
              Quét QR
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 dark:bg-gradient-to-r dark:from-blue-600 dark:via-blue-500 dark:to-cyan-500 dark:hover:from-blue-500 dark:hover:to-cyan-400 dark:text-white text-xs font-bold shadow-lg shadow-black/10 dark:shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Thêm trang bị
            </button>
          </div>
        </div>
      </div>

      {/* 2. CỤM 4 THẺ CHỈ SỐ KPI SQUIRCLE GRADIENT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Tổng tài sản */}
        <div 
          onClick={() => handleStatusTabClick('all')}
          className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
            statusFilter === 'all'
              ? "bg-[#0c142c] border-2 border-blue-400/80 shadow-lg shadow-blue-500/20 scale-[1.02]"
              : "bg-[#0c142c]/90 border border-blue-500/20 hover:border-blue-500/40 hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Tài Sản</p>
              <h3 className="text-2xl font-black text-white mt-1">{countAll}</h3>
              <p className="text-[11px] text-cyan-400 mt-0.5">Toàn bộ thiết bị đăng ký</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <span className="material-symbols-outlined text-[24px]">inventory_2</span>
            </div>
          </div>
        </div>

        {/* Thẻ 2: Đang sử dụng */}
        <div 
          onClick={() => handleStatusTabClick('2')}
          className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
            statusFilter === '2'
              ? "bg-[#0c142c] border-2 border-emerald-400/80 shadow-lg shadow-emerald-500/20 scale-[1.02]"
              : "bg-[#0c142c]/90 border border-blue-500/20 hover:border-emerald-500/40 hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang Sử Dụng</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">{countInUse}</h3>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">Đã bàn giao các khoa</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
              <span className="material-symbols-outlined text-[24px]">check_circle</span>
            </div>
          </div>
        </div>

        {/* Thẻ 3: Đang sửa chữa / Bảo trì */}
        <div 
          onClick={() => handleStatusTabClick('3')}
          className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
            statusFilter === '3'
              ? "bg-[#0c142c] border-2 border-amber-400/80 shadow-lg shadow-amber-500/20 scale-[1.02]"
              : "bg-[#0c142c]/90 border border-blue-500/20 hover:border-amber-500/40 hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang Bảo Trì</p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">{countRepair}</h3>
              <p className="text-[11px] text-amber-300/80 mt-0.5">Có phiếu đề nghị / sửa chữa</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/30">
              <span className="material-symbols-outlined text-[24px]">build</span>
            </div>
          </div>
        </div>

        {/* Thẻ 4: Cảnh báo hỏng */}
        <div 
          onClick={() => handleStatusTabClick('4')}
          className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
            statusFilter === '4'
              ? "bg-[#0c142c] border-2 border-rose-400/80 shadow-lg shadow-rose-500/20 scale-[1.02]"
              : "bg-[#0c142c]/90 border border-blue-500/20 hover:border-rose-500/40 hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cảnh Báo Hỏng</p>
              <h3 className="text-2xl font-black text-rose-400 mt-1">{countBroken}</h3>
              <p className="text-[11px] text-rose-300/80 mt-0.5">Cần thay thế linh kiện / thanh lý</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-500/30">
              <span className="material-symbols-outlined text-[24px]">error</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. THANH ĐIỀU KHIỂN & BỘ LỌC TRẠNG THÁI SQUIRCLE */}
      <div className="rounded-2xl bg-[#0c142c]/90 border border-blue-500/20 p-4 shadow-xl backdrop-blur-md space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleStatusTabClick('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <span>Tất cả</span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${statusFilter === 'all' ? 'bg-white/20' : 'bg-slate-800 text-slate-300'}`}>
              {countAll}
            </span>
          </button>

          <button
            onClick={() => handleStatusTabClick('2')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              statusFilter === '2'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-800/40'
            }`}
          >
            <span>Đang sử dụng</span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${statusFilter === '2' ? 'bg-white/20' : 'bg-emerald-900/60 text-emerald-300'}`}>
              {countInUse}
            </span>
          </button>

          <button
            onClick={() => handleStatusTabClick('3')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              statusFilter === '3'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30'
                : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 border border-amber-800/40'
            }`}
          >
            <span>Đang sửa chữa / Bảo trì</span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${statusFilter === '3' ? 'bg-white/20' : 'bg-amber-900/60 text-amber-300'}`}>
              {countRepair}
            </span>
          </button>

          <button
            onClick={() => handleStatusTabClick('4')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              statusFilter === '4'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30'
                : 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 border border-rose-800/40'
            }`}
          >
            <span>Cảnh báo hỏng</span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${statusFilter === '4' ? 'bg-white/20' : 'bg-rose-900/60 text-rose-300'}`}>
              {countBroken}
            </span>
          </button>

          <button
            onClick={() => handleStatusTabClick('1')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              statusFilter === '1'
                ? 'bg-slate-700 text-white shadow-md shadow-slate-700/30'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <span>Rảnh / Trong kho</span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${statusFilter === '1' ? 'bg-white/20' : 'bg-slate-800 text-slate-300'}`}>
              {countFree}
            </span>
          </button>
        </div>

        {/* Shortcut Banner when filtering repair or broken */}
        {statusFilter === '3' && (
          <div className="flex items-center justify-between p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-200">
            <div className="flex items-center gap-2 font-medium">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Đang lọc danh sách <strong>Tài sản Đang sửa chữa / Bảo trì</strong> ({filteredAssets.length} thiết bị).</span>
            </div>
            <Link to="/maintenance" className="font-bold underline hover:text-white flex items-center gap-1">
              <span>Đến trang Quản lý Phiếu Bảo Trì</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {statusFilter === '4' && (
          <div className="flex items-center justify-between p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-200">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Đang lọc danh sách <strong>Tài sản Cảnh báo hỏng</strong> ({filteredAssets.length} thiết bị).</span>
            </div>
            <Link to="/repair-requests" className="font-bold underline hover:text-white flex items-center gap-1">
              <span>Đến trang Quản lý Phiếu Đề Nghị / Báo Hỏng</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Search Bar Controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm nhanh theo tên thiết bị, mã QR, serial, ký hiệu, hãng sản xuất..." 
              className="w-full pl-11 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 text-white placeholder-slate-400 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {(searchTerm || statusFilter !== 'all') && (
            <button 
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* 4. CONTAINER BẢNG DỮ LIỆU SQUIRCLE GLASS TABLE */}
      <div className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap table-auto">
            <thead className="bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-blue-950/70 border-b border-blue-500/20 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
              <tr>
              <th className="py-3.5 px-3 text-center w-12">STT</th>
              <th className="py-3.5 px-4 min-w-[200px] max-w-[280px]">Tên thiết bị (Tài sản)</th>
              <th className="py-3.5 px-3 text-center w-24">Mã QR</th>
              <th className="py-3.5 px-4 min-w-[120px] max-w-[160px]">Kho</th>
              <th className="py-3.5 px-4 min-w-[110px] max-w-[150px]">Danh mục</th>
              <th className="py-3.5 px-4 min-w-[170px] max-w-[220px]">Mã máy (Serial)</th>
              <th className="py-3.5 px-4 min-w-[110px] max-w-[160px]">Ký hiệu</th>
              <th className="py-3.5 px-3 text-center w-16">SL</th>
              <th className="py-3.5 px-4 min-w-[110px] max-w-[160px]">Hãng SX</th>
              <th className="py-3.5 px-3 text-center w-24">Năm SX</th>
              <th className="py-3.5 px-4 text-center min-w-[155px]">Trạng thái</th>
              <th className="py-3.5 px-4 text-center min-w-[200px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50 text-sm">
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3 border border-slate-200 dark:border-slate-700/60 shadow-xs">
                      <Search className="w-7 h-7" />
                    </div>
                    <p className="text-base font-bold text-slate-700 dark:text-slate-200">Không tìm thấy tài sản phù hợp</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                      Không có thiết bị nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.
                    </p>
                    {(searchTerm || statusFilter !== 'all') && (
                      <button
                        onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                        className="mt-4 px-4 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-200 dark:border-blue-800/50 cursor-pointer"
                      >
                        Đặt lại bộ lọc & tìm kiếm
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : paginatedAssets.map((asset, index) => {
              const cat = categories.find(c => c.id === asset.categoryId);
              const wh = warehouses.find(w => w.id === cat?.warehouseId);
              const stt = (currentPage - 1) * pageSize + index + 1;
              const effectiveStatus = getEffectiveStatus(asset);
              const pendingReq = pendingRepairMap.get(asset.id);
              
              const qrPayload = `Tên TB: ${asset.name}\nMã QR: ${asset.assetTag}\nKho: ${wh ? wh.name : '-'}\nDanh mục: ${cat ? cat.name : '-'}\nSerial: ${asset.serial || '-'}\nKý hiệu: ${asset.kyHieu || '-'}\nHãng SX: ${asset.manufacturer || '-'}\nNăm SX: ${asset.manufactureYear || '-'}\nTrạng thái: ${['','Rảnh','Đang sử dụng','Bảo trì','Hỏng'][effectiveStatus] || 'Khác'}`;

              return (
              <tr key={asset.id} className="hover:bg-blue-50/80 dark:hover:bg-slate-700/40 hover:shadow-[inset_4px_0_0_0_#2563eb] transition-all duration-200 group bg-white dark:bg-slate-800">
                <td className="py-3.5 px-3 text-center text-gray-500 dark:text-slate-400 font-medium align-middle">{stt}</td>
                <td className="py-3.5 px-4 font-bold text-gray-800 dark:text-slate-100 whitespace-nowrap min-w-[200px] max-w-[280px] align-middle" title={asset.name}>
                  {renderCell25(asset.name)}
                </td>
                <td className="py-3.5 px-3 align-middle text-center">
                  <div onClick={() => setViewQrAsset(asset)} className="flex flex-col items-center gap-1 bg-white dark:bg-slate-700 p-1.5 border border-gray-200 dark:border-slate-600 rounded-lg w-fit mx-auto shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer" title="Phóng to mã QR">
                    <QRCodeSVG value={qrPayload} size={56} level="M" includeMargin={true} />
                    <span className="text-[10px] font-mono font-bold text-primary dark:text-blue-400 max-w-[100px] truncate block" title={asset.assetTag}>
                      {asset.assetTag ? (asset.assetTag.length > 25 ? `${asset.assetTag.slice(0, 25)}...` : asset.assetTag) : ''}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-gray-600 dark:text-slate-300 font-medium whitespace-nowrap align-middle" title={wh ? wh.name : undefined}>
                  {renderCell25(wh ? wh.name : '-')}
                </td>
                <td className="py-3.5 px-4 text-gray-600 dark:text-slate-300 whitespace-nowrap align-middle" title={cat ? cat.name : undefined}>
                  {renderCell25(cat ? cat.name : '-')}
                </td>
                <td 
                  className="py-3.5 px-4 text-gray-600 dark:text-slate-300 font-mono text-xs whitespace-nowrap align-middle"
                  title={asset.serial ? `Mã máy (Serial) đầy đủ: ${asset.serial}` : undefined}
                >
                  {renderCell25(asset.serial)}
                </td>
                <td className="py-3.5 px-4 text-gray-600 dark:text-slate-300 whitespace-nowrap align-middle" title={asset.kyHieu ? `Ký hiệu đầy đủ: ${asset.kyHieu}` : undefined}>
                  {renderCell25(asset.kyHieu)}
                </td>
                <td className="py-3.5 px-3 text-center font-bold text-gray-700 dark:text-slate-200 align-middle">{asset.quantity || 1}</td>
                <td className="py-3.5 px-4 text-gray-600 dark:text-slate-300 whitespace-nowrap align-middle" title={asset.manufacturer ? `Hãng SX đầy đủ: ${asset.manufacturer}` : undefined}>
                  {renderCell25(asset.manufacturer)}
                </td>
                <td className="py-3.5 px-3 text-center text-gray-600 dark:text-slate-300 align-middle">{asset.manufactureYear || '-'}</td>
                <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap">
                  <div className="inline-flex items-center justify-center gap-1.5">
                    <div className="relative inline-flex items-center">
                      <select
                        value={effectiveStatus}
                        disabled={isUpdatingStatusId === asset.id}
                        onChange={(e) => handleStatusChange(asset.id, Number(e.target.value))}
                        className={`text-xs font-bold py-1 pl-2.5 pr-6 rounded-full border cursor-pointer transition-all duration-150 outline-none appearance-none shadow-xs ${
                          effectiveStatus === 1
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:border-emerald-500'
                            : effectiveStatus === 2
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 hover:border-blue-500'
                            : effectiveStatus === 3
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:border-amber-500'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 hover:border-rose-500'
                        } ${isUpdatingStatusId === asset.id ? 'opacity-50 cursor-wait' : ''}`}
                        title="Bấm để đổi nhanh trạng thái thiết bị"
                      >
                        <option value={1} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">🟢 Rảnh</option>
                        <option value={2} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">🔵 Đang sử dụng</option>
                        <option value={3} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">🟡 Bảo trì</option>
                        <option value={4} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">🔴 Hỏng</option>
                      </select>
                      <span className="pointer-events-none absolute right-2 text-[9px] text-slate-500 dark:text-slate-400">▼</span>
                    </div>
                    {pendingReq && (
                      <Link
                        to="/repair-requests"
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800 transition-transform hover:scale-110 shadow-xs animate-bounce"
                        title={`Thiết bị có Phiếu đề nghị #${pendingReq.id} (${pendingReq.status === 1 ? 'Chờ tiếp nhận' : 'Đang xử lý'}): "${pendingReq.title || 'Bảo trì'}". Bấm để xem chi tiết.`}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center align-middle">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => openEditModal(asset)}
                      className="p-1.5 px-2.5 rounded-lg text-amber-600 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/50 transition-colors font-medium text-xs flex items-center gap-1"
                      title="Chỉnh sửa thông tin tài sản"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmAsset(asset)}
                      className="p-1.5 px-2.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/50 transition-colors font-medium text-xs flex items-center gap-1"
                      title="Xóa tài sản này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                    <button 
                      onClick={() => openHandoverModal(asset)}
                      className="text-primary hover:text-primary-container bg-primary/5 hover:bg-primary/10 dark:bg-primary/20 dark:hover:bg-primary/30 p-1.5 px-2.5 rounded-lg flex items-center gap-1 transition-colors font-medium text-xs border border-primary/20"
                      title="Lập biên bản bàn giao thiết bị"
                    >
                      <Handshake className="w-3.5 h-3.5" />
                      <span>Bàn giao</span>
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Pagination - Thanh phân trang chuẩn theo thiết kế */}
      {filteredAssets.length > 0 && (
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredAssets.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => setPageSize(size)}
          />
        </div>
      )}
    </div>

      {/* Scanner Modal */}
      {showScanner && (
        <QRScanner 
          onScanSuccess={handleScanSuccess} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {/* Handover Modal - Chuẩn theo Hình 1 */}
      {showHandoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-[#182232] rounded-2xl shadow-2xl w-[1050px] max-w-[96vw] max-h-[92vh] flex flex-col border border-gray-200 dark:border-slate-700/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-3.5 border-b border-gray-200 dark:border-slate-700/80 flex justify-between items-center bg-gray-50/80 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Handshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    Biên Bản Bàn Giao Thiết Bị
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Bệnh viện Quân y 87 {selectedAsset ? `• Bàn giao: ${selectedAsset.name}` : '• Quản lý & Theo dõi tài sản'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowHandoverModal(false)} 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - 2 Cột chuẩn 100% theo Hình 1 */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/40 dark:bg-[#131c2a]/40">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* CỘT TRÁI: THÔNG TIN CÁC BÊN & CHỮ KÝ */}
                <div className="space-y-5">
                  {/* Card 1: Thông tin các bên */}
                  <div className="bg-white dark:bg-[#182232] p-5 rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/60 pb-3">
                      <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Thông Tin Các Bên
                      </h3>
                      <button
                        type="button"
                        onClick={handleManualSyncDepartments}
                        disabled={isSyncingDept}
                        className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border border-blue-100 dark:border-blue-800/40 px-2.5 py-0.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                        title="Bấm để đồng bộ tức thì toàn bộ danh mục khoa phòng mới nhất từ Quản lý Khoa Phòng"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingDept ? 'animate-spin text-blue-600' : 'text-blue-500'}`} />
                        <span>Đồng bộ từ Quản lý Khoa Phòng</span>
                      </button>
                    </div>

                    {/* Người giao (Đại diện kho) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span>Người giao (Đại diện kho)</span>
                        <span className="text-[11px] font-normal text-gray-400 dark:text-slate-500">Chọn tài khoản</span>
                      </label>
                      <select 
                        value={senderName}
                        onChange={e => setSenderName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium transition-all"
                      >
                        <option value="">-- Chọn tài khoản người giao --</option>
                        {departmentsList.map(dept => {
                          const deptUsers = usersList.filter(u => u.departmentName === dept.name || u.departmentId === dept.id);
                          return (
                            <optgroup key={dept.id} label={`🏢 ${dept.name}`}>
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
                          <optgroup label="🏢 Tài khoản chưa phân khoa">
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                          Người nhận <span className="text-red-500">*</span>
                        </label>
                        {/* Bộ lọc nhanh khoa phòng */}
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 dark:text-slate-400" />
                          <select
                            value={filterReceiverDept}
                            onChange={e => setFilterReceiverDept(e.target.value)}
                            className="text-[11px] py-0.5 px-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 outline-none font-medium cursor-pointer"
                            title="Lọc nhanh danh sách theo từng khoa phòng"
                          >
                            <option value="all">Tất cả khoa phòng ({departmentsList.length})</option>
                            {departmentsList.map(d => (
                              <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <select 
                        value={receiverName}
                        onChange={e => setReceiverName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium transition-all"
                      >
                        <option value="">-- Chọn tài khoản nhân sự / khoa phòng nhận --</option>
                        {filterReceiverDept === 'all' ? (
                          <>
                            {departmentsList.map(dept => {
                              const deptUsers = usersList.filter(u => u.departmentName === dept.name || u.departmentId === dept.id);
                              return (
                                <optgroup key={dept.id} label={`🏢 ${dept.name}`}>
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
                              <optgroup label="🏢 Tài khoản chưa phân khoa">
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
                            <option value={`${filterReceiverDept} (Đại diện khoa)`}>
                              🏢 Đại diện {filterReceiverDept}
                            </option>
                            {filteredReceiverUsers.map(u => (
                              <option key={u.id} value={u.fullString}>
                                👤 {u.fullName ? `${u.fullName} (@${u.username})` : u.username} — [{u.departmentName || filterReceiverDept}]
                              </option>
                            ))}
                          </>
                        )}
                      </select>

                      {receiverName && (
                        <div className="mt-2 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 text-xs flex items-center gap-2">
                          <Building className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Đơn vị nhận: </span>
                            <strong className="text-blue-700 dark:text-blue-300 font-semibold">{receiverName}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ghi chú thêm */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Ghi chú thêm</label>
                      <textarea 
                        value={handoverNotes}
                        onChange={e => setHandoverNotes(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm min-h-[75px] transition-all resize-y"
                        placeholder="Tình trạng lúc giao, yêu cầu bảo quản..."
                      />
                    </div>
                  </div>

                  {/* Card 2: Chữ ký người nhận */}
                  <div className="bg-white dark:bg-[#182232] p-5 rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-xs">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                        Chữ ký người nhận
                      </label>
                      <button 
                        type="button"
                        onClick={() => sigCanvas.current?.clear()} 
                        className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 font-medium hover:underline transition-colors"
                      >
                        Xóa chữ ký
                      </button>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
                      <SignatureCanvas 
                        ref={sigCanvas} 
                        canvasProps={{width: 440, height: 140, className: 'sigCanvas w-full cursor-crosshair'}} 
                      />
                    </div>
                  </div>
                </div>

                {/* CỘT PHẢI: DANH SÁCH BÀN GIAO */}
                <div className="flex flex-col h-full space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">
                      Danh Sách Bàn Giao ({handoverSelectedAssets.length})
                    </h3>
                    <button 
                      type="button"
                      onClick={() => setShowAssetPickerModal(true)}
                      className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xs text-xs active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> Chọn tài sản từ Kho
                    </button>
                  </div>

                  {handoverSelectedAssets.length === 0 ? (
                    <div className="flex-1 min-h-[280px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-[#182232] p-8 text-center">
                      <Handshake className="w-12 h-12 text-gray-300 dark:text-slate-600 mb-3" />
                      <p className="text-gray-500 dark:text-slate-400 font-medium text-sm">Chưa có tài sản nào được chọn.</p>
                      <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">Nhấn "Chọn tài sản từ Kho" để thêm.</p>
                    </div>
                  ) : (
                    <div className="flex-1 border border-gray-200 dark:border-slate-700/80 rounded-2xl overflow-hidden bg-white dark:bg-[#182232] flex flex-col shadow-xs">
                      <div className="overflow-y-auto flex-1 max-h-[340px] divide-y divide-gray-100 dark:divide-slate-700/60">
                        {handoverSelectedAssets.map(asset => (
                          <div key={asset.id} className="p-3.5 flex items-start justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                            <div className="min-w-0 pr-3">
                              <p className="font-bold text-sm text-gray-900 dark:text-white truncate" title={asset.name}>
                                {asset.name}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400 font-mono">
                                <span className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                                  Mã: {asset.assetTag}
                                </span>
                                {asset.serial && (
                                  <span className="truncate max-w-[140px]">
                                    Serial: {asset.serial}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleRemoveHandoverAsset(asset.id)}
                              className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                              title="Xóa khỏi danh sách bàn giao"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nút Xác Nhận Bàn Giao */}
                  <button 
                    type="button"
                    onClick={handleHandoverSubmit}
                    disabled={handoverSelectedAssets.length === 0 || !receiverName || isSubmittingHandover}
                    className="w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    {isSubmittingHandover ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        <span>Đang xử lý bàn giao...</span>
                      </>
                    ) : (
                      <>
                        <Handshake className="w-4 h-4 shrink-0" />
                        <span>Xác Nhận Bàn Giao</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Asset Picker Modal (Để chọn thêm tài sản vào đợt bàn giao) */}
      {showAssetPickerModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#182232] rounded-2xl shadow-2xl w-[700px] max-w-[95vw] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] border border-gray-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50/80 dark:bg-slate-800/60 shrink-0">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Chọn Thêm Tài Sản Bàn Giao
              </h3>
              <button 
                onClick={() => setShowAssetPickerModal(false)}
                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Tìm theo tên thiết bị, mã QR hoặc serial..."
                  value={pickerSearchTerm}
                  onChange={(e) => setPickerSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/70 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 max-h-[400px]">
              {availablePickerAssets.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  Không tìm thấy tài sản nào khả dụng để thêm.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
                  {availablePickerAssets.map(asset => (
                    <div 
                      key={asset.id} 
                      onClick={() => handleTogglePickerAsset(asset.id)}
                      className="py-3 px-2 flex items-center justify-between hover:bg-blue-50/60 dark:hover:bg-slate-700/40 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="pr-4">
                        <p className="font-bold text-sm text-gray-800 dark:text-slate-200">{asset.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400 font-mono">
                          <span>Mã: {asset.assetTag}</span>
                          {asset.serial && <span>Serial: {asset.serial}</span>}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors shrink-0">
                        + Thêm
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/60 flex justify-end shrink-0">
              <button 
                onClick={() => setShowAssetPickerModal(false)}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl w-[600px] max-w-[90vw] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/50 shrink-0">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Thêm Mới Trang Bị</h3>
              <button onClick={handleCloseAddModal} className="text-secondary hover:text-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Chọn Kho bắt buộc để đồng bộ Quản lý Thiết bị */}
                <div className="bg-blue-50/50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">warehouse</span>
                    Kho lưu trữ (Đồng bộ Quản lý Thiết bị) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedAddWarehouseId}
                    onChange={e => {
                      const whId = parseInt(e.target.value);
                      setSelectedAddWarehouseId(whId);
                      const matchingCat = categories.find(c => c.warehouseId === whId);
                      if (matchingCat) {
                        setNewAsset(prev => ({ ...prev, categoryId: matchingCat.id }));
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-lg border border-blue-200 dark:border-blue-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white dark:[color-scheme:dark] text-sm font-semibold"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                        📦 {w.name} {w.description ? `(${w.description})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Thiết bị sẽ được tạo đồng thời ở cả <strong>Tài sản & Thiết bị</strong> và <strong>Quản lý Thiết bị</strong> tại kho này để số liệu luôn khớp 100%.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Tên trang bị (Tài sản) <span className="text-error">*</span></label>
                    <input
                      type="text"
                      required
                      value={newAsset.name}
                      onChange={e => setNewAsset({...newAsset, name: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="VD: Laptop Dell Inspiron"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Danh mục <span className="text-error">*</span></label>
                    <select
                      value={newAsset.categoryId}
                      onChange={e => setNewAsset({...newAsset, categoryId: parseInt(e.target.value)})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-transparent text-on-surface dark:text-white dark:[color-scheme:dark]"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">{c.name}</option>
                      ))}
                      {categories.length === 0 && <option value={1} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Mặc định</option>}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Mã Máy (Serial)</label>
                    <input
                      type="text"
                      value={newAsset.serial}
                      onChange={e => setNewAsset({...newAsset, serial: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Ký Hiệu</label>
                    <input
                      type="text"
                      value={newAsset.kyHieu}
                      onChange={e => setNewAsset({...newAsset, kyHieu: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Hãng Sản Xuất</label>
                    <input
                      type="text"
                      value={newAsset.manufacturer}
                      onChange={e => setNewAsset({...newAsset, manufacturer: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Nước Sản Xuất</label>
                    <input
                      type="text"
                      value={newAsset.nuocSX}
                      onChange={e => setNewAsset({...newAsset, nuocSX: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Số Lưu Hành</label>
                    <input
                      type="text"
                      value={newAsset.soLuuHanh}
                      onChange={e => setNewAsset({...newAsset, soLuuHanh: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Năm Sản Xuất</label>
                    <input
                      type="number"
                      value={newAsset.manufactureYear}
                      onChange={e => setNewAsset({...newAsset, manufactureYear: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Năm Sử Dụng</label>
                    <input
                      type="number"
                      value={newAsset.namSD}
                      onChange={e => setNewAsset({...newAsset, namSD: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Hợp Đồng (Từ ngày)</label>
                    <input
                      type="date"
                      value={newAsset.hdTu}
                      onChange={e => setNewAsset({...newAsset, hdTu: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Hợp Đồng (Đến ngày)</label>
                    <input
                      type="date"
                      value={newAsset.hdDen}
                      onChange={e => setNewAsset({...newAsset, hdDen: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Thời hạn (Từ ngày)</label>
                    <input
                      type="date"
                      value={newAsset.tuNgay}
                      onChange={e => setNewAsset({...newAsset, tuNgay: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Thời hạn (Đến ngày)</label>
                    <input
                      type="date"
                      value={newAsset.denNgay}
                      onChange={e => setNewAsset({...newAsset, denNgay: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Số lượng <span className="text-error">*</span></label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newAsset.quantity}
                      onChange={e => setNewAsset({...newAsset, quantity: parseInt(e.target.value) || 1})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Ngày mua</label>
                    <input
                      type="date"
                      value={newAsset.purchaseDate}
                      onChange={e => setNewAsset({...newAsset, purchaseDate: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Giá trị (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      value={newAsset.price}
                      onChange={e => setNewAsset({...newAsset, price: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="VD: 15000000"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md font-bold text-secondary mb-1">Trạng thái</label>
                    <select
                      value={newAsset.status}
                      onChange={e => setNewAsset({...newAsset, status: parseInt(e.target.value)})}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-transparent text-on-surface dark:text-white dark:[color-scheme:dark]"
                    >
                      <option value={1} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Rảnh / Sẵn sàng</option>
                      <option value={2} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Đang sử dụng</option>
                      <option value={3} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Bảo trì</option>
                      <option value={4} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Hỏng</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-3 shrink-0 bg-surface-container-low/50">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-5 py-2.5 rounded-lg font-bold text-secondary hover:bg-surface-container-high transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg font-bold bg-primary text-white hover:bg-primary-container transition-all active:scale-95 shadow-sm"
                >
                  Lưu trang bị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      {editAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[680px] max-w-[95vw] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-gray-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/80 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Chỉnh Sửa Thông Tin Trang Bị</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Mã QR: <span className="font-mono font-bold text-blue-500">{editAsset.assetTag}</span></p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditAsset(null)} 
                className="text-gray-400 hover:text-rose-500 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Tên trang bị (Tài sản) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={editAsset.name || ''}
                      onChange={e => setEditAsset({...editAsset, name: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Danh mục <span className="text-rose-500">*</span></label>
                    <select
                      value={editAsset.categoryId || 1}
                      onChange={e => setEditAsset({...editAsset, categoryId: parseInt(e.target.value)})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:[color-scheme:dark]"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Mã Máy (Serial)</label>
                    <input
                      type="text"
                      value={editAsset.serial || ''}
                      onChange={e => setEditAsset({...editAsset, serial: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Ký Hiệu</label>
                    <input
                      type="text"
                      value={editAsset.kyHieu || ''}
                      onChange={e => setEditAsset({...editAsset, kyHieu: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Hãng Sản Xuất</label>
                    <input
                      type="text"
                      value={editAsset.manufacturer || ''}
                      onChange={e => setEditAsset({...editAsset, manufacturer: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Nước Sản Xuất</label>
                    <input
                      type="text"
                      value={editAsset.nuocSX || ''}
                      onChange={e => setEditAsset({...editAsset, nuocSX: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Số Lưu Hành</label>
                    <input
                      type="text"
                      value={editAsset.soLuuHanh || ''}
                      onChange={e => setEditAsset({...editAsset, soLuuHanh: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Năm Sản Xuất</label>
                    <input
                      type="number"
                      value={editAsset.manufactureYear || ''}
                      onChange={e => setEditAsset({...editAsset, manufactureYear: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Năm Sử Dụng</label>
                    <input
                      type="number"
                      value={editAsset.namSD || ''}
                      onChange={e => setEditAsset({...editAsset, namSD: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Hợp Đồng (Từ ngày)</label>
                    <input
                      type="date"
                      value={editAsset.hdTu || ''}
                      onChange={e => setEditAsset({...editAsset, hdTu: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Hợp Đồng (Đến ngày)</label>
                    <input
                      type="date"
                      value={editAsset.hdDen || ''}
                      onChange={e => setEditAsset({...editAsset, hdDen: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Thời hạn (Từ ngày)</label>
                    <input
                      type="date"
                      value={editAsset.tuNgay || ''}
                      onChange={e => setEditAsset({...editAsset, tuNgay: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Thời hạn (Đến ngày)</label>
                    <input
                      type="date"
                      value={editAsset.denNgay || ''}
                      onChange={e => setEditAsset({...editAsset, denNgay: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Số lượng <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editAsset.quantity || 1}
                      onChange={e => setEditAsset({...editAsset, quantity: parseInt(e.target.value) || 1})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Ngày mua</label>
                    <input
                      type="date"
                      value={editAsset.purchaseDate || ''}
                      onChange={e => setEditAsset({...editAsset, purchaseDate: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Giá trị (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      value={editAsset.price || 0}
                      onChange={e => setEditAsset({...editAsset, price: parseFloat(e.target.value) || 0})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Trạng thái</label>
                    <select
                      value={editAsset.status || 1}
                      onChange={e => setEditAsset({...editAsset, status: parseInt(e.target.value)})}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:[color-scheme:dark]"
                    >
                      <option value={1} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Rảnh</option>
                      <option value={2} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Đang sử dụng</option>
                      <option value={3} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Bảo trì</option>
                      <option value={4} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Hỏng</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 shrink-0 bg-gray-50/80 dark:bg-slate-800/60">
                <button
                  type="button"
                  onClick={() => setEditAsset(null)}
                  className="px-4 py-2 rounded-xl font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-sm flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmittingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-[440px] max-w-[95vw] border border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3.5 mb-4 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center border border-rose-200 dark:border-rose-900/50">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Xác Nhận Xóa Tài Sản</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Thao tác này sẽ xóa vĩnh viễn tài sản</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 mb-5">
              <p className="text-sm text-gray-800 dark:text-slate-200 font-semibold mb-1">
                {deleteConfirmAsset.name}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>Mã QR: {deleteConfirmAsset.assetTag || '-'}</span>
                {deleteConfirmAsset.serial && <span>Serial: {deleteConfirmAsset.serial}</span>}
              </div>
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-400 mb-5 leading-relaxed">
              ⚠️ Lưu ý: Việc xóa tài sản này sẽ tự động xóa kèm các lịch sử bàn giao, bảo trì và nhật ký thiết bị liên quan. Bạn có chắc chắn muốn xóa không?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmAsset(null)}
                disabled={isDeletingAsset}
                className="px-4 py-2 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isDeletingAsset}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingAsset ? 'Đang xóa...' : 'Đồng ý xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bắt Buộc Chọn Kho Đồng Bộ Khi Import Excel */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-[520px] max-w-[95vw] border border-blue-500/20">
            <div className="flex items-center gap-3.5 mb-4 text-emerald-600 dark:text-emerald-400">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center border border-emerald-200 dark:border-emerald-900/50">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Xác Nhận Import File Excel</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Đồng bộ số liệu vào Quản lý Thiết bị</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 mb-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">File đã chọn:</span>
                <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[260px]">{pendingImportFileName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Số lượng thiết bị hợp lệ:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{pendingImportData.length} bản ghi</span>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">
                Bắt buộc: Chọn kho để đồng bộ sang "Quản lý Thiết bị" <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedImportWarehouseId}
                onChange={e => setSelectedImportWarehouseId(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:[color-scheme:dark]"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                    📦 {w.name} {w.description ? `(${w.description})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Toàn bộ thiết bị trong file Excel sẽ được nạp vào <strong>Tài sản & Thiết bị</strong>, đồng thời tự động đồng bộ sang <strong>Quản lý Thiết bị</strong> thuộc kho đã chọn để số liệu giữa 3 màn hình (Dashboard, Tài sản, Thiết bị) luôn đồng bộ 100%.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setPendingImportData([]);
                  setPendingImportFileName('');
                }}
                disabled={isImportingExcel}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmImportExcel}
                disabled={isImportingExcel}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>{isImportingExcel ? 'Đang import & đồng bộ...' : 'Xác nhận Import & Đồng bộ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal View Large QR */}
      {viewQrAsset && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" 
          onClick={() => setViewQrAsset(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 w-[380px] max-w-[92vw] shrink-0 flex flex-col items-center border border-slate-200 dark:border-slate-700 transition-all"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center pb-3.5 mb-4 border-b border-gray-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">Mã QR Thiết Bị</h3>
              </div>
              <button 
                onClick={() => setViewQrAsset(null)} 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-white p-3.5 border-2 border-slate-100 dark:border-slate-600 rounded-2xl shadow-sm flex items-center justify-center mb-5">
              <QRCodeSVG 
                value={`Tên TB: ${viewQrAsset.name}
Mã QR: ${viewQrAsset.assetTag}
Kho: ${warehouses.find(w => w.id === categories.find(c => c.id === viewQrAsset.categoryId)?.warehouseId)?.name || '-'}
Danh mục: ${categories.find(c => c.id === viewQrAsset.categoryId)?.name || '-'}
Serial: ${viewQrAsset.serial || '-'}
Ký hiệu: ${viewQrAsset.kyHieu || '-'}
Hãng SX: ${viewQrAsset.manufacturer || '-'}
Năm SX: ${viewQrAsset.manufactureYear || '-'}
Trạng thái: ${['','Rảnh','Đang sử dụng','Bảo trì','Hỏng'][getEffectiveStatus(viewQrAsset)] || 'Khác'}`}
                size={230} 
                level="M" 
                includeMargin={true} 
              />
            </div>
            
            <div className="text-center space-y-1.5 w-full px-2">
              <p className="font-bold text-gray-900 dark:text-white text-base leading-snug break-words">
                {viewQrAsset.name}
              </p>
              <div className="flex justify-center">
                <span className="text-blue-600 dark:text-blue-400 font-mono font-bold text-xs tracking-wider bg-blue-50 dark:bg-blue-950/50 py-1 px-3 rounded-full border border-blue-100 dark:border-blue-900/50">
                  {viewQrAsset.assetTag}
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => setViewQrAsset(null)}
              className="mt-6 w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all text-sm active:scale-98"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetList;
