import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Save, 
  Plus, 
  CheckSquare, 
  Square, 
  Sparkles, 
  AlertCircle, 
  Trash2, 
  RefreshCw, 
  User, 
  Layers, 
  Eye, 
  FolderPlus, 
  FileEdit, 
  DownloadCloud,
  X
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../contexts/ToastContext';

interface AppModuleItem {
  id: number;
  code: string;
  name: string;
  group: string;
  description?: string;
  orderIndex: number;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
}

interface UserPermissionItem {
  moduleCode: string;
  moduleName: string;
  moduleGroup: string;
  moduleDescription?: string;
  isSystem: boolean;
  isActive: boolean;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

interface TargetUser {
  id: number;
  username: string;
  fullName: string;
  roleName: string;
  roleId: number;
}

interface UserPermissionsTabProps {
  initialUserId?: number | null;
  usersList: any[];
}

export const UserPermissionsTab = ({ initialUserId, usersList }: UserPermissionsTabProps) => {
  const { user: currentUser, refreshPermissions } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [targetUser, setTargetUser] = useState<TargetUser | null>(null);
  const [permissions, setPermissions] = useState<UserPermissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal đăng ký chức năng mới (Mở rộng theo chức năng)
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [newModuleCode, setNewModuleCode] = useState('');
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleGroup, setNewModuleGroup] = useState('Nghiệp vụ mở rộng');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [submittingModule, setSubmittingModule] = useState(false);

  // Chọn user mặc định ban đầu
  useEffect(() => {
    if (initialUserId) {
      setSelectedUserId(initialUserId);
    } else if (usersList && usersList.length > 0) {
      // Ưu tiên chọn user không phải Admin để dễ quan sát phân quyền, hoặc user đầu tiên
      const nonAdmin = usersList.find(u => u.roleId !== 1) || usersList[0];
      setSelectedUserId(nonAdmin.id);
    }
  }, [initialUserId, usersList]);

  // Load ma trận quyền khi thay đổi user được chọn
  useEffect(() => {
    if (selectedUserId) {
      loadPermissions(selectedUserId);
    }
  }, [selectedUserId]);

