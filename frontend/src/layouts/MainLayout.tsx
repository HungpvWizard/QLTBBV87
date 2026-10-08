import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  Package, 
  BarChart3, 
  FileText, 
  Warehouse, 
  MonitorCheck, 
  Users, 
  Settings, 
  ChevronRight, 
  ChevronDown, 
  ChevronsLeft, 
  ChevronsRight, 
  LogOut, 
  User,
  Calculator 
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

// Biểu tượng Logo 3D Isometric chuẩn phong cách QLTB mới
const Qltb3dLogo = () => (
  <svg 
    className="w-10 h-10 shrink-0 drop-shadow-[0_4px_14px_rgba(14,165,233,0.5)]" 
    viewBox="0 0 64 64" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Tầng 3 - Đáy (Deep Blue) */}
    <g transform="translate(0, 14)">
      <path d="M32 36L10 24L32 12L54 24L32 36Z" fill="#1e3a8a" />
      <path d="M10 24L32 36V40L10 28V24Z" fill="#0f172a" opacity="0.8" />
      <path d="M32 36L54 24V28L32 40V36Z" fill="#172554" />
    </g>
    {/* Tầng 2 - Giữa (Electric Blue) */}
    <g transform="translate(0, 7)">
      <path d="M32 36L10 24L32 12L54 24L32 36Z" fill="#0284c7" />
      <path d="M10 24L32 36V40L10 28V24Z" fill="#0369a1" />
      <path d="M32 36L54 24V28L32 40V36Z" fill="#075985" />
    </g>
    {/* Tầng 1 - Đỉnh (Bright Cyan Gradient) */}
    <g transform="translate(0, 0)">
      <path d="M32 36L10 24L32 12L54 24L32 36Z" fill="url(#qltbTopGrad)" />
      <path d="M10 24L32 36V40L10 28V24Z" fill="#0284c7" />
      <path d="M32 36L54 24V28L32 40V36Z" fill="#0369a1" />
    </g>
    <defs>
      <linearGradient id="qltbTopGrad" x1="10" y1="12" x2="54" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8" />
        <stop offset="1" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
  </svg>
);

