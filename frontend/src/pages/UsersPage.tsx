import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { Pagination } from '../components/Pagination';
import { 
  Building2, 
  Users as UsersIcon, 
  UserPlus, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Key, 
  Lock, 
  Check, 
  AlertTriangle, 
  Building,
  Download,
  Upload,
  UserCheck,
  X,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { UserPermissionsTab } from '../components/UserPermissionsTab';

type RoleId = 1 | 2 | 3;
const ROLE_LABELS: Record<RoleId, string> = { 1: 'Quản trị', 2: 'Quản lý', 3: 'Người dùng' };
const ROLE_COLORS: Record<RoleId, string> = {
  1: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  2: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  3: 'bg-slate-700/40 text-slate-300 border border-slate-600/50',
};

// 36 Khoa, Phòng, Ban chính thức Bệnh viện Quân y 87
export const DEFAULT_DEPARTMENTS = [
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

type DepartmentItem = {
  id: number;
  name: string;
  userCount?: number;
};

type UserItem = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  roleId: RoleId;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  departmentId?: number | null;
  departmentName?: string | null;
};

type FormState = {
  username: string;
  fullName: string;
  email: string;
  password: string;
  roleId: RoleId;
  isActive: boolean;
  departmentId: number | null;
};

const EMPTY_FORM: FormState = {
  username: '',
  fullName: '',
  email: '',
  password: '',
  roleId: 3,
  isActive: true,
  departmentId: null,
};

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab: Khoa Phòng | Nhân sự | Phân quyền người dùng
  const [activeTab, setActiveTab] = useState<'departments' | 'users' | 'permissions'>('departments');
  const [permissionUserId, setPermissionUserId] = useState<number | null>(null);

  // Danh sách users & departments
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_DEP_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= DEFAULT_DEPARTMENTS.length) return parsed;
      }
    } catch {}
    return DEFAULT_DEPARTMENTS;
  });

  const [loading, setLoading] = useState(true);
  const [depLoading, setDepLoading] = useState(false);

  // Tìm kiếm
  const [userSearch, setUserSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');

  // Phân trang chuẩn giống Tài sản & Thiết bị
  const [deptPage, setDeptPage] = useState<number>(1);
  const [deptPageSize, setDeptPageSize] = useState<number>(20);
  const [userPage, setUserPage] = useState<number>(1);
  const [userPageSize, setUserPageSize] = useState<number>(20);

  // Modal User
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Thông báo toast
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Password
  const [resetPwdUserId, setResetPwdUserId] = useState<number | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [changePwdModal, setChangePwdModal] = useState(false);
  const [changePwdForm, setChangePwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  // Modal Khoa Phòng
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editDept, setEditDept] = useState<DepartmentItem | null>(null);
  const [deptNameInput, setDeptNameInput] = useState('');
  const [deptSaving, setDeptSaving] = useState(false);
  const [deleteDeptConfirm, setDeleteDeptConfirm] = useState<DepartmentItem | null>(null);

  // Modal xem danh sách nhân sự của 1 Khoa Phòng
  const [viewDeptStaff, setViewDeptStaff] = useState<DepartmentItem | null>(null);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  // Nạp danh sách Khoa Phòng
  const notifyDepartmentsChanged = (newDepts: DepartmentItem[]) => {
    try {
      localStorage.setItem(LOCAL_DEP_KEY, JSON.stringify(newDepts));
      window.dispatchEvent(new CustomEvent('departmentsUpdated', { detail: newDepts }));
      window.dispatchEvent(new Event('departmentsChanged'));
    } catch (err) {
      console.error('Lỗi thông báo đồng bộ khoa phòng', err);
    }
  };

  const fetchDepartments = useCallback(async () => {
    setDepLoading(true);
    try {
      const res = await api.get('/departments');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setDepartments(res.data);
        notifyDepartmentsChanged(res.data);
      }
    } catch {
      try {
        const cached = localStorage.getItem(LOCAL_DEP_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length >= DEFAULT_DEPARTMENTS.length) setDepartments(parsed);
          else setDepartments(DEFAULT_DEPARTMENTS);
        } else setDepartments(DEFAULT_DEPARTMENTS);
      } catch {
        setDepartments(DEFAULT_DEPARTMENTS);
      }
    } finally {
      setDepLoading(false);
    }
  }, []);

  // Nạp danh sách Users và đồng bộ DepartmentId
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      const rawUsers: UserItem[] = res.data || [];
      
      // Đồng bộ từ local mapping dự phòng
      let localMap: Record<number, number> = {};
      try {
        localMap = JSON.parse(localStorage.getItem(LOCAL_USER_DEP_MAP_KEY) || '{}');
      } catch {}

      const synced = rawUsers.map(u => {
        let depId = u.departmentId;
        if (!depId && localMap[u.id]) {
          depId = localMap[u.id];
        }
        return {
          ...u,
          departmentId: depId ?? null,
        };
      });

      setUsers(synced);
    } catch {
      showMsg('error', 'Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, [fetchUsers, fetchDepartments]);

  // Tạo map id -> tên khoa phòng
  const depMap = useMemo(() => {
    const map = new Map<number, string>();
    departments.forEach(d => map.set(d.id, d.name));
    return map;
  }, [departments]);

  // Đếm số lượng nhân sự theo từng khoa phòng
  const staffCountPerDept = useMemo(() => {
    const counts: Record<number, number> = {};
    users.forEach(u => {
      if (u.departmentId) {
        counts[u.departmentId] = (counts[u.departmentId] || 0) + 1;
      }
    });
    return counts;
  }, [users]);

  // Bộ lọc tìm kiếm Users
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(u => 
      u.username.toLowerCase().includes(q) ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.departmentName && u.departmentName.toLowerCase().includes(q)) ||
      (u.departmentId && depMap.get(u.departmentId)?.toLowerCase().includes(q))
    );
  }, [users, userSearch, depMap]);

  // Bộ lọc tìm kiếm Khoa Phòng
  const filteredDepartments = useMemo(() => {
    if (!deptSearch.trim()) return departments;
    const q = deptSearch.toLowerCase();
    return departments.filter(d => d.name.toLowerCase().includes(q));
  }, [departments, deptSearch]);

  // Tự động về trang 1 khi tìm kiếm
  useEffect(() => {
    setDeptPage(1);
  }, [deptSearch]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch]);

  // Phân trang danh mục Khoa Phòng
  const paginatedDepartments = useMemo(() => {
    const start = (deptPage - 1) * deptPageSize;
    return filteredDepartments.slice(start, start + deptPageSize);
  }, [filteredDepartments, deptPage, deptPageSize]);

  // Phân trang danh sách Tài khoản / Nhân sự
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, userPage, userPageSize]);

  // Mở modal tạo user
  const openCreateUser = () => {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  // Mở modal sửa user
  const openEditUser = (u: UserItem) => {
    setEditUser(u);
    setForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      password: '',
      roleId: u.roleId,
      isActive: u.isActive,
      departmentId: u.departmentId ?? null,
    });
    setShowForm(true);
  };

  // Lưu User (Thêm / Sửa) và cập nhật ngay lập tức cột Nhân sự
  const handleSaveUser = async () => {
    if (!form.username.trim() || !form.fullName.trim()) {
      showMsg('error', 'Vui lòng nhập đầy đủ Tên đăng nhập và Họ tên.');
      return;
    }
    if (!editUser && !form.password.trim()) {
      showMsg('error', 'Vui lòng nhập mật khẩu cho tài khoản mới.');
      return;
    }
    setSaving(true);
    try {
      const selectedDepId = form.departmentId ? Number(form.departmentId) : null;
      const selectedDepName = selectedDepId ? depMap.get(selectedDepId) || null : null;

      if (editUser) {
        // Cập nhật user
        await api.put(`/users/${editUser.id}`, {
          fullName: form.fullName,
          email: form.email,
          roleId: form.roleId,
          isActive: form.isActive,
          departmentId: selectedDepId,
        });

        // Cập nhật mapping local storage
        try {
          const localMap = JSON.parse(localStorage.getItem(LOCAL_USER_DEP_MAP_KEY) || '{}');
          if (selectedDepId) localMap[editUser.id] = selectedDepId;
          else delete localMap[editUser.id];
          localStorage.setItem(LOCAL_USER_DEP_MAP_KEY, JSON.stringify(localMap));
        } catch {}

        // Cập nhật state users trực tiếp
        setUsers(prev => prev.map(u => u.id === editUser.id ? {
          ...u,
          fullName: form.fullName,
          email: form.email,
          roleId: form.roleId,
          isActive: form.isActive,
          departmentId: selectedDepId,
          departmentName: selectedDepName,
        } : u));

        showMsg('success', 'Đã cập nhật tài khoản và phân bổ khoa phòng thành công.');
      } else {
        // Tạo user mới
        const res = await api.post('/users', {
          ...form,
          departmentId: selectedDepId,
        });
        const newUserId = res?.data?.id || Date.now();

        // Cập nhật mapping local storage
        if (selectedDepId) {
          try {
            const localMap = JSON.parse(localStorage.getItem(LOCAL_USER_DEP_MAP_KEY) || '{}');
            localMap[newUserId] = selectedDepId;
            localStorage.setItem(LOCAL_USER_DEP_MAP_KEY, JSON.stringify(localMap));
          } catch {}
        }

        // Cập nhật state users
        const newUserItem: UserItem = {
          id: newUserId,
          username: form.username.trim(),
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          roleId: form.roleId,
          isActive: form.isActive,
          lastLoginAt: null,
          createdAt: new Date().toISOString(),
          departmentId: selectedDepId,
          departmentName: selectedDepName,
        };
        setUsers(prev => [newUserItem, ...prev]);

        showMsg('success', `Đã tạo tài khoản "${form.username}" và gán vào khoa phòng thành công.`);
      }
      setShowForm(false);
      await fetchUsers();
    } catch (err: any) {
      showMsg('error', err?.response?.data?.message || 'Lỗi lưu tài khoản.');
    } finally {
      setSaving(false);
    }
  };

  // Reset Password
  const handleResetPassword = async () => {
    if (!newPwd.trim() || newPwd.length < 6) {
      showMsg('error', 'Mật khẩu mới phải ít nhất 6 ký tự.');
      return;
    }
    try {
      await api.post(`/users/${resetPwdUserId}/reset-password`, { newPassword: newPwd });
      showMsg('success', 'Đã đặt lại mật khẩu thành công.');
      setResetPwdUserId(null);
      setNewPwd('');
    } catch (err: any) {
      showMsg('error', err?.response?.data?.message || 'Lỗi đặt lại mật khẩu.');
    }
  };

  // Đổi mật khẩu cá nhân
  const handleChangeMyPassword = async () => {
    if (changePwdForm.newPassword !== changePwdForm.confirmPassword) {
      showMsg('error', 'Mật khẩu mới không khớp.');
      return;
    }
    if (changePwdForm.newPassword.length < 6) {
      showMsg('error', 'Mật khẩu mới phải ít nhất 6 ký tự.');
      return;
    }
    try {
      await api.post('/auth/change-password', {
        oldPassword: changePwdForm.oldPassword,
        newPassword: changePwdForm.newPassword,
      });
      showMsg('success', 'Đã đổi mật khẩu thành công.');
      setChangePwdModal(false);
      setChangePwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showMsg('error', err?.response?.data?.message || 'Lỗi đổi mật khẩu.');
    }
  };

  // Mở modal tạo khoa phòng
  const openCreateDept = () => {
    setEditDept(null);
    setDeptNameInput('');
    setShowDeptModal(true);
  };

  // Mở modal sửa khoa phòng
  const openEditDept = (d: DepartmentItem) => {
    setEditDept(d);
    setDeptNameInput(d.name);
    setShowDeptModal(true);
  };

  // Lưu khoa phòng (Thêm / Sửa)
  const handleSaveDepartment = async () => {
    const trimmed = deptNameInput.trim();
    if (!trimmed) {
      showMsg('error', 'Tên khoa phòng không được để trống.');
      return;
    }

    setDeptSaving(true);
    try {
      if (editDept) {
        try {
          await api.put(`/departments/${editDept.id}`, { name: trimmed });
        } catch {}
        setDepartments(prev => {
          const updated = prev.map(d => d.id === editDept.id ? { ...d, name: trimmed } : d);
          notifyDepartmentsChanged(updated);
          return updated;
        });
        showMsg('success', `Đã cập nhật khoa phòng "${trimmed}".`);
      } else {
        let newId = Date.now();
        try {
          const res = await api.post('/departments', { name: trimmed });
          if (res?.data?.id) newId = res.data.id;
        } catch {
          newId = (Math.max(...departments.map(d => d.id), 0) || 0) + 1;
        }
        const newDept = { id: newId, name: trimmed, userCount: 0 };
        setDepartments(prev => {
          const updated = [...prev, newDept];
          notifyDepartmentsChanged(updated);
          return updated;
        });
        showMsg('success', `Đã thêm khoa phòng "${trimmed}".`);
      }
      setShowDeptModal(false);
      fetchDepartments();
    } catch (err: any) {
      showMsg('error', err?.response?.data?.message || 'Lỗi khi lưu khoa phòng.');
    } finally {
      setDeptSaving(false);
    }
  };

  // Xóa khoa phòng
  const handleDeleteDepartment = async () => {
    if (!deleteDeptConfirm) return;
    const target = deleteDeptConfirm;
    const count = staffCountPerDept[target.id] || 0;
    if (count > 0) {
      showMsg('error', `Khoa phòng "${target.name}" đang có ${count} nhân sự trực thuộc. Không thể xóa!`);
      setDeleteDeptConfirm(null);
      return;
    }

    try {
      try {
        await api.delete(`/departments/${target.id}`);
      } catch {}
      setDepartments(prev => {
        const updated = prev.filter(d => d.id !== target.id);
        notifyDepartmentsChanged(updated);
        return updated;
      });
      showMsg('success', `Đã xóa khoa phòng "${target.name}".`);
      setDeleteDeptConfirm(null);
      fetchDepartments();
    } catch (err: any) {
      showMsg('error', err?.response?.data?.message || 'Lỗi xóa khoa phòng.');
    }
  };

  // Tải file mẫu Excel
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'STT': 1,
        'Tên Khoa / Phòng / Ban (*)': 'Khoa Hồi sức tích cực - Chống độc',
        'Ghi chú / Đơn vị': 'Bệnh viện Quân y 87',
      },
      {
        'STT': 2,
        'Tên Khoa / Phòng / Ban (*)': 'Khoa Khám bệnh',
        'Ghi chú / Đơn vị': 'Bệnh viện Quân y 87',
      },
      {
        'STT': 3,
        'Tên Khoa / Phòng / Ban (*)': 'Khoa Răng - Hàm - Mặt',
        'Ghi chú / Đơn vị': 'Bệnh viện Quân y 87',
      },
      {
        'STT': 4,
        'Tên Khoa / Phòng / Ban (*)': 'Khoa Mắt',
        'Ghi chú / Đơn vị': 'Bệnh viện Quân y 87',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [{ wch: 8 }, { wch: 42 }, { wch: 28 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_Khoa_Phong');
    XLSX.writeFile(workbook, 'Mau_Import_Khoa_Phong.xlsx');
  };

  // Import Excel Khoa phòng
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          showMsg('error', 'File Excel không có dữ liệu hoặc định dạng không hợp lệ.');
          return;
        }

        const existingNames = new Set(departments.map(d => d.name.trim().toLowerCase()));
        const newNames: string[] = [];
        let skippedCount = 0;

        data.forEach(row => {
          const rawName = 
            row['Tên Khoa / Phòng / Ban (*)'] ||
            row['Tên Khoa / Phòng / Ban'] ||
            row['Tên Khoa Phòng'] ||
            row['Khoa Phòng'] ||
            row['Khoa / Phòng'] ||
            row['Ten Khoa Phong'] ||
            row['Department'] ||
            row['Name'] ||
            Object.values(row)[1] ||
            Object.values(row)[0];

          if (rawName && typeof rawName === 'string' && rawName.trim()) {
            const clean = rawName.trim();
            if (existingNames.has(clean.toLowerCase())) {
              skippedCount++;
            } else {
              existingNames.add(clean.toLowerCase());
              newNames.push(clean);
            }
          }
        });

        if (newNames.length === 0) {
          if (skippedCount > 0) {
            showMsg('error', `Tất cả ${skippedCount} khoa phòng trong file Excel đã tồn tại trên hệ thống.`);
          } else {
            showMsg('error', 'Không tìm thấy cột tên khoa phòng hợp lệ trong file Excel.');
          }
          return;
        }

        let addedCount = 0;
        let nextId = (Math.max(...departments.map(d => d.id), 0) || 0) + 1;
        const addedDepts: DepartmentItem[] = [];

        for (const name of newNames) {
          try {
            const res = await api.post('/departments', { name });
            const id = res?.data?.id || nextId++;
            addedDepts.push({ id, name, userCount: 0 });
            addedCount++;
          } catch {
            addedDepts.push({ id: nextId++, name, userCount: 0 });
            addedCount++;
          }
        }

        const updated = [...departments, ...addedDepts];
        setDepartments(updated);
        notifyDepartmentsChanged(updated);

        showMsg('success', `Đã import thành công ${addedCount} khoa phòng mới${skippedCount > 0 ? ` (bỏ qua ${skippedCount} khoa phòng trùng lặp)` : ''}.`);
        fetchDepartments();
      } catch (err) {
        showMsg('error', 'Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file.');
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Danh sách nhân sự của khoa phòng đang xem chi tiết
  const currentDeptStaffList = useMemo(() => {
    if (!viewDeptStaff) return [];
    return users.filter(u => u.departmentId === viewDeptStaff.id);
  }, [viewDeptStaff, users]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalDepts = departments.length;
    const totalUsers = users.length;
    const assignedUsers = users.filter(u => u.departmentId).length;
    
    // Top department with most users
    let maxCount = 0;
    let topDeptName = 'Chưa có';
    departments.forEach(d => {
      const c = staffCountPerDept[d.id] || 0;
      if (c > maxCount) {
        maxCount = c;
        topDeptName = d.name;
      }
    });

    return { totalDepts, totalUsers, assignedUsers, topDeptName, maxCount };
  }, [departments, users, staffCountPerDept]);

  return (
    <div className="space-y-6">
      {/* 1. MODULE HEADER BANNER SQUIRCLE GRADIENT */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c142c] via-[#0f1b3d] to-[#0c142c] border border-blue-500/20 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-600 to-red-500 flex items-center justify-center shadow-lg shadow-rose-500/30 ring-1 ring-white/20 shrink-0">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Quản lý Khoa Phòng & Nhân sự
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Bệnh viện Quân y 87
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400 font-medium">
                Quản lý danh mục 36 Khoa, Phòng, Ban trực thuộc, điều phối quân số nhân sự và quản trị tài khoản hệ thống
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Đổi mật khẩu của tôi */}
            <button
              onClick={() => setChangePwdModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 transition-all font-semibold text-sm flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              title="Đổi mật khẩu tài khoản cá nhân"
            >
              <Key className="w-4 h-4 text-amber-400" />
              <span>Đổi mật khẩu</span>
            </button>

            {/* Các nút tại Tab KHOA PHÒNG */}
            {activeTab === 'departments' && (
              <>
                <button
                  onClick={handleDownloadTemplate}
                  title="Tải file Excel mẫu để nhập danh sách khoa phòng"
                  className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-emerald-300 hover:text-white border border-emerald-500/30 transition-all font-semibold text-sm flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Mẫu Import</span>
                </button>

                <label
                  title="Tải lên file Excel để thêm nhiều khoa phòng cùng lúc"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95 border border-emerald-400/30"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import Excel</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleImportExcel}
                    className="hidden"
                  />
                </label>

                {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                  <button
                    onClick={openCreateDept}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer active:scale-95 border border-cyan-300/30"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Thêm Khoa Phòng</span>
                  </button>
                )}
              </>
            )}

            {/* Các nút tại Tab TÀI KHOẢN */}
            {activeTab === 'users' && currentUser?.role === 'Admin' && (
              <button
                onClick={openCreateUser}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-pink-600 to-red-500 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-rose-500/25 transition-all cursor-pointer active:scale-95 border border-rose-300/30"
              >
                <UserPlus className="w-4 h-4" />
                <span>Thêm Tài Khoản</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. CỤM 4 THẺ KPI SQUIRCLE GRADIENT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Khoa Phòng */}
        <div 
          onClick={() => setActiveTab('departments')}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 shadow-lg ${
            activeTab === 'departments'
              ? 'bg-gradient-to-br from-blue-900/60 to-indigo-950/80 border-blue-400 ring-2 ring-blue-500/30 shadow-blue-500/20'
              : 'bg-[#0c142c]/90 hover:bg-[#0f1b3d] border-blue-500/20 hover:border-blue-400/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">Khoa Phòng & Ban</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-cyan-400">{stats.totalDepts}</span>
                <span className="text-xs text-slate-400">đơn vị</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">36 Khoa, Phòng, Ban chính thức</p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Danh mục đơn vị</span>
            <span className="text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">Xem chi tiết →</span>
          </div>
        </div>

        {/* KPI 2: Tổng nhân sự */}
        <div 
          onClick={() => setActiveTab('users')}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 shadow-lg ${
            activeTab === 'users'
              ? 'bg-gradient-to-br from-rose-900/60 to-pink-950/80 border-rose-400 ring-2 ring-rose-500/30 shadow-rose-500/20'
              : 'bg-[#0c142c]/90 hover:bg-[#0f1b3d] border-rose-500/20 hover:border-rose-400/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-300/80">Tài khoản & Nhân sự</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-rose-400">{stats.totalUsers}</span>
                <span className="text-xs text-slate-400">tài khoản</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">Đăng nhập & phân quyền</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 group-hover:scale-110 transition-transform">
              <UsersIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Danh sách nhân sự</span>
            <span className="text-rose-400 font-bold group-hover:translate-x-0.5 transition-transform">Xem chi tiết →</span>
          </div>
        </div>

        {/* KPI 3: Đã phân khoa */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-500/20 bg-[#0c142c]/90 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">Đã gán Khoa Phòng</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-emerald-400">{stats.assignedUsers}</span>
                <span className="text-xs text-slate-400">/ {stats.totalUsers} nhân sự</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">
                Tỷ lệ gán: <span className="font-bold text-white">{stats.totalUsers > 0 ? Math.round((stats.assignedUsers / stats.totalUsers) * 100) : 0}%</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Độ phủ đơn vị</span>
            <span className="text-emerald-400 font-medium">Hoàn tất</span>
          </div>
        </div>

        {/* KPI 4: Phân quyền chức năng */}
        <div 
          onClick={() => setActiveTab('permissions')}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 shadow-lg ${
            activeTab === 'permissions'
              ? 'bg-gradient-to-br from-purple-900/60 to-indigo-950/80 border-purple-400 ring-2 ring-purple-500/30 shadow-purple-500/20'
              : 'bg-[#0c142c]/90 hover:bg-[#0f1b3d] border-purple-500/20 hover:border-purple-400/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-300/80">Phân quyền người dùng</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-purple-400">11+</span>
                <span className="text-xs text-slate-400">chức năng</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2">
                Xem, Thêm, Sửa, Xóa, Xuất file
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Ma trận phân quyền</span>
            <span className="text-purple-400 font-bold group-hover:translate-x-0.5 transition-transform">Thiết lập →</span>
          </div>
        </div>
      </div>

      {/* Toast thông báo */}
      {msg && (
        <div
          className={`px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-3 backdrop-blur-xl border animate-in fade-in duration-200 shadow-xl ${
            msg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}
        >
          {msg.type === 'success' ? <Check className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* 3. TOOLBAR CONTROLS & TAB SEGMENTED PILLS */}
      <div className="rounded-2xl bg-[#0c142c]/90 border border-blue-500/20 p-4 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Tab Switcher Pills */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-900/90 border border-slate-700/80 w-fit flex-wrap gap-1">
          <button 
            onClick={() => setActiveTab('departments')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'departments' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Danh mục Khoa Phòng ({departments.length})</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'users' 
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            <span>Danh sách Nhân sự ({users.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('permissions')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'permissions' 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Phân quyền người dùng</span>
          </button>
        </div>

        {/* Search Input - Chỉ hiện khi ở tab Khoa phòng hoặc Nhân sự */}
        {activeTab !== 'permissions' && (
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              type="text"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900/80 text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm font-medium"
              placeholder={activeTab === 'departments' ? "Tìm kiếm khoa phòng theo tên..." : "Tìm tài khoản, họ tên, email, khoa phòng..."}
              value={activeTab === 'departments' ? deptSearch : userSearch}
              onChange={e => activeTab === 'departments' ? setDeptSearch(e.target.value) : setUserSearch(e.target.value)}
            />
            {(activeTab === 'departments' ? deptSearch : userSearch) && (
              <button 
                onClick={() => activeTab === 'departments' ? setDeptSearch('') : setUserSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. NỘI DUNG TỪNG TAB */}
      {activeTab === 'permissions' ? (
        <UserPermissionsTab initialUserId={permissionUserId} usersList={users} />
      ) : (
        <div className="rounded-3xl bg-[#0c142c]/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto min-h-[380px]">
          {activeTab === 'departments' ? (
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-blue-950/70 border-b border-blue-500/20 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-16 text-center">STT</th>
                  <th className="px-6 py-4">Tên Khoa / Phòng / Ban</th>
                  <th className="px-6 py-4 text-center">Quân số Nhân sự</th>
                  <th className="px-6 py-4">Đơn vị chủ quản</th>
                  {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {depLoading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-slate-300">Đang tải danh sách khoa phòng...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                          <Building2 className="w-8 h-8 text-cyan-400" />
                        </div>
                        <p className="text-base font-bold text-slate-200">Không tìm thấy khoa phòng nào phù hợp</p>
                        <p className="text-xs text-slate-400 mt-1 text-center">
                          {deptSearch ? 'Thử thay đổi từ khóa tìm kiếm.' : 'Bấm nút "+ Thêm Khoa Phòng" để bắt đầu thiết lập.'}
                        </p>
                        {deptSearch && (
                          <button
                            onClick={() => setDeptSearch('')}
                            className="mt-4 px-4 py-2 text-xs font-semibold text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/50 rounded-xl transition-colors border border-cyan-500/30 cursor-pointer shadow-sm"
                          >
                            Xóa từ khóa tìm kiếm
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedDepartments.map((d, index) => {
                    const count = staffCountPerDept[d.id] || 0;
                    const stt = (deptPage - 1) * deptPageSize + index + 1;
                    return (
                      <tr key={d.id} className="hover:bg-blue-600/10 transition-colors">
                        <td className="px-6 py-4 text-center font-bold text-slate-400 font-mono">
                          {stt}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                              <Building className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-slate-100 text-sm">
                              {d.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => setViewDeptStaff(d)}
                            title={count > 0 ? 'Bấm để xem danh sách nhân sự thuộc khoa này' : 'Chưa có nhân sự được gán'}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              count > 0 
                                ? 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 shadow-sm' 
                                : 'bg-slate-800/80 text-slate-400 border border-slate-700'
                            }`}
                          >
                            <UsersIcon className="w-3.5 h-3.5" />
                            <span>{count} nhân sự</span>
                            {count > 0 && <ExternalLink className="w-3 h-3 opacity-60" />}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-slate-300 text-xs font-medium">
                          Bệnh viện Quân y 87
                        </td>
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditDept(d)}
                                title="Sửa tên khoa phòng"
                                className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Sửa</span>
                              </button>
                              {currentUser?.role === 'Admin' && (
                                <button
                                  onClick={() => setDeleteDeptConfirm(d)}
                                  title="Xóa khoa phòng"
                                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa</span>
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gradient-to-r from-rose-950/70 via-slate-900/90 to-rose-950/70 border-b border-rose-500/20 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-6 py-4">Tài khoản</th>
                  <th className="px-6 py-4">Họ và tên</th>
                  <th className="px-6 py-4">Khoa phòng trực thuộc</th>
                  <th className="px-6 py-4">Vai trò</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Đăng nhập gần nhất</th>
                  {currentUser?.role === 'Admin' && <th className="px-6 py-4 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-3 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-slate-300">Đang tải dữ liệu tài khoản...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                          <UsersIcon className="w-8 h-8 text-rose-400" />
                        </div>
                        <p className="text-base font-bold text-slate-200">Không tìm thấy tài khoản nào phù hợp</p>
                        <p className="text-xs text-slate-400 mt-1 text-center">
                          {userSearch ? 'Thử thay đổi từ khóa tìm kiếm.' : 'Bấm nút "+ Thêm Tài Khoản" để cấp mới người dùng.'}
                        </p>
                        {userSearch && (
                          <button
                            onClick={() => setUserSearch('')}
                            className="mt-4 px-4 py-2 text-xs font-semibold text-rose-400 bg-rose-950/40 hover:bg-rose-900/50 rounded-xl transition-colors border border-rose-500/30 cursor-pointer shadow-sm"
                          >
                            Xóa từ khóa tìm kiếm
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map(u => {
                    const deptName = u.departmentName || (u.departmentId ? depMap.get(u.departmentId) : null);
                    return (
                      <tr key={u.id} className="hover:bg-rose-600/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500/20 to-pink-500/20 border border-rose-500/30 text-rose-300 flex items-center justify-center font-bold text-sm shrink-0">
                              {u.fullName ? u.fullName.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-100 leading-tight">{u.username}</p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{u.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-200">
                          {u.fullName || '—'}
                        </td>
                        <td className="px-6 py-4">
                          {deptName ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/90 text-cyan-300 border border-cyan-500/30">
                              <Building className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span>{deptName}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Chưa phân khoa</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[u.roleId]}`}>
                            {ROLE_LABELS[u.roleId]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            u.isActive
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                            <span>{u.isActive ? 'Hoạt động' : 'Vô hiệu'}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                        </td>
                        {currentUser?.role === 'Admin' && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditUser(u)}
                                title="Chỉnh sửa thông tin"
                                className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Sửa</span>
                              </button>
                              <button
                                onClick={() => { setResetPwdUserId(u.id); setNewPwd(''); }}
                                title="Đặt lại mật khẩu"
                                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <Key className="w-3.5 h-3.5" />
                                <span>Reset pass</span>
                              </button>
                              <button
                                onClick={() => { setPermissionUserId(u.id); setActiveTab('permissions'); }}
                                title="Phân quyền chi tiết cho tài khoản này"
                                className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Phân quyền</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination - Thanh điều hướng trang chuẩn giống Tài sản & Thiết bị */}
        {activeTab === 'departments' && filteredDepartments.length > 0 && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
            <Pagination
              currentPage={deptPage}
              totalItems={filteredDepartments.length}
              pageSize={deptPageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageChange={(page) => setDeptPage(page)}
              onPageSizeChange={(size) => {
                setDeptPageSize(size);
                setDeptPage(1);
              }}
            />
          </div>
        )}

        {activeTab === 'users' && filteredUsers.length > 0 && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
            <Pagination
              currentPage={userPage}
              totalItems={filteredUsers.length}
              pageSize={userPageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageChange={(page) => setUserPage(page)}
              onPageSizeChange={(size) => {
                setUserPageSize(size);
                setUserPage(1);
              }}
            />
          </div>
        )}
      </div>
      )}

      {/* 5. MODAL XEM NHÂN SỰ CỦA KHOA PHÒNG SQUIRCLE GLASS */}
      {viewDeptStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl p-6 sm:p-7 max-w-[580px] w-full border border-blue-500/30">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {viewDeptStaff.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Danh sách cán bộ nhân sự trực thuộc khoa phòng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewDeptStaff(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {currentDeptStaffList.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <UserCheck className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-200">Chưa có tài khoản nào được gán vào khoa phòng này.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Chuyển sang tab "Danh sách nhân sự" và bấm "Sửa" trên tài khoản để phân bổ vào khoa phòng này.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {currentDeptStaffList.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center font-bold text-sm">
                        {u.fullName ? u.fullName.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{u.fullName || u.username}</p>
                        <p className="text-xs text-slate-400 font-mono">@{u.username} • {u.email || 'Chưa có email'}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[u.roleId]}`}>
                      {ROLE_LABELS[u.roleId]}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t border-slate-800/80">
              <button
                onClick={() => setViewDeptStaff(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL THÊM / SỬA USER SQUIRCLE GLASS */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl p-6 sm:p-8 max-w-[540px] w-full border border-blue-500/30">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
                  {editUser ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editUser ? 'Cập nhật thông tin tài khoản' : 'Tạo tài khoản mới'}
                  </h3>
                  <p className="text-xs text-slate-400">Phân quyền vai trò và phân bổ vào khoa phòng</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {!editUser && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Tên đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm font-mono"
                    placeholder="vd: bsy_nam"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
                  placeholder="vd: BS. Nguyễn Văn Nam"
                />
              </div>

              {/* Mục Khoa Phòng */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-cyan-400" />
                    Khoa phòng trực thuộc
                  </span>
                  <span className="text-xs font-normal text-slate-400">Chọn khoa làm việc</span>
                </label>
                <select
                  value={form.departmentId ?? ''}
                  onChange={e => setForm(f => ({ ...f, departmentId: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm cursor-pointer"
                >
                  <option value="">-- Chọn khoa / phòng / ban --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm font-mono"
                  placeholder="vd: nam.nv@bvqy87.vn"
                />
              </div>

              {!editUser && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Vai trò hệ thống
                  </label>
                  <select
                    value={form.roleId}
                    onChange={e => setForm(f => ({ ...f, roleId: +e.target.value as RoleId }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm cursor-pointer"
                  >
                    <option value={1} className="bg-slate-900 text-white">Quản trị (Admin)</option>
                    <option value={2} className="bg-slate-900 text-white">Quản lý (Manager)</option>
                    <option value={3} className="bg-slate-900 text-white">Người dùng (Staff)</option>
                  </select>
                </div>
                {editUser && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Trạng thái
                    </label>
                    <select
                      value={form.isActive ? 'true' : 'false'}
                      onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm cursor-pointer"
                    >
                      <option value="true" className="bg-slate-900 text-emerald-400">Hoạt động</option>
                      <option value="false" className="bg-slate-900 text-rose-400">Vô hiệu hóa</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-7 pt-4 border-t border-slate-800/80">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-bold rounded-xl transition-all cursor-pointer text-sm"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-60 flex items-center gap-2 cursor-pointer text-sm"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : editUser ? 'Cập nhật tài khoản' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL THÊM / SỬA KHOA PHÒNG SQUIRCLE GLASS */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl p-6 sm:p-7 max-w-[460px] w-full border border-blue-500/30">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editDept ? 'Cập nhật tên khoa phòng' : 'Thêm khoa phòng mới'}
                  </h3>
                  <p className="text-xs text-slate-400">Danh mục khoa phòng Bệnh viện Quân y 87</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeptModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Tên Khoa / Phòng / Ban <span className="text-rose-500">*</span>
                </label>
                <input
                  value={deptNameInput}
                  onChange={e => setDeptNameInput(e.target.value)}
                  placeholder="vd: Khoa Răng Hàm Mặt"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveDepartment(); }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
                />
              </div>
              <p className="text-xs text-slate-400">
                Khoa phòng mới sẽ xuất hiện trong danh sách lựa chọn khi tạo tài khoản và tạo phiếu đề nghị.
              </p>
            </div>

            <div className="flex gap-3 justify-end mt-7 pt-4 border-t border-slate-800/80">
              <button
                onClick={() => setShowDeptModal(false)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-bold rounded-xl transition-all cursor-pointer text-sm"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveDepartment}
                disabled={deptSaving}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60 flex items-center gap-2 cursor-pointer text-sm"
              >
                {deptSaving ? 'Đang lưu...' : editDept ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL XÁC NHẬN XÓA KHOA PHÒNG SQUIRCLE GLASS */}
      {deleteDeptConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl p-6 sm:p-7 max-w-[440px] w-full border border-rose-500/30">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">
              Xóa khoa phòng này?
            </h3>
            <p className="text-sm text-slate-300 text-center mb-6">
              Bạn có chắc chắn muốn xóa khoa phòng <strong className="text-rose-400 font-bold">"{deleteDeptConfirm.name}"</strong> không? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteDeptConfirm(null)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-bold rounded-xl transition-all cursor-pointer text-sm"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteDepartment}
                className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL RESET PASSWORD SQUIRCLE GLASS */}
      {resetPwdUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl p-6 sm:p-7 max-w-[420px] w-full border border-amber-500/30">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Đặt lại mật khẩu</h3>
                <p className="text-xs text-slate-400">Cấp lại mật khẩu mới cho tài khoản</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 mb-4">
              Nhập mật khẩu mới cho tài khoản người dùng này (tối thiểu 6 ký tự).
            </p>
            <input
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all text-sm mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setResetPwdUserId(null)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-bold rounded-xl transition-all cursor-pointer text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleResetPassword}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
              >
                Đặt lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL ĐỔI MẬT KHẨU CÁ NHÂN SQUIRCLE GLASS */}
      {changePwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142c] rounded-3xl shadow-2xl p-6 sm:p-7 max-w-[440px] w-full border border-blue-500/30">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-cyan-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Đổi mật khẩu của tôi</h3>
                <p className="text-xs text-slate-400">Cập nhật mật khẩu cá nhân</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Cập nhật mật khẩu đăng nhập cá nhân để bảo vệ tài khoản của bạn.
            </p>
            <div className="space-y-3.5">
              <input
                type="password"
                placeholder="Mật khẩu hiện tại"
                value={changePwdForm.oldPassword}
                onChange={e => setChangePwdForm(f => ({ ...f, oldPassword: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
              />
              <input
                type="password"
                placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                value={changePwdForm.newPassword}
                onChange={e => setChangePwdForm(f => ({ ...f, newPassword: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
              />
              <input
                type="password"
                placeholder="Xác nhận mật khẩu mới"
                value={changePwdForm.confirmPassword}
                onChange={e => setChangePwdForm(f => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
              />
            </div>
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-800/80">
              <button
                onClick={() => setChangePwdModal(false)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-bold rounded-xl transition-all cursor-pointer text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleChangeMyPassword}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/25 cursor-pointer"
              >
                Đổi mật khẩu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
