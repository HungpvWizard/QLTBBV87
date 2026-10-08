import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Monitor, Wrench, CheckCircle2, AlertTriangle, Activity, 
  PieChart as PieChartIcon, BarChart3, ArrowRight, RefreshCw, 
  TrendingUp, Sparkles, Stethoscope, ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import api from '../api/axios';

const DARK_COLORS = [
  '#38bdf8', // Sky
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#f87171', // Red
  '#a78bfa', // Violet
  '#fb7185', // Rose
  '#2dd4bf', // Teal
  '#fb923c', // Orange
  '#818cf8', // Indigo
  '#e879f9', // Fuchsia
  '#4ade80', // Green
  '#60a5fa', // Blue
];

const LIGHT_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#7c3aed', // Violet
  '#db2777', // Pink
  '#0d9488', // Teal
  '#ea580c', // Orange
  '#4f46e5', // Indigo
  '#c026d3', // Fuchsia
  '#16a34a', // Green
  '#0284c7', // Sky
];

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  gradientClass, 
  badgeText,
  onClick,
  subtext
}: { 
  title: string, 
  value: string, 
  icon: any, 
  gradientClass: string, 
  badgeText?: string,
  onClick?: () => void,
  subtext?: string
}) => (
  <div 
    onClick={onClick}
    className="group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/60 dark:border-white/10 shadow-lg shadow-slate-200/40 dark:shadow-none hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
    title={`Nhấp để xem danh sách chi tiết: ${title}`}
  >
    {/* Background Glow */}
    <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${gradientClass} opacity-10 group-hover:opacity-20 blur-2xl transition-all duration-500`} />
    
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-12 h-12 rounded-[18px] ${gradientClass} flex items-center justify-center text-white shadow-md shadow-slate-900/10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
          <Icon className="w-6 h-6 stroke-[2.2]" />
        </div>
        {badgeText && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
            {badgeText}
          </span>
        )}
      </div>

      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight group-hover:text-primary transition-colors">
        {value}
      </h3>
    </div>

    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
        {subtext || "Bấm xem chi tiết"}
      </span>
      <div className="w-7 h-7 rounded-[10px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:translate-x-0.5 transition-all">
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [equipmentData, setEquipmentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [assetStats, setAssetStats] = useState({
    total: '0',
    inUse: '0',
    repairing: '0',
    broken: '0'
  });

  // Track dark/light mode
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const updateTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('themeChanged', updateTheme);
    window.addEventListener('storage', updateTheme);
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('themeChanged', updateTheme);
      window.removeEventListener('storage', updateTheme);
      observer.disconnect();
    };
  }, []);

  const chartColors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;
  const totalEquipments = equipmentData.reduce((sum, item) => sum + (item.value || 0), 0);

  const fetchStats = async () => {
    try {
      setIsRefreshing(true);
      const [equipRes, assetRes] = await Promise.allSettled([
        api.get('/equipments'),
        api.get('/assets')
      ]);

      const equipments = equipRes.status === 'fulfilled' && Array.isArray(equipRes.value.data) ? equipRes.value.data : [];
      const assets = assetRes.status === 'fulfilled' && Array.isArray(assetRes.value.data) ? assetRes.value.data : [];

      // Số thiết bị được quản lý tại "Quản lý Thiết bị" (đồng bộ chuẩn 3 màn hình)
      const totalCount = equipments.length > 0 ? equipments.length : assets.length;
      const inUse = assets.filter((a: any) => a.status === 2).length;
      const repairing = assets.filter((a: any) => a.status === 3).length;
      const broken = assets.filter((a: any) => a.status === 4).length;

      setAssetStats({
        total: totalCount.toLocaleString('vi-VN'),
        inUse: inUse.toLocaleString('vi-VN'),
        repairing: repairing.toLocaleString('vi-VN'),
        broken: broken.toLocaleString('vi-VN'),
      });

      if (equipments && equipments.length > 0) {
        // Nhóm dữ liệu theo tên thiết bị (bỏ qua Danh mục vì thường bị set là 'Mặc định')
        const grouped = equipments.reduce((acc: any, curr: any) => {
          let key = 'Thiết bị khác';
          
          if (curr.name) {
            let rawName = curr.name.trim();
            // Loại bỏ các số thứ tự trong ngoặc như (1), (2)...
            rawName = rawName.replace(/\(\d+\)/g, '').trim();
            
            const lower = rawName.toLowerCase();
            
            // Gom nhóm các máy có cùng chức năng chung
            if (lower.includes('sinh hóa') || lower.includes('sinh hoá')) {
              key = 'Máy sinh hóa';
            } else if (lower.includes('huyết học')) {
              key = 'Máy huyết học';
            } else if (lower.includes('nước tiểu')) {
              key = 'Máy phân tích nước tiểu';
            } else if (lower.includes('miễn dịch')) {
              key = 'Máy miễn dịch';
            } else if (lower.includes('khí máu')) {
              key = 'Máy khí máu';
            } else if (lower.includes('ly tâm')) {
              key = 'Máy ly tâm';
            } else if (lower.includes('nội soi')) {
              key = 'Hệ thống nội soi';
            } else if (lower.includes('siêu âm')) {
              key = 'Máy siêu âm';
            } else if (lower.includes('x-quang') || lower.includes('x quang')) {
              key = 'Hệ thống X-Quang';
            } else if (lower.includes('ct') || lower.includes('cắt lớp')) {
              key = 'Máy chụp CT';
            } else if (lower.includes('mri') || lower.includes('cộng hưởng từ')) {
              key = 'Máy chụp MRI';
            } else if (lower.includes('điện tim') || lower.includes('ecg')) {
              key = 'Máy điện tim';
            } else if (lower.includes('điện não') || lower.includes('eeg')) {
              key = 'Máy điện não';
            } else if (lower.includes('thở') || lower.includes('respirator') || lower.includes('ventilator')) {
              key = 'Máy giúp thở';
            } else if (lower.includes('monitor') || lower.includes('theo dõi')) {
              key = 'Monitor theo dõi BN';
            } else if (lower.includes('phá rung') || lower.includes('defibrillator')) {
              key = 'Máy sốc tim / phá rung';
            } else if (lower.includes('gây mê')) {
              key = 'Máy gây mê kèm thở';
            } else if (lower.includes('hút dịch') || lower.includes('máy hút')) {
              key = 'Máy hút dịch y tế';
            } else if (lower.includes('bơm tiêm điện') || lower.includes('tiêm điện')) {
              key = 'Bơm tiêm điện';
            } else if (lower.includes('truyền dịch')) {
              key = 'Máy truyền dịch';
            } else if (lower.includes('đèn mổ') || lower.includes('bàn mổ')) {
              key = 'Trang thiết bị phòng mổ';
            } else if (lower.includes('tiệt trùng') || lower.includes('autoclave') || lower.includes('hấp sấy')) {
              key = 'Thiết bị tiệt khuẩn / Hấp sấy';
            } else if (lower.includes('kính hiển vi')) {
              key = 'Kính hiển vi';
            } else {
              // Rút gọn bớt chuỗi quá dài cho biểu đồ
              key = rawName.length > 25 ? rawName.substring(0, 22) + '...' : rawName;
            }
          }
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        // Chuyển object sang array và sắp xếp giảm dần theo số lượng
        const sorted = Object.keys(grouped)
          .map(k => ({ name: k, value: grouped[k] }))
          .sort((a, b) => b.value - a.value);

        // Lấy top 9 loại có số lượng nhiều nhất, còn lại gom vào 'Khác'
        let chartData = [];
        if (sorted.length > 10) {
          chartData = sorted.slice(0, 9);
          const othersCount = sorted.slice(9).reduce((sum, item) => sum + item.value, 0);
          if (othersCount > 0) {
            chartData.push({ name: 'Thiết bị khác', value: othersCount });
          }
        } else {
          chartData = sorted;
        }

        setEquipmentData(chartData);
      } else {
        setEquipmentData([]);
        const debugData = typeof equipments === 'object' ? JSON.stringify(equipments).substring(0, 100) : typeof equipments;
        setErrorMsg(`Kiểu dữ liệu: ${Array.isArray(equipments) ? 'Array' : 'Not Array'}. Dữ liệu: ${debugData}`);
      }
    } catch (error: any) {
      console.error('Error fetching equipments stats:', error);
      setEquipmentData([]);
      setErrorMsg(error.message || "Lỗi gọi API /equipments");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* 🌟 MODULE HEADER BANNER SQUIRCLE GRADIENT */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 dark:from-[#0c142c] dark:via-[#0f1b3d] dark:to-[#0c142c] border border-blue-500/20 p-6 md:p-8 text-white shadow-xl shadow-blue-500/10 dark:shadow-blue-950/40 backdrop-blur-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-20 top-0 w-32 h-32 rounded-full bg-sky-400/20 dark:bg-blue-500/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[20px] bg-white/15 dark:bg-gradient-to-br dark:from-indigo-500 dark:via-purple-500 dark:to-blue-600 backdrop-blur-md border border-white/20 dark:border-white/10 flex items-center justify-center shadow-inner shrink-0">
              <Activity className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Tổng Quan Hệ Thống</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 dark:bg-indigo-500/20 border border-white/30 dark:border-indigo-500/30 text-white dark:text-indigo-300 backdrop-blur-sm">
                  <Sparkles className="w-3 h-3 text-amber-300 dark:text-amber-400" /> Trực quan Realtime
                </span>
              </div>
              <p className="text-blue-100/90 dark:text-slate-400 text-sm mt-1 max-w-xl font-medium">
                Theo dõi tình trạng tài sản, trang thiết bị y tế và phân bổ số liệu tổng thể theo thời gian thực tại Bệnh viện Quân y 87.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchStats}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[16px] bg-white/15 hover:bg-white/25 dark:bg-slate-900/80 dark:hover:bg-slate-800 active:scale-95 text-white dark:text-slate-300 text-xs font-bold border border-white/25 dark:border-slate-700/60 backdrop-blur-md transition-all shadow-sm disabled:opacity-50"
              title="Làm mới số liệu"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
            <button
              onClick={() => navigate('/equipments')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[16px] bg-white text-blue-700 hover:bg-blue-50 dark:bg-gradient-to-r dark:from-blue-600 dark:via-blue-500 dark:to-cyan-500 dark:hover:from-blue-500 dark:hover:to-cyan-400 dark:text-white active:scale-95 text-xs font-black shadow-lg shadow-black/10 dark:shadow-blue-500/30 transition-all"
            >
              <Stethoscope className="w-4 h-4 text-blue-600 dark:text-white" />
              <span>Thiết Bị Y Tế</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 📊 4 THẺ SỐ LIỆU SQUIRCLE GLASS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Tổng Thiết Bị" 
          value={assetStats.total} 
          icon={Monitor} 
          gradientClass="bg-gradient-to-br from-blue-500 to-indigo-600" 
          badgeText="Quản lý thiết bị"
          onClick={() => navigate('/equipments')}
          subtext="Bấm xem tất cả thiết bị"
        />
        <StatCard 
          title="Đang Sử Dụng" 
          value={assetStats.inUse} 
          icon={CheckCircle2} 
          gradientClass="bg-gradient-to-br from-emerald-400 to-teal-600" 
          badgeText="Hoạt động tốt"
          onClick={() => navigate('/assets?status=2')}
          subtext="Bấm xem tài sản đang dùng"
        />
        <StatCard 
          title="Đang Sửa Chữa" 
          value={assetStats.repairing} 
          icon={Wrench} 
          gradientClass="bg-gradient-to-br from-amber-400 to-orange-500" 
          badgeText="Bảo trì"
          onClick={() => navigate('/assets?status=3')}
          subtext="Bấm xem tài sản đang sửa"
        />
        <StatCard 
          title="Cảnh Báo Hỏng" 
          value={assetStats.broken} 
          icon={AlertTriangle} 
          gradientClass="bg-gradient-to-br from-rose-400 to-red-600" 
          badgeText="Cần xử lý"
          onClick={() => navigate('/assets?status=4')}
          subtext="Bấm xem tài sản bị hỏng"
        />
      </div>

      {/* 📈 CONTAINER BIỂU ĐỒ SQUIRCLE GLASS CARD */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[28px] border border-white/60 dark:border-white/10 shadow-xl shadow-slate-200/40 dark:shadow-none p-6 md:p-8 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[12px] bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              Thống kê phân loại thiết bị
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Biểu đồ số lượng theo từng loại thiết bị hiện có tại các khoa phòng</p>
          </div>
          <button 
            onClick={() => navigate('/equipments')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 border border-blue-200/50 dark:border-blue-800/50 px-4 py-2 rounded-[14px] transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Xem chi tiết danh sách thiết bị</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : equipmentData.length === 0 ? (
          <div className="flex justify-center items-center h-64 flex-col text-slate-400">
            <Activity className="w-12 h-12 mb-3 opacity-20" />
            <p>Chưa có dữ liệu thống kê thiết bị.</p>
            {errorMsg && <p className="mt-2 text-xs text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded">Debug info: {errorMsg}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Biểu đồ cột */}
            <div className="bg-slate-50/80 dark:bg-slate-950/40 p-6 rounded-[22px] border border-slate-200/70 dark:border-slate-800/80 shadow-xs flex flex-col justify-between transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  Số lượng theo thiết bị (Cột)
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/80 px-2.5 py-1 rounded-full font-medium">
                  {equipmentData.length} phân loại
                </span>
              </div>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={equipmentData} margin={{ top: 10, right: 15, left: -10, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={{ stroke: isDarkMode ? '#475569' : '#cbd5e1' }}
                      tickLine={false}
                      tick={{ fill: isDarkMode ? '#cbd5e1' : '#475569', fontSize: 10.5 }}
                      dy={8}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={65}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                    />
                    <RechartsTooltip 
                      cursor={{ fill: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }}
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                        borderRadius: '16px',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        boxShadow: isDarkMode ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        padding: '10px 14px'
                      }}
                      itemStyle={{ color: isDarkMode ? '#f1f5f9' : '#0f172a', fontWeight: 'bold' }}
                      labelStyle={{ color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '4px', fontSize: '12px' }}
                    />
                    <Bar dataKey="value" name="Số lượng" radius={[8, 8, 0, 0]}>
                      {equipmentData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Biểu đồ tròn */}
            <div className="bg-slate-50/80 dark:bg-slate-950/40 p-6 rounded-[22px] border border-slate-200/70 dark:border-slate-800/80 shadow-xs flex flex-col justify-between transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Tỷ trọng thiết bị (Tròn)
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/80 px-2.5 py-1 rounded-full font-medium">
                  Tổng: <strong className="text-slate-700 dark:text-slate-200">{totalEquipments}</strong> thiết bị
                </span>
              </div>
              
              <div className="relative h-[210px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={equipmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={2.5}
                      dataKey="value"
                      nameKey="name"
                      stroke={isDarkMode ? '#020617' : '#ffffff'}
                      strokeWidth={2}
                      label={({ percent }) => (percent && percent >= 0.05) ? `${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={false}
                    >
                      {equipmentData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                        borderRadius: '16px',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        boxShadow: isDarkMode ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        padding: '8px 12px'
                      }}
                      formatter={(val: any, name: any) => {
                        const p = totalEquipments > 0 ? ((Number(val) / totalEquipments) * 100).toFixed(1) : 0;
                        return [`${val} thiết bị (${p}%)`, name];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text in donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                    {totalEquipments}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                    Thiết bị
                  </span>
                </div>
              </div>

              {/* Clean Legend grid without text collision */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3 max-h-[130px] overflow-y-auto pr-1">
                {equipmentData.map((item, idx) => {
                  const percent = totalEquipments > 0 ? ((item.value / totalEquipments) * 100).toFixed(1) : 0;
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[12px] bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 text-xs hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors"
                      title={`${item.name}: ${item.value} thiết bị (${percent}%)`}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: chartColors[idx % chartColors.length] }} />
                        <span className="text-slate-700 dark:text-slate-300 truncate font-medium">{item.name}</span>
                      </div>
                      <span className="text-slate-500 dark:text-slate-400 font-mono font-semibold shrink-0 text-[11px] ml-1">
                        {item.value} <span className="opacity-70">({percent}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