const MainLayout = () => {
  const { user, logout, canView, canCreate } = useAuth();
  const location = useLocation();
  const [dueTickets, setDueTickets] = useState<any[]>([]); // Contains both maintenance tickets and repair requests
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Profile menu state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Theme toggle state
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  // Sidebar collapse toggle state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleSidebarCollapse = () => {
    const next = !isSidebarCollapsed;
    setIsSidebarCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  useEffect(() => {
    const handleThemeChange = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    window.dispatchEvent(new Event('themeChanged'));
  };

  // Real-time clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Weather state
  const [weather, setWeather] = useState<{
    temp: string;
    description: string;
    icon: string;
    iconColor: string;
    city: string;
  }>({
    temp: '26°C',
    description: 'Nắng nhẹ',
    icon: 'wb_sunny',
    iconColor: 'text-amber-500',
    city: 'Khánh Hòa'
  });

  // Ticking clock every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Weather fetching with caching
  useEffect(() => {
    const parseWmo = (code: number, isDay: boolean) => {
      switch (code) {
        case 0:
          return { desc: 'Trời quang đãng', icon: isDay ? 'wb_sunny' : 'bedtime', color: isDay ? 'text-amber-500' : 'text-indigo-400' };
        case 1:
        case 2:
          return { desc: 'Ít mây, trời đẹp', icon: isDay ? 'partly_cloudy_day' : 'nights_stay', color: isDay ? 'text-amber-400' : 'text-indigo-300' };
        case 3:
          return { desc: 'Nhiều mây, râm mát', icon: 'cloud', color: 'text-sky-400' };
        case 45:
        case 48:
          return { desc: 'Có sương mù', icon: 'foggy', color: 'text-slate-400' };
        case 51:
        case 53:
        case 55:
          return { desc: 'Mưa phùn nhẹ', icon: 'grain', color: 'text-blue-400' };
        case 61:
        case 63:
        case 65:
          return { desc: 'Mưa rào', icon: 'rainy', color: 'text-blue-500' };
        case 80:
        case 81:
        case 82:
          return { desc: 'Mưa rải rác', icon: 'rainy', color: 'text-blue-600' };
        case 95:
        case 96:
        case 99:
          return { desc: 'Có dông sét', icon: 'thunderstorm', color: 'text-purple-500' };
        default:
          return { desc: 'Nắng nhẹ', icon: 'wb_sunny', color: 'text-amber-500' };
      }
    };

    const fetchWeatherData = async (lat: number, lon: number, cityName: string) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,is_day,weather_code&timezone=auto`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.current) {
          const w = parseWmo(data.current.weather_code, data.current.is_day === 1);
          const weatherObj = {
            temp: `${Math.round(data.current.temperature_2m)}°C`,
            description: w.desc,
            icon: w.icon,
            iconColor: w.color,
            city: cityName
          };
          setWeather(weatherObj);
          localStorage.setItem('cached_weather', JSON.stringify({ data: weatherObj, time: Date.now() }));
        }
      } catch (err) {
        console.warn('Weather fetch failed, using fallback/cache', err);
      }
    };

    // Check cache (valid for 20 mins)
    const cached = localStorage.getItem('cached_weather');
    if (cached) {
      try {
        const { data, time } = JSON.parse(cached);
        if (data?.city === 'Khánh Hòa' && Date.now() - time < 20 * 60 * 1000) {
          setWeather(data);
          return;
        }
      } catch (e) {}
    }

    // Luôn lấy thời tiết thực tế cho Khánh Hòa (Tọa độ: 12.2388, 109.1967)
    fetchWeatherData(12.2388, 109.1967, 'Khánh Hòa');
  }, []);

  useEffect(() => {
    // Notification & Profile click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [activeRepairCount, setActiveRepairCount] = useState<number>(0);
  const [dueMaintCount, setDueMaintCount] = useState<number>(0);

  useEffect(() => {
    fetchDueTickets();
    const interval = setInterval(fetchDueTickets, 30 * 1000);
    window.addEventListener('repairRequestsChanged', fetchDueTickets);
    return () => {
      clearInterval(interval);
      window.removeEventListener('repairRequestsChanged', fetchDueTickets);
    };
  }, [location.pathname]);

  const fetchDueTickets = async () => {
    try {
      const [maintRes, reqRes] = await Promise.all([
        api.get('/maintenancetickets'),
        api.get('/repairrequests')
      ]);
      
      const tickets = Array.isArray(maintRes.data) ? maintRes.data : [];
      const requests = Array.isArray(reqRes.data) ? reqRes.data : [];
      
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // 1. Phiếu bảo trì đến hạn
      const dueMaint = tickets.filter((t: any) => {
        if (t.status !== 1) return false;
        if (!t.scheduledDate) return false;
        const scheduledDate = new Date(t.scheduledDate);
        return scheduledDate <= today;
      }).map((t: any) => ({
        id: `maint-${t.id}`,
        type: 'maintenance',
        title: `Đến lịch bảo trì: ${t.asset?.name || `Mã TB: ${t.assetId}`}`,
        subtitle: t.issueDescription || 'Đến lịch bảo trì định kỳ',
        deptName: 'Kho Trang bị',
        status: 1,
        statusText: 'Cần bảo trì',
        statusBadgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30',
        icon: 'build',
        iconBg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        href: '/maintenance',
        timestamp: new Date(t.scheduledDate).getTime() || Date.now()
      }));
      setDueMaintCount(dueMaint.length);
      
      // 2. Format đầy đủ trạng thái các phiếu đề nghị thực tế (Chờ tiếp nhận, Đang xử lý, Đã hoàn thành)
      const formattedRequests = requests.map((r: any) => {
        let statusText = 'Chờ tiếp nhận';
        let statusBadgeClass = 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/30';
        let icon = 'pending_actions';
        let iconBg = 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
        let statusDesc = r.description || 'Chờ kỹ thuật viên tiếp nhận';

        if (r.status === 2) {
          statusText = 'Đang xử lý';
          statusBadgeClass = 'bg-blue-500/20 text-blue-600 dark:text-cyan-300 border border-blue-500/30';
          icon = 'engineering';
          iconBg = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-cyan-400';
          statusDesc = r.handlerName ? `Người xử lý: ${r.handlerName}` : (r.handlingNotes || 'Kỹ thuật viên đang xử lý');
        } else if (r.status === 3) {
          statusText = 'Đã hoàn thành';
          statusBadgeClass = 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30';
          icon = 'check_circle';
          iconBg = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
          statusDesc = r.handlingNotes || 'Đã khắc phục & bàn giao khoa phòng';
        } else if (r.status === 4) {
          statusText = 'Từ chối';
          statusBadgeClass = 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30';
          icon = 'cancel';
          iconBg = 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
          statusDesc = r.handlingNotes || 'Không thể xử lý';
        }

        const deptName = r.department?.name || 'Khoa phòng';
        const titleStr = r.title ? `[REQ-${r.id}] ${r.title}` : `Phiếu đề nghị #REQ-${r.id}`;
        const timeStr = r.updatedAt || r.createdAt;
        const timeNum = timeStr ? new Date(timeStr).getTime() : (Date.now() - r.id * 1000);

        return {
          id: `req-${r.id}`,
          type: 'repair_request',
          title: titleStr,
          subtitle: `${deptName} • ${statusDesc}`,
          deptName,
          status: r.status,
          statusText,
          statusBadgeClass,
          icon,
          iconBg,
          href: '/repair-requests',
          timestamp: timeNum
        };
      });

      // Số lượng phiếu đề nghị đang hoạt động (Đang chờ tiếp nhận hoặc Đang xử lý)
      const activeCount = requests.filter((r: any) => r.status === 1 || r.status === 2).length;
      setActiveRepairCount(activeCount);

      // Sắp xếp ưu tiên: Bảo trì & phiếu đang xử lý/chờ tiếp nhận lên đầu, sau đó đến phiếu hoàn thành
      const allNotifs = [...dueMaint, ...formattedRequests].sort((a, b) => {
        const aPending = (a.type === 'maintenance' || a.status === 1 || a.status === 2) ? 1 : 0;
        const bPending = (b.type === 'maintenance' || b.status === 1 || b.status === 2) ? 1 : 0;
        if (aPending !== bPending) return bPending - aPending;
        return b.timestamp - a.timestamp;
      });

      setDueTickets(allNotifs);
    } catch (err) {
      console.error("Lỗi lấy thông báo bảo trì/đề nghị", err);
    }
  };

  interface SubNavItem {
    name: string;
    href: string;
  }

  interface NavItem {
    name: string;
    subtitle: string;
    href: string;
    icon: any;
    gradient: string;
    shadowColor: string;
    badgeCount?: number;
    children?: SubNavItem[];
  }

  const navigation: NavItem[] = [
    ...(canView('dashboard') ? [{ 
      name: 'Dashboard', 
      subtitle: 'Tổng quan hệ thống',
      href: '/dashboard', 
      icon: Home,
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
      shadowColor: 'shadow-blue-500/25'
    }] : []),
    ...(canView('assets') ? [{ 
      name: 'Tài sản & Thiết bị', 
      subtitle: 'Quản lý trang thiết bị',
      href: '/assets', 
      icon: Package,
      gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600',
      shadowColor: 'shadow-purple-500/25',
      children: [
        { name: 'Danh sách trang bị', href: '/assets' },
        ...(canCreate('assets') ? [{ name: 'Thêm mới trang bị', href: '/assets?action=create' }] : []),
        ...(canView('transfers') ? [{ name: 'Lịch sử biến động', href: '/transfers' }] : []),
        ...(canView('maintenance') ? [{ name: 'Bảo trì & Bảo hành', href: '/maintenance' }] : []),
      ]
    }] : []),
    ...(canView('reports') ? [{ 
      name: 'Báo cáo & Thống kê', 
      subtitle: 'Thống kê, báo cáo',
      href: '/reports', 
      icon: BarChart3,
      gradient: 'bg-gradient-to-br from-emerald-400 to-teal-600',
      shadowColor: 'shadow-emerald-500/25',
      children: [
        { name: 'Báo cáo theo khoa phòng', href: '/reports?tab=departments' },
        { name: 'Báo cáo theo tần suất sử dụng', href: '/reports?tab=usage' },
        { name: 'Thống kê theo công việc', href: '/reports?tab=tasks' },
      ]
    }] : []),
    ...(canView('kpi') ? [{ 
      name: 'Đánh giá KPI', 
      subtitle: 'Bảng tính & xếp loại',
      href: '/kpi', 
      icon: Calculator,
      gradient: 'bg-gradient-to-br from-teal-500 to-emerald-600',
      shadowColor: 'shadow-teal-500/25',
      children: [
        { name: 'Bảng tính KPI', href: '/kpi' },
        { name: 'Danh sách hồ sơ', href: '/kpi?tab=list' },
        { name: 'Cấu hình KPI', href: '/kpi?tab=config' },
        { name: 'Hướng dẫn đánh giá', href: '/kpi?tab=guide' },
      ]
    }] : []),
    ...(canView('repair_requests') ? [{ 
      name: 'Phiếu đề nghị', 
      subtitle: 'Sửa chữa, cấp phát, khác',
      href: '/repair-requests', 
      icon: FileText,
      gradient: 'bg-gradient-to-br from-amber-400 to-orange-500',
      shadowColor: 'shadow-amber-500/25',
      badgeCount: activeRepairCount > 0 ? activeRepairCount : undefined
    }] : []),
    ...(canView('categories') ? [{ 
      name: 'Kho & Danh mục', 
      subtitle: 'Kho, vật tư, danh mục',
      href: '/categories', 
      icon: Warehouse,
      gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      shadowColor: 'shadow-blue-500/25'
    }] : []),
    ...(canView('equipments') ? [{ 
      name: 'Quản lý Thiết bị', 
      subtitle: 'Bảo trì, kiểm định',
      href: '/equipments', 
      icon: MonitorCheck,
      gradient: 'bg-gradient-to-br from-cyan-400 to-blue-600',
      shadowColor: 'shadow-cyan-500/25'
    }] : []),
    ...(canView('departments') ? [{ 
      name: 'Quản lý Khoa Phòng', 
      subtitle: 'Người dùng, phân quyền',
      href: '/users', 
      icon: Users,
      gradient: 'bg-gradient-to-br from-rose-500 to-red-600',
      shadowColor: 'shadow-rose-500/25'
    }] : []),
    ...(canView('settings') ? [{ 
      name: 'Cấu hình', 
      subtitle: 'Hệ thống, phân quyền',
      href: '/settings', 
      icon: Settings,
      gradient: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      shadowColor: 'shadow-purple-500/25'
    }] : [])
  ];

  // Trạng thái mở rộng Accordion (Mặc định đóng toàn bộ khi đăng nhập, chỉ mở khi nhấp mũi tên hoặc hover chuột)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);

  const toggleSubmenu = (href: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [href]: !prev[href]
    }));
  };

  // Hàm kiểm tra mục con đang active (so sánh cả query string)
  const isSubItemActive = (subHref: string) => {
    const currentPathAndSearch = location.pathname + location.search;
    if (subHref.includes('?')) {
      if (currentPathAndSearch === subHref) return true;
      if (location.pathname === '/reports' && !location.search && subHref.includes('tab=departments')) {
        return true;
      }
      if (location.pathname === '/assets' && !location.search && subHref === '/assets') {
        return true;
      }
      return false;
    }
    return location.pathname === subHref && !location.search;
  };

  // Real-time clock and date format (hh:mm · Thứ, DD/MM/YYYY)
  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = daysOfWeek[currentTime.getDay()];
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedDate = `${dayName}, ${pad(currentTime.getDate())}/${pad(currentTime.getMonth() + 1)}/${currentTime.getFullYear()}`;
  const formattedTimeShort = `${pad(currentTime.getHours())}:${pad(currentTime.getMinutes())}`;

  // Tính 2 chữ cái viết tắt cho Avatar (ví dụ: Phạm Văn Hùng -> PH)
  const getInitials = (name?: string) => {
    if (!name) return 'PH';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Vai trò hiển thị tiếng Việt chuẩn
  const roleTitle = user?.role === 'Admin' 
    ? 'Quản trị hệ thống' 
    : user?.role === 'Manager' 
      ? 'Quản lý' 
      : 'Nhân viên';

  // Quản lý ảnh đại diện tùy chỉnh
  const [avatarUrl, setAvatarUrl] = useState<string | null>(localStorage.getItem('userAvatar'));

  useEffect(() => {
    const handleUserUpdated = () => {
      setAvatarUrl(localStorage.getItem('userAvatar'));
    };
    window.addEventListener('userUpdated', handleUserUpdated);
    window.addEventListener('storage', handleUserUpdated);
    return () => {
      window.removeEventListener('userUpdated', handleUserUpdated);
      window.removeEventListener('storage', handleUserUpdated);
    };
  }, []);

  // Tên màn hình hiện tại cho breadcrumb bên trái header (tìm cả trong children và query)
  const currentNavItem = (() => {
    const currentFull = location.pathname + location.search;
    for (const item of navigation) {
      if (item.children) {
        for (const sub of item.children) {
          if (sub.href.includes('?') && currentFull === sub.href) {
            return { name: `${item.name} • ${sub.name}` };
          }
        }
      }
    }
    const match = navigation.find(n => 
      location.pathname === n.href || (n.href !== '/dashboard' && location.pathname.startsWith(n.href))
    );
    if (match) {
      if (match.href === '/reports') {
        const isUsage = location.search.includes('tab=usage');
        const isTasks = location.search.includes('tab=tasks') || location.search.includes('tab=work');
        if (isTasks) {
          return { name: 'Báo cáo & Thống kê • Thống kê theo công việc' };
        }
        return { name: `Báo cáo & Thống kê • ${isUsage ? 'Theo Tần Suất Sử Dụng' : 'Theo Khoa Phòng'}` };
      }
      if (match.href === '/kpi') {
        if (location.search.includes('tab=list')) return { name: 'Đánh giá KPI • Danh sách hồ sơ' };
        if (location.search.includes('tab=config')) return { name: 'Đánh giá KPI • Cấu hình KPI' };
        if (location.search.includes('tab=guide')) return { name: 'Đánh giá KPI • Hướng dẫn đánh giá' };
        return { name: 'Đánh giá KPI • Bảng tính KPI' };
      }
      return match;
    }
    return { name: 'Hệ thống' };
  })();

  return (
    <div className="bg-background text-on-surface">
      {/* SideNavBar - Giao diện mới chuẩn phong cách đề xuất */}
      <aside 
        className={`fixed left-0 top-0 h-full ${
          isSidebarCollapsed ? 'w-[84px]' : 'w-[290px]'
        } bg-gradient-to-b from-[#0a1128] via-[#0d1836] to-[#070b1e] border-r border-blue-900/40 flex flex-col py-4 px-3 z-50 transition-all duration-300 shadow-2xl select-none`}
      >
        {/* Header Sidebar: Logo 3D + QLTB + Nút Thu gọn << */}
        <div className="flex items-center justify-between mb-5 px-1.5 pt-1">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <Qltb3dLogo />
            {!isSidebarCollapsed && (
              <div className="leading-tight animate-in fade-in duration-200">
                <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                  QLTB
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                </h1>
                <p className="text-[11px] font-semibold text-blue-200/70 tracking-wide">Quản lý Trang bị</p>
              </div>
            )}
          </Link>

          {/* Nút thu gọn / mở rộng Sidebar (<< hoặc >>) */}
          <button
            onClick={toggleSidebarCollapse}
            title={isSidebarCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
            className="p-1.5 rounded-xl text-blue-300/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            {isSidebarCollapsed ? (
              <ChevronsRight className="w-5 h-5" />
            ) : (
              <ChevronsLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Danh sách Menu Items - Thẻ Squircle Gradient, Accordion & Hover */}
        <nav className="flex-1 space-y-2 overflow-y-auto pr-1 overflow-x-hidden">
          {navigation.map((item) => {
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const isSelfActive = location.pathname === item.href;
            const isChildActive = Boolean(item.children?.some(c => isSubItemActive(c.href)));
            const isActive = isSelfActive || isChildActive || (!hasChildren && location.pathname.startsWith(item.href) && item.href !== '/dashboard');
            const isItemExpanded = Boolean(expandedMenus[item.href] || hoveredMenu === item.name);

            if (isSidebarCollapsed) {
              // Giao diện khi thu gọn (Icon Squircle ở giữa + Popover Flyout bên phải)
              return (
                <div 
                  key={item.name} 
                  className="relative group flex justify-center py-1"
                  onMouseEnter={() => setHoveredMenu(item.name)}
                  onMouseLeave={() => setHoveredMenu(null)}
                >
                  <Link
                    to={item.href}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 ring-2 ring-blue-400/50'
                        : `${item.gradient} ${item.shadowColor} text-white hover:scale-105 shadow-md`
                    }`}
                    title={`${item.name} - ${item.subtitle}`}
                  >
                    <item.icon className="w-5 h-5" />
                  </Link>

                  {/* Badge nhỏ khi thu gọn */}
                  {item.badgeCount && (
                    <span className="absolute top-0 right-3 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                      {item.badgeCount > 9 ? '9+' : item.badgeCount}
                    </span>
                  )}

                  {/* Popover Flyout khi sidebar thu gọn */}
                  {hasChildren && (
                    <div className="absolute left-[calc(100%+8px)] top-0 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto">
                      <div className="bg-[#0c142c]/95 border border-blue-500/30 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl w-64 text-left">
                        <div className="px-2.5 py-1.5 border-b border-blue-500/20 mb-2 flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.gradient} text-white shrink-0 shadow-sm`}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-white truncate">{item.name}</p>
                            <p className="text-[10px] text-blue-200/60 truncate">{item.subtitle}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {item.children?.map(sub => {
                            const subActive = isSubItemActive(sub.href);
                            return (
                              <Link
                                key={sub.name}
                                to={sub.href}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${
                                  subActive
                                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30'
                                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                                }`}
                              >
                                <span className={`rounded-full shrink-0 transition-all ${
                                  subActive ? 'w-2 h-2 bg-cyan-300 shadow-[0_0_8px_#38bdf8]' : 'w-1.5 h-1.5 bg-slate-400'
                                }`} />
                                <span className="truncate">{sub.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // Giao diện khi mở rộng (Chuẩn 100% hình khoanh đỏ: Click hoặc Hover đều mở 2 chức năng con)
            return (
              <div 
                key={item.name} 
                className="space-y-1"
                onMouseEnter={() => setHoveredMenu(item.name)}
                onMouseLeave={() => setHoveredMenu(null)}
              >
                {/* Thẻ cha */}
                <div className="flex items-center justify-between">
                  <Link
                    to={item.href}
                    className={`group w-full p-2 rounded-2xl flex items-center justify-between transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 border border-blue-400/30 font-semibold'
                        : 'hover:bg-blue-900/25 text-slate-200 hover:text-white border border-transparent hover:border-blue-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Squircle Icon Container */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${
                          isActive
                            ? 'bg-white/20 backdrop-blur-md shadow-inner text-white'
                            : `${item.gradient} shadow-md ${item.shadowColor} group-hover:scale-105 text-white`
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                      </div>

                      {/* Tiêu đề & Phụ đề 2 dòng */}
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-100 group-hover:text-white'}`}>
                            {item.name}
                          </span>
                          {item.badgeCount && (
                            <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shadow-sm shrink-0">
                              {item.badgeCount}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-300 font-normal'}`}>
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Mũi tên bên phải (v khi mở rộng, > khi mục thường, có thể click toggle riêng) */}
                    <div className="shrink-0 pl-1">
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSubmenu(item.href);
                          }}
                          title={isItemExpanded ? "Thu gọn danh mục" : "Mở rộng danh mục"}
                          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                          <ChevronDown 
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isItemExpanded ? 'rotate-180 text-white' : 'text-slate-400 group-hover:text-white'
                            }`} 
                          />
                        </button>
                      ) : (
                        <ChevronRight 
                          className={`w-4 h-4 transition-all duration-200 ${
                            isActive ? 'text-white' : 'text-slate-500 group-hover:text-white group-hover:translate-x-0.5'
                          }`} 
                        />
                      )}
                    </div>
                  </Link>
                </div>

                {/* Submenu Accordion xổ dọc bên trong thanh menu (Hiển thị khi Click hoặc Hover) */}
                {hasChildren && isItemExpanded && (
                  <div className="mt-1 ml-4 pl-3.5 border-l-2 border-blue-500/25 space-y-1 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {item.children?.map((sub) => {
                      const isSubActive = isSubItemActive(sub.href);
                      return (
                        <Link
                          key={sub.name}
                          to={sub.href}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-150 group/sub ${
                            isSubActive
                              ? 'bg-blue-600/35 text-cyan-200 font-bold border border-cyan-400/40 shadow-xs'
                              : 'text-slate-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {/* Chấm tròn phát sáng (Xanh sáng khi active, xám khi thường) */}
                          <span 
                            className={`rounded-full shrink-0 transition-all ${
                              isSubActive 
                                ? 'w-2 h-2 bg-cyan-400 shadow-[0_0_8px_#38bdf8]' 
                                : 'w-1.5 h-1.5 bg-slate-500 group-hover/sub:bg-slate-300'
                            }`} 
                          />
                          <span className="truncate">{sub.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Khối User Profile dưới đáy Sidebar (Nguyễn Văn Hùng • Quản trị hệ thống • Logout) */}
        {!isSidebarCollapsed ? (
          <div className="mt-auto pt-3 border-t border-blue-900/40 shrink-0">
            <div className="bg-gradient-to-r from-blue-950/70 via-slate-900/80 to-blue-950/70 border border-blue-500/20 rounded-2xl p-2.5 flex items-center justify-between shadow-lg backdrop-blur-md hover:border-blue-400/40 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-bold flex items-center justify-center shrink-0 shadow-md border border-cyan-300/40 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-bold text-sm text-white truncate" title={user?.fullName || 'Nguyễn Văn Hùng'}>
                    {user?.fullName || 'Nguyễn Văn Hùng'}
                  </p>
                  <p className="text-[11px] text-blue-200/70 font-medium truncate">
                    {roleTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Đăng xuất hệ thống"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-3 border-t border-blue-900/40 flex flex-col items-center gap-2 shrink-0">
            <div 
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-bold flex items-center justify-center shadow-md border border-cyan-300/40 overflow-hidden cursor-pointer"
              title={`${user?.fullName || 'Nguyễn Văn Hùng'} (${roleTitle})`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <button
              onClick={logout}
              title="Đăng xuất hệ thống"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Wrapper - Thích ứng khi Sidebar Thu gọn hoặc Mở rộng */}
      <div className={`${isSidebarCollapsed ? 'ml-[84px]' : 'ml-[290px]'} min-h-screen flex flex-col transition-all duration-300`}>
        {/* TopNavBar - Thu gọn 1 hàng chuẩn theo Hình 1 */}
        <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#182232]/95 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800/80 flex justify-between items-center h-16 px-6 lg:px-8 shadow-xs transition-colors duration-200">
          {/* Bên trái: Tên trang hiện tại */}

          <div className="flex items-center gap-2">
            <h2 className="text-base lg:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              {currentNavItem?.name || 'Hệ thống'}
            </h2>
          </div>

          {/* Bên phải: Đồng hồ · Thời tiết · Nút chức năng · Thông tin User (Đúng 100% Hình 1) */}
          <div className="flex items-center gap-2 sm:gap-3 text-sm">
            {/* 1. Đồng hồ tròn xanh & Ngày tháng */}
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px] shrink-0">
                schedule
              </span>
              <span className="font-bold text-gray-900 dark:text-white tabular-nums">
                {formattedTimeShort}
              </span>
              <span className="text-gray-400 dark:text-slate-500 font-bold mx-0.5">·</span>
              <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                {formattedDate}
              </span>
            </div>

            {/* Vạch phân cách đứng 1 */}
            <div className="h-5 w-[1px] bg-gray-200 dark:bg-slate-700 mx-1 sm:mx-2 hidden sm:block" />

            {/* 2. Thời tiết mây xanh Khánh Hòa */}
            <div 
              className="flex items-center gap-1.5 cursor-default text-slate-700 dark:text-slate-200"
              title={`Dự báo thời tiết: ${weather.description} (${weather.temp}) - Khánh Hòa`}
            >
              <span className="material-symbols-outlined text-sky-500 dark:text-sky-400 text-[20px] shrink-0">
                cloud
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {weather.temp}
              </span>
              <span className="text-gray-400 dark:text-slate-500 font-bold mx-0.5">·</span>
              <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                Khánh Hòa
              </span>
            </div>

            {/* 3. Cụm icon: Chuông, Đổi Theme, Cài đặt */}
            <div className="flex items-center gap-1 ml-1 sm:ml-2">
              {/* Chuông thông báo hiển thị số lượng thực tế chữ trắng nền đỏ */}
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  title="Thông báo hệ thống"
                  className="relative p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">notifications</span>
                  {(dueMaintCount + activeRepairCount) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center rounded-full shadow-md animate-pulse">
                      {(dueMaintCount + activeRepairCount) > 99 ? '99+' : (dueMaintCount + activeRepairCount)}
                    </span>
                  )}
                </button>
                
                {/* Notifications Popover Đầy Đủ Trạng Thái Phiếu Đề Nghị & Bảo Trì */}
                {showNotifications && (
                  <div className="absolute top-full mt-2.5 right-0 w-[360px] max-w-[92vw] bg-white dark:bg-[#182232] rounded-2xl shadow-2xl border border-gray-200/80 dark:border-slate-700/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 bg-gray-50/90 dark:bg-slate-800/90 border-b border-gray-200/80 dark:border-slate-700/80 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500 text-[18px]">notifications_active</span>
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Thông báo hệ thống</h3>
                      </div>
                      <span className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 text-[11px] px-2.5 py-0.5 rounded-full font-extrabold">
                        {activeRepairCount + dueMaintCount} cần xử lý
                      </span>
                    </div>

                    <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700/50">
                      {dueTickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-slate-400 text-sm">
                          <span className="material-symbols-outlined text-4xl opacity-30 mb-2">notifications_paused</span>
                          <p className="font-medium">Chưa có thông báo nào phát sinh.</p>
                        </div>
                      ) : (
                        dueTickets.map(ticket => (
                          <Link 
                            key={ticket.id} 
                            to={ticket.href} 
                            onClick={() => setShowNotifications(false)}
                            className="p-3.5 hover:bg-blue-50/60 dark:hover:bg-slate-700/40 transition-colors flex items-start gap-3 group"
                          >
                            {/* Icon biểu tượng với màu sắc chuyên biệt */}
                            <div className={`w-9 h-9 rounded-xl ${ticket.iconBg} flex items-center justify-center shrink-0 shadow-sm mt-0.5`}>
                              <span className="material-symbols-outlined text-[19px]">{ticket.icon}</span>
                            </div>

                            {/* Chi tiết nội dung */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5 mb-0.5">
                                <p className="font-bold text-gray-900 dark:text-white text-xs truncate group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors">
                                  {ticket.title}
                                </p>
                                <span className={`text-[10px] font-extrabold px-2 py-0.2 rounded-full shrink-0 ${ticket.statusBadgeClass}`}>
                                  {ticket.statusText}
                                </span>
                              </div>
                              <p className="text-gray-500 dark:text-slate-300 text-[11px] line-clamp-1">
                                {ticket.subtitle}
                              </p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>

                    {/* Footer popover */}
                    <div className="p-2.5 bg-gray-50/90 dark:bg-slate-800/90 border-t border-gray-200/80 dark:border-slate-700/80 text-center">
                      <Link
                        to="/repair-requests"
                        onClick={() => setShowNotifications(false)}
                        className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Xem tất cả phiếu đề nghị</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Nút Đổi Theme (Mặt trăng / Mặt trời) */}
              <button 
                onClick={toggleTheme}
                title={isDarkMode ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
                className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isDarkMode ? 'light_mode' : 'bedtime'}
                </span>
              </button>

              {/* Nút Cài đặt (Bánh răng) */}
              <Link 
                to="/settings"
                title="Cài đặt hệ thống"
                className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">settings</span>
              </Link>
            </div>

            {/* Vạch phân cách đứng 2 */}
            <div className="h-6 w-[1px] bg-gray-200 dark:bg-slate-700 mx-1 sm:mx-2" />

            {/* 4. Khối User Profile (Avatar tròn xanh chữ viết tắt PH + Tên & Quản trị viên) */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-gray-100/80 dark:hover:bg-slate-800/80 transition-colors text-left group"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-bold text-sm flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/60 shadow-xs overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(user?.fullName || user?.username)
                  )}
                </div>
                <div className="hidden sm:block leading-tight">
                  <div className="flex items-center gap-1 font-bold text-sm text-gray-900 dark:text-white">
                    <span>{user?.fullName || user?.username || 'Phạm Văn Hùng'}</span>
                    <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors">
                      keyboard_arrow_down
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 font-normal">
                    {roleTitle}
                  </p>
                </div>
              </button>

              {/* Dropdown Menu Profile */}
              {showProfileMenu && (
                <div className="absolute top-full mt-2 right-0 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{user?.fullName || user?.username}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">@{user?.username} • {roleTitle}</p>
                  </div>
                  <Link 
                    to="/settings" 
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-gray-400">manage_accounts</span>
                    Cài đặt tài khoản
                  </Link>
                  <div className="my-1 border-t border-gray-100 dark:border-slate-700" />
                  <button 
                    onClick={() => { setShowProfileMenu(false); logout(); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Canvas */}
        <main className="flex-1 p-[40px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {user?.isDefaultPassword && (
            <div className="mb-6 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md shadow-lg shadow-amber-500/5 animate-in fade-in">
              <div className="flex items-center gap-3.5 text-amber-800 dark:text-amber-200">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
                  <span className="material-symbols-outlined text-[22px]">shield_lock</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Cảnh báo An toàn: Tài khoản đang sử dụng mật khẩu mặc định</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-500 border border-rose-500/30 uppercase">Khẩn cấp</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Tài khoản của bạn đang dùng mật khẩu khởi tạo (<strong>admin123</strong>). Để bảo vệ an toàn cho dữ liệu trang thiết bị y tế của Bệnh viện, vui lòng đổi mật khẩu ngay!
                  </p>
                </div>
              </div>
              <Link
                to="/settings"
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/25 flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">key</span>
                <span>Đổi mật khẩu ngay</span>
              </Link>
            </div>
          )}
          <Outlet />
        </main>

        {/* Footer chuẩn theo mẫu */}
        <footer className="w-full h-11 px-10 bg-white/95 dark:bg-[#182232]/95 border-t border-gray-200/80 dark:border-slate-800/80 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 shrink-0 transition-colors duration-200">
          <p className="font-medium text-slate-500 dark:text-slate-400">
            © 2026 Bệnh viện Quân y 87
          </p>
          <p className="font-medium text-slate-500 dark:text-slate-400">
            Phiên bản v2.4.0 • Hỗ trợ CNTT
          </p>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