  const loadPermissions = async (userId: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/permissions/users/${userId}`);
      if (res.data) {
        setTargetUser(res.data.user);
        setPermissions(res.data.permissions || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Không thể tải ma trận phân quyền của người dùng.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle từng quyền cụ thể
  const handleToggle = (moduleCode: string, field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canExport') => {
    setPermissions(prev => prev.map(p => {
      if (p.moduleCode === moduleCode) {
        const nextVal = !p[field];
        const updated = { ...p, [field]: nextVal };
        // Logic phụ thuộc: nếu tắt quyền Xem thì tự động tắt các quyền Thao tác
        if (field === 'canView' && !nextVal) {
          updated.canCreate = false;
          updated.canEdit = false;
          updated.canDelete = false;
          updated.canExport = false;
        }
        // Nếu bật quyền thao tác thì tự động bật quyền Xem
        if (field !== 'canView' && nextVal) {
          updated.canView = true;
        }
        return updated;
      }
      return p;
    }));
  };

  // Toggle toàn bộ quyền của 1 hàng (Module)
  const handleToggleRow = (moduleCode: string) => {
    setPermissions(prev => prev.map(p => {
      if (p.moduleCode === moduleCode) {
        const isAll = p.canView && p.canCreate && p.canEdit && p.canDelete && p.canExport;
        return {
          ...p,
          canView: !isAll,
          canCreate: !isAll,
          canEdit: !isAll,
          canDelete: !isAll,
          canExport: !isAll,
        };
      }
      return p;
    }));
  };

  // Toggle toàn bộ bảng
  const handleSelectAll = (select: boolean) => {
    setPermissions(prev => prev.map(p => ({
      ...p,
      canView: select,
      canCreate: select,
      canEdit: select,
      canDelete: select,
      canExport: select,
    })));
  };

  // Áp dụng mẫu phân quyền nhanh từ Backend
  const handleApplyTemplate = async (templateName: string) => {
    if (!selectedUserId) return;
    try {
      await api.post(`/permissions/users/${selectedUserId}/template?template=${templateName}`);
      toast.success(`Đã áp dụng mẫu phân quyền "${templateName}" thành công!`);
      await loadPermissions(selectedUserId);
      if (currentUser?.id === selectedUserId) {
        await refreshPermissions();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Lỗi khi áp dụng mẫu phân quyền.");
    }
  };

  // Lưu phân quyền
  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      const payload = {
        permissions: permissions.map(p => ({
          moduleCode: p.moduleCode,
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
          canExport: p.canExport,
        }))
      };

      const res = await api.post(`/permissions/users/${selectedUserId}`, payload);
      toast.success(res.data?.message || "Đã lưu ma trận phân quyền thành công!");
      
      // Nếu vừa lưu quyền cho chính tài khoản đang đăng nhập, tự động refresh context
      if (currentUser?.id === selectedUserId) {
        await refreshPermissions();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Lỗi khi lưu phân quyền.");
    } finally {
      setSaving(false);
    }
  };

  // Thêm chức năng mới vào hệ thống (Mở rộng theo chức năng)
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleCode.trim() || !newModuleName.trim()) {
      toast.error("Vui lòng nhập mã chức năng và tên chức năng.");
      return;
    }
    setSubmittingModule(true);
    try {
      await api.post('/permissions/modules', {
        code: newModuleCode.trim(),
        name: newModuleName.trim(),
        group: newModuleGroup.trim() || 'Nghiệp vụ mở rộng',
        description: newModuleDesc.trim() || undefined,
      });

      toast.success(`Đã đăng ký và mở rộng chức năng "${newModuleName}" thành công!`);
      setShowAddModuleModal(false);
      setNewModuleCode('');
      setNewModuleName('');
      setNewModuleDesc('');

      // Tải lại ma trận quyền
      if (selectedUserId) {
        await loadPermissions(selectedUserId);
      }
      await refreshPermissions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Lỗi khi đăng ký chức năng mới.");
    } finally {
      setSubmittingModule(false);
    }
  };

  // Xóa chức năng mở rộng
  const handleDeleteModule = async (item: UserPermissionItem) => {
    if (item.isSystem) return;
    const confirmDel = window.confirm(`Bạn có chắc chắn muốn xóa chức năng mở rộng "${item.moduleName}" [${item.moduleCode}] khỏi hệ thống?`);
    if (!confirmDel) return;

    try {
      // Tìm id của module
      const res = await api.get('/permissions/modules');
      const found = (res.data as AppModuleItem[]).find(m => m.code === item.moduleCode);
      if (found) {
        await api.delete(`/permissions/modules/${found.id}`);
        toast.success(`Đã xóa chức năng "${item.moduleName}" thành công.`);
        if (selectedUserId) {
          await loadPermissions(selectedUserId);
        }
        await refreshPermissions();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Lỗi khi xóa chức năng.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. THANH CHỌN NGƯỜI DÙNG & TIỆN ÍCH */}
      <div className="rounded-2xl bg-[#0c142c]/90 border border-blue-500/20 p-5 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Bộ chọn người dùng */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <User className="w-4 h-4 text-purple-400" />
              Chọn tài khoản phân quyền:
            </label>
            <select
              value={selectedUserId || ''}
              onChange={e => setSelectedUserId(parseInt(e.target.value))}
              className="flex-1 max-w-md px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-semibold text-sm focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none transition-all dark:[color-scheme:dark]"
            >
              {usersList.map(u => (
                <option key={u.id} value={u.id} className="bg-slate-800 text-white">
                  👤 {u.fullName || u.username} (@{u.username}) — [{u.roleName || (u.roleId === 1 ? 'Quản trị' : u.roleId === 2 ? 'Quản lý' : 'Người dùng')}] {u.departmentName ? `• ${u.departmentName}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Nhóm nút thao tác */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Đăng ký chức năng mới (Mở rộng theo chức năng) */}
            {currentUser?.role === 'Admin' && (
              <button
                type="button"
                onClick={() => setShowAddModuleModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                title="Mở rộng thêm chức năng mới vào hệ thống phân quyền"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Đăng ký chức năng mới</span>
              </button>
            )}

            {/* Lưu phân quyền */}
            {currentUser?.role === 'Admin' && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : 'Lưu phân quyền'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Thông tin nhanh tài khoản đang chọn & Mẫu phân quyền */}
        {targetUser && (
          <div className="pt-3 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">Đang phân quyền cho:</span>
              <span className="font-bold text-white text-sm">{targetUser.fullName || targetUser.username}</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                targetUser.roleId === 1 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : targetUser.roleId === 2 
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                    : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
              }`}>
                {targetUser.roleName || (targetUser.roleId === 1 ? 'Admin' : targetUser.roleId === 2 ? 'Manager' : 'Staff')}
              </span>
              {targetUser.roleId === 1 && (
                <span className="text-amber-400 text-[11px] font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Quản trị viên mặc định sở hữu toàn quyền
                </span>
              )}
            </div>

            {/* Mẫu quyền nhanh */}
            {currentUser?.role === 'Admin' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400 mr-1">Mẫu nhanh:</span>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('full')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-950/60 text-purple-300 border border-purple-500/30 hover:border-purple-400 transition-colors text-[11px] font-semibold"
                >
                  Toàn quyền
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('manager')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-blue-950/60 text-blue-300 border border-blue-500/30 hover:border-blue-400 transition-colors text-[11px] font-semibold"
                >
                  Quản lý
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('readonly')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-950/60 text-amber-300 border border-amber-500/30 hover:border-amber-400 transition-colors text-[11px] font-semibold"
                >
                  Chỉ xem
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('staff')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors text-[11px] font-semibold"
                >
                  Nhân viên
                </button>
                <div className="h-4 w-px bg-slate-700 mx-1" />
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="px-2 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/50 text-[11px] font-semibold"
                  title="Tích chọn tất cả quyền"
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="px-2 py-1 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-500/30 hover:bg-rose-900/50 text-[11px] font-semibold"
                  title="Bỏ chọn tất cả quyền"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. BẢNG MA TRẬN PHÂN QUYỀN */}
      <div className="rounded-2xl border border-blue-500/20 bg-[#0c142c]/90 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-white text-base">Ma Trận Quyền Hạn Chi Tiết Theo Chức Năng</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
              {permissions.length} chức năng
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Tích chọn quyền tương ứng và bấm <strong className="text-purple-300">"Lưu phân quyền"</strong> để áp dụng
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-sm font-medium">Đang tải ma trận phân quyền...</p>
          </div>
        ) : permissions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="font-semibold text-white">Chưa có dữ liệu chức năng.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/70 text-slate-400 text-xs uppercase font-extrabold tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">STT</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Chức năng hệ thống</th>
                  <th className="py-3.5 px-4 text-center w-24">
                    <span className="flex items-center justify-center gap-1 text-cyan-300">
                      <Eye className="w-3.5 h-3.5" /> Xem
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center w-24">
                    <span className="flex items-center justify-center gap-1 text-emerald-300">
                      <FolderPlus className="w-3.5 h-3.5" /> Thêm
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center w-24">
                    <span className="flex items-center justify-center gap-1 text-amber-300">
                      <FileEdit className="w-3.5 h-3.5" /> Sửa
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center w-24">
                    <span className="flex items-center justify-center gap-1 text-rose-300">
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center w-24">
                    <span className="flex items-center justify-center gap-1 text-blue-300">
                      <DownloadCloud className="w-3.5 h-3.5" /> Xuất file
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center w-20">Tất cả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {permissions.map((p, idx) => {
                  const isAllRow = p.canView && p.canCreate && p.canEdit && p.canDelete && p.canExport;
                  return (
                    <tr 
                      key={p.moduleCode}
                      className="hover:bg-purple-950/20 transition-colors group"
                    >
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-500">
                        {idx + 1}
                      </td>

                      {/* Chức năng */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white group-hover:text-purple-300 transition-colors">
                                {p.moduleName}
                              </span>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {p.moduleCode}
                              </span>
                              {!p.isSystem && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Mở rộng
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                              <span className="text-slate-500">[{p.moduleGroup}]</span>
                              {p.moduleDescription && (
                                <span className="truncate max-w-sm text-slate-400 text-[11px]" title={p.moduleDescription}>
                                  • {p.moduleDescription}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Nút xóa chức năng mở rộng */}
                          {!p.isSystem && currentUser?.role === 'Admin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteModule(p)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                              title="Xóa chức năng mở rộng này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Quyền Xem */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={p.canView}
                          onChange={() => handleToggle(p.moduleCode, 'canView')}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500/30 bg-slate-800 border-slate-700 cursor-pointer accent-purple-600"
                        />
                      </td>

                      {/* Quyền Thêm */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={p.canCreate}
                          onChange={() => handleToggle(p.moduleCode, 'canCreate')}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500/30 bg-slate-800 border-slate-700 cursor-pointer accent-emerald-600"
                        />
                      </td>

                      {/* Quyền Sửa */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={p.canEdit}
                          onChange={() => handleToggle(p.moduleCode, 'canEdit')}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500/30 bg-slate-800 border-slate-700 cursor-pointer accent-amber-600"
                        />
                      </td>

                      {/* Quyền Xóa */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={p.canDelete}
                          onChange={() => handleToggle(p.moduleCode, 'canDelete')}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500/30 bg-slate-800 border-slate-700 cursor-pointer accent-rose-600"
                        />
                      </td>

                      {/* Quyền Xuất file */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={p.canExport}
                          onChange={() => handleToggle(p.moduleCode, 'canExport')}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/30 bg-slate-800 border-slate-700 cursor-pointer accent-blue-600"
                        />
                      </td>

                      {/* Chọn tất cả quyền của hàng */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleRow(p.moduleCode)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isAllRow 
                              ? 'bg-purple-600 text-white border-purple-500 shadow-sm' 
                              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
                          }`}
                          title={isAllRow ? "Bỏ chọn tất cả quyền của chức năng này" : "Chọn toàn bộ quyền của chức năng này"}
                        >
                          {isAllRow ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Phân quyền có hiệu lực tức thì sau khi bấm <strong>"Lưu phân quyền"</strong>.</span>
          </div>
          {currentUser?.role === 'Admin' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. MODAL ĐĂNG KÝ CHỨC NĂNG MỚI (MỞ RỘNG THEO CHỨC NĂNG) */}
      {showAddModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-[520px] max-w-[95vw] border border-emerald-500/30 flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">Đăng Ký Chức Năng Mới</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Mở rộng hệ thống phân quyền linh hoạt</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModuleModal(false)}
                className="text-gray-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateModule} className="space-y-4 text-sm">
              <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs text-emerald-700 dark:text-emerald-300">
                Khi bạn thêm chức năng mới tại đây, hệ thống sẽ <strong>tự động đưa chức năng này vào ma trận phân quyền</strong> để bạn cấp quyền Xem, Thêm, Sửa, Xóa cho tất cả người dùng ngay lập tức!
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Mã chức năng (Code - viết liền không dấu) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: chemical_mgmt, inventory_check, contract_mgmt..."
                  value={newModuleCode}
                  onChange={e => setNewModuleCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Dùng làm định danh duy nhất trong hệ thống và API.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Tên hiển thị chức năng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Quản lý Hóa chất xét nghiệm, Kiểm kê tài sản định kỳ..."
                  value={newModuleName}
                  onChange={e => setNewModuleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Nhóm phân loại
                </label>
                <input
                  type="text"
                  placeholder="VD: Quản lý nghiệp vụ, Báo cáo & Thống kê, Vật tư y tế..."
                  value={newModuleGroup}
                  onChange={e => setNewModuleGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Mô tả chức năng
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả phạm vi hoạt động của chức năng..."
                  value={newModuleDesc}
                  onChange={e => setNewModuleDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModuleModal(false)}
                  disabled={submittingModule}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingModule}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{submittingModule ? 'Đang thêm...' : 'Xác nhận Đăng ký'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
