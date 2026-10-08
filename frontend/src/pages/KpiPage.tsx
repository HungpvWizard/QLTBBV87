import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Calculator, 
  FileSpreadsheet, 
  Settings2, 
  BookOpen, 
  Save, 
  Send, 
  CheckCircle2, 
  RotateCcw, 
  Download, 
  AlertTriangle, 
  Check, 
  Calendar, 
  Building2 
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';
import { exportKpiToExcel, type KpiAssessmentExportData } from '../utils/kpiExcelExport';

interface KpiLineState {
  id?: number;
  kpiCode: string;
  kpiName: string;
  group: string;
  weight: number;
  unit: string;
  evaluationDirection: string;
  thresholdExcellent: number | null;
  thresholdGood: number | null;
  thresholdAverage: number | null;
  numerator: number | null;
  denominator: number | null;
  actualValue: number | null;
  calculatedResult: number | null;
  ratingLevel: string | null;
  score: number | null;
  convertedScore: number | null;
  notes: string | null;
  exceptionNotes: string | null;
}

interface AssessmentState {
  id?: number;
  departmentId?: number | null;
  departmentName: string;
  periodType: string;
  periodYear: number;
  periodQuarter?: number | null;
  periodMonth?: number | null;
  periodName: string;
  startDate?: string | null;
  endDate?: string | null;
  configVersion: number;
  status: string;
  revision: number;
  scoreGroupA: number;
  scoreGroupB: number;
  scoreGroupC: number;
  scoreGroupD: number;
  totalScore: number;
  scoreRating: string;
  hasFailKpi: boolean;
  hasSevereIncidents: boolean;
  hasOverdueDevicesUsed: boolean;
  hasLegalViolations: boolean;
  blockingNote?: string | null;
  finalRating?: string | null;
  finalConclusionNotes?: string | null;
  decidedBy?: string | null;
  decisionDate?: string | null;
  decisionReference?: string | null;
  createdByUserName?: string | null;
  approvedByUserName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lines: KpiLineState[];
}

export default function KpiPage() {
  const { isAdmin, isManager } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab active: 'sheet' | 'list' | 'config' | 'guide'
  const activeTab = searchParams.get('tab') || 'sheet';
  const setActiveTab = (tab: string) => {
    setSearchParams(prev => {
      prev.set('tab', tab);
      return prev;
    });
  };

  // Danh mục Khoa Phòng
  const [departments, setDepartments] = useState<any[]>([]);

  // Bộ lọc kỳ hiện tại cho Bảng tính
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedDeptId, setSelectedDeptId] = useState<number | ''>('');
  const [selectedDeptName, setSelectedDeptName] = useState<string>('Kho Trang bị');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedPeriodType, setSelectedPeriodType] = useState<string>('Tháng');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.ceil(currentMonth / 3));

  // State hồ sơ hiện tại
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentState | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Lọc nhóm chỉ số (A, B, C, D, All)
  const [groupFilter, setGroupFilter] = useState<string>('ALL');

  // State Tab Danh sách hồ sơ
  const [assessmentsList, setAssessmentsList] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listYearFilter, setListYearFilter] = useState<number>(currentYear);
  const [listDeptFilter, setListDeptFilter] = useState<string>('ALL');
  const [listStatusFilter, setListStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // State Tab Cấu hình
  const [kpiDefinitions, setKpiDefinitions] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [editingDef, setEditingDef] = useState<any | null>(null);

  // Modal Kết luận quản trị
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionFinalRating, setDecisionFinalRating] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionRef, setDecisionRef] = useState('');

  // 1. Tải danh mục khoa phòng khi khởi động
  useEffect(() => {
    api.get('/departments').then(res => {
      const depts = Array.isArray(res.data) ? res.data : [];
      setDepartments(depts);
      if (depts.length > 0 && selectedDeptId === '') {
        const trangBi = depts.find((d: any) => d.name.includes('Trang bị') || d.name.includes('trang bị'));
        if (trangBi) {
          setSelectedDeptId(trangBi.id);
          setSelectedDeptName(trangBi.name);
        } else {
          setSelectedDeptId(depts[0].id);
          setSelectedDeptName(depts[0].name);
        }
      }
    }).catch(err => console.error("Lỗi nạp khoa phòng", err));
  }, []);

  // 2. Tự động nạp hoặc tạo hồ sơ tương ứng khi đổi khoa phòng hoặc kỳ
  useEffect(() => {
    if (activeTab === 'sheet') {
      loadOrCreateAssessment();
    }
  }, [selectedDeptId, selectedYear, selectedPeriodType, selectedMonth, selectedQuarter, activeTab]);

  // 3. Tải danh sách hồ sơ khi vào tab 'list'
  useEffect(() => {
    if (activeTab === 'list') {
      loadAssessmentsList();
    }
  }, [activeTab, listYearFilter, listDeptFilter, listStatusFilter]);

  // 4. Tải danh mục cấu hình khi vào tab 'config'
  useEffect(() => {
    if (activeTab === 'config') {
      loadKpiDefinitions();
    }
  }, [activeTab]);

  // Nạp hoặc khởi tạo hồ sơ
  const loadOrCreateAssessment = async (targetId?: number) => {
    setLoadingAssessment(true);
    try {
      if (targetId) {
        const res = await api.get(`/kpi/assessments/${targetId}`);
        setCurrentAssessment(res.data);
        return;
      }

      // Tìm xem đã có hồ sơ cho khoa và kỳ này chưa
      const queryParams: any = { year: selectedYear, periodType: selectedPeriodType };
      if (selectedDeptId !== '') queryParams.departmentId = selectedDeptId;

      const resList = await api.get('/kpi/assessments', { params: queryParams });
      const items = Array.isArray(resList.data) ? resList.data : [];

      let match = items.find((a: any) => {
        if (selectedPeriodType === 'Tháng') return a.periodMonth === selectedMonth;
        if (selectedPeriodType === 'Quý') return a.periodQuarter === selectedQuarter;
        return true;
      });

      if (match) {
        const detailRes = await api.get(`/kpi/assessments/${match.id}`);
        setCurrentAssessment(detailRes.data);
      } else {
        // Tự động tạo hồ sơ mới với 26 dòng
        const payload = {
          departmentId: selectedDeptId !== '' ? Number(selectedDeptId) : null,
          departmentName: selectedDeptName,
          periodType: selectedPeriodType,
          periodYear: selectedYear,
          periodMonth: selectedPeriodType === 'Tháng' ? selectedMonth : null,
          periodQuarter: selectedPeriodType === 'Quý' ? selectedQuarter : null,
          periodName: selectedPeriodType === 'Tháng' 
            ? `Tháng ${String(selectedMonth).padStart(2, '0')}/${selectedYear}`
            : selectedPeriodType === 'Quý' 
              ? `Quý ${selectedQuarter}/${selectedYear}` 
              : `Năm ${selectedYear}`
        };

        const createRes = await api.post('/kpi/assessments', payload);
        const detailRes = await api.get(`/kpi/assessments/${createRes.data.id}`);
        setCurrentAssessment(detailRes.data);
      }
    } catch (err) {
      console.error("Lỗi nạp hồ sơ KPI", err);
    } finally {
      setLoadingAssessment(false);
    }
  };

  const loadAssessmentsList = async () => {
    setLoadingList(true);
    try {
      const params: any = { year: listYearFilter };
      if (listDeptFilter !== 'ALL') params.departmentId = Number(listDeptFilter);
      if (listStatusFilter !== 'ALL') params.status = listStatusFilter;

      const res = await api.get('/kpi/assessments', { params });
      setAssessmentsList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Lỗi nạp danh sách hồ sơ", err);
    } finally {
      setLoadingList(false);
    }
  };

  const loadKpiDefinitions = async () => {
    setLoadingConfig(true);
    try {
      const res = await api.get('/kpi/definitions?version=1');
      setKpiDefinitions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Lỗi nạp cấu hình KPI", err);
    } finally {
      setLoadingConfig(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CÔNG THỨC TÍNH TOÁN REAL-TIME PHÍA CLIENT (TRÙNG KHỚP 100% EXCEL & SERVER)
  // ═══════════════════════════════════════════════════════════════════════════
  const computeLineValues = (
    code: string,
    unit: string,
    direction: string,
    weight: number,
    tXS: number | null,
    tTot: number | null,
    tTB: number | null,
    g: number | null,
    h: number | null,
    i: number | null
  ) => {
    // 1. Cột J:
    // =IF(E5="Tỷ lệ %", IF(OR(G5="", H5="", H5=0), "", G5/H5*100), IF(OR(E5="Số sự cố", E5="Điểm đánh giá"), I5, ""))
    // Đặc biệt: Với Số sự cố và Điểm đánh giá, nếu ô I trống (null/undefined), Excel quy về 0 => J = 0!
    let j: number | null = null;
    if (unit === 'Tỷ lệ %') {
      if (g !== null && h !== null && h !== 0) {
        j = (g / h) * 100;
      } else {
        j = null;
      }
    } else if (unit === 'Số sự cố' || unit === 'Điểm đánh giá') {
      j = i !== null && i !== undefined ? i : 0;
    }

    // 2. Cột K:
    let k: string | null = null;
    if (j !== null) {
      if (code === 'D1') {
        if (j >= 95) k = 'Xuất sắc';
        else if (j >= 85) k = 'Tốt';
        else if (j >= 70) k = 'Trung bình';
        else k = 'Không đạt';
      } else if (direction === 'Cao hơn tốt hơn') {
        if (tXS !== null && j >= tXS) k = 'Xuất sắc';
        else if (tTot !== null && j >= tTot) k = 'Tốt';
        else if (tTB !== null && j >= tTB) k = 'Trung bình';
        else k = 'Không đạt';
      } else {
        // Thấp hơn tốt hơn
        if (tXS !== null && j <= tXS) k = 'Xuất sắc';
        else if (tTot !== null && j <= tTot) k = 'Tốt';
        else if (tTB !== null && j <= tTB) k = 'Trung bình';
        else k = 'Không đạt';
      }
    }

    // 3. Cột L:
    let l: number | null = null;
    if (k) {
      switch (k) {
        case 'Xuất sắc': l = 100; break;
        case 'Tốt': l = 85; break;
        case 'Trung bình': l = 70; break;
        default: l = 0; break;
      }
    }

    // 4. Cột M:
    let m: number | null = null;
    if (l !== null) {
      m = l * weight;
    }

    return { j, k, l, m };
  };

  // Cập nhật giá trị một ô khi người dùng gõ
  const handleCellChange = (
    kpiCode: string, 
    field: 'numerator' | 'denominator' | 'actualValue' | 'notes' | 'exceptionNotes', 
    value: string
  ) => {
    if (!currentAssessment) return;

    setCurrentAssessment(prev => {
      if (!prev) return prev;

      const updatedLines = prev.lines.map(line => {
        if (line.kpiCode !== kpiCode) return line;

        const updated = { ...line };
        if (field === 'notes') {
          updated.notes = value;
          return updated;
        }
        if (field === 'exceptionNotes') {
          updated.exceptionNotes = value;
          return updated;
        }

        // Với các trường số G, H, I:
        // Phân biệt rõ chuỗi rỗng (null) với số 0
        const parsedVal = value.trim() === '' ? null : Number(value);

        if (field === 'numerator') updated.numerator = parsedVal;
        if (field === 'denominator') updated.denominator = parsedVal;
        if (field === 'actualValue') updated.actualValue = parsedVal;

        // Tính lại J, K, L, M ngay lập tức
        const calc = computeLineValues(
          updated.kpiCode,
          updated.unit,
          updated.evaluationDirection,
          updated.weight,
          updated.thresholdExcellent,
          updated.thresholdGood,
          updated.thresholdAverage,
          updated.numerator,
          updated.denominator,
          updated.actualValue
        );

        updated.calculatedResult = calc.j;
        updated.ratingLevel = calc.k;
        updated.score = calc.l;
        updated.convertedScore = calc.m;

        return updated;
      });

      // Tính tổng hợp lại
      let sumA = 0;
      let sumB = 0;
      let sumC = 0;
      let sumD = 0;
      let hasFail = false;
      let hasSevere = false;

      updatedLines.forEach(l => {
        if (l.convertedScore !== null) {
          if (l.group === 'A') sumA += l.convertedScore;
          if (l.group === 'B') sumB += l.convertedScore;
          if (l.group === 'C') sumC += l.convertedScore;
          if (l.group === 'D') sumD += l.convertedScore;
        }
        if (l.ratingLevel === 'Không đạt') hasFail = true;
        if (l.kpiCode === 'C6' && (l.actualValue ?? 0) > 0) hasSevere = true;
      });

      const total = sumA + sumB + sumC + sumD;
      let rating = 'Không đạt';
      if (total >= 95) rating = 'Xuất sắc';
      else if (total >= 85) rating = 'Tốt';
      else if (total >= 70) rating = 'Trung bình';

      let blocking = hasFail ? 'Có KPI không đạt – cần xem xét' : (hasSevere ? 'Có sự cố nghiêm trọng do lỗi quản lý – cần xem xét' : null);
      let finalR = total < 70 ? 'Không đạt' : (blocking ? 'Chờ xem xét' : rating);

      return {
        ...prev,
        lines: updatedLines,
        scoreGroupA: sumA,
        scoreGroupB: sumB,
        scoreGroupC: sumC,
        scoreGroupD: sumD,
        totalScore: total,
        scoreRating: rating,
        hasFailKpi: hasFail,
        hasSevereIncidents: hasSevere,
        blockingNote: blocking,
        finalRating: prev.decidedBy ? prev.finalRating : finalR
      };
    });
  };

  // Lưu hồ sơ (gửi lên Server để Server tính lại và lưu trữ an toàn)
  const handleSaveAssessment = async () => {
    if (!currentAssessment || !currentAssessment.id) return;
    setSaving(true);
    setSaveSuccessMsg(null);

    try {
      const linesPayload = currentAssessment.lines.map(l => ({
        kpiCode: l.kpiCode,
        numerator: l.numerator,
        denominator: l.denominator,
        actualValue: l.actualValue,
        notes: l.notes,
        exceptionNotes: l.exceptionNotes
      }));

      await api.put(`/kpi/assessments/${currentAssessment.id}`, {
        lines: linesPayload,
        hasSevereIncidents: currentAssessment.hasSevereIncidents,
        hasOverdueDevicesUsed: currentAssessment.hasOverdueDevicesUsed,
        hasLegalViolations: currentAssessment.hasLegalViolations
      });

      setSaveSuccessMsg("Đã lưu dữ liệu bảng tính thành công vào hệ thống!");
      setTimeout(() => setSaveSuccessMsg(null), 4000);

      // Nạp lại dữ liệu chuẩn từ server
      await loadOrCreateAssessment(currentAssessment.id);
    } catch (err: any) {
      console.error("Lỗi khi lưu bảng tính", err);
      alert(err.response?.data?.message || "Lỗi khi lưu bảng tính.");
    } finally {
      setSaving(false);
    }
  };

  // Đổi trạng thái hồ sơ (Gửi duyệt, Duyệt, Mở lại)
  const handleChangeStatus = async (newStatus: string) => {
    if (!currentAssessment?.id) return;
    const actionLabel = newStatus === 'Submitted' ? 'gửi duyệt' : (newStatus === 'Approved' ? 'phê duyệt' : 'mở lại');
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionLabel} hồ sơ đánh giá này?`)) return;

    try {
      await api.post(`/kpi/assessments/${currentAssessment.id}/status`, {
        status: newStatus,
        reason: `${actionLabel} từ giao diện Bảng tính KPI`
      });
      await loadOrCreateAssessment(currentAssessment.id);
      alert(`Đã ${actionLabel} hồ sơ thành công!`);
    } catch (err: any) {
      alert(err.response?.data?.message || `Lỗi khi ${actionLabel} hồ sơ.`);
    }
  };

  // Lưu kết luận quản trị
  const handleSaveDecision = async () => {
    if (!currentAssessment?.id) return;
    try {
      await api.post(`/kpi/assessments/${currentAssessment.id}/decision`, {
        finalRating: decisionFinalRating || currentAssessment.scoreRating,
        finalConclusionNotes: decisionNotes,
        decisionReference: decisionRef
      });
      setShowDecisionModal(false);
      await loadOrCreateAssessment(currentAssessment.id);
      alert("Đã ghi nhận kết luận quản trị thành công!");
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi khi lưu kết luận quản trị.");
    }
  };

  // Xuất file Excel 3 sheet
  const handleExportExcel = () => {
    if (!currentAssessment) return;

    const exportData: KpiAssessmentExportData = {
      departmentName: currentAssessment.departmentName || 'Kho Trang bị',
      periodName: currentAssessment.periodName,
      status: currentAssessment.status === 'Approved' ? 'Đã duyệt' : (currentAssessment.status === 'Submitted' ? 'Chờ duyệt' : 'Bản nháp'),
      totalScore: currentAssessment.totalScore,
      scoreRating: currentAssessment.scoreRating,
      scoreGroupA: currentAssessment.scoreGroupA,
      scoreGroupB: currentAssessment.scoreGroupB,
      scoreGroupC: currentAssessment.scoreGroupC,
      scoreGroupD: currentAssessment.scoreGroupD,
      blockingNote: currentAssessment.blockingNote || null,
      finalRating: currentAssessment.finalRating || null,
      finalConclusionNotes: currentAssessment.finalConclusionNotes || null,
      decidedBy: currentAssessment.decidedBy || null,
      createdByUserName: currentAssessment.createdByUserName || null,
      approvedByUserName: currentAssessment.approvedByUserName || null,
      lines: currentAssessment.lines.map(l => ({
        code: l.kpiCode,
        name: l.kpiName,
        group: l.group,
        weight: l.weight,
        unit: l.unit,
        evaluationDirection: l.evaluationDirection,
        thresholdExcellent: l.thresholdExcellent,
        thresholdGood: l.thresholdGood,
        thresholdAverage: l.thresholdAverage,
        numerator: l.numerator,
        denominator: l.denominator,
        actualValue: l.actualValue,
        calculatedResult: l.calculatedResult,
        ratingLevel: l.ratingLevel,
        score: l.score,
        convertedScore: l.convertedScore,
        notes: l.notes,
        exceptionNotes: l.exceptionNotes
      }))
    };

    exportKpiToExcel(exportData);
  };

  // Lọc dòng hiển thị theo Tab nhóm A, B, C, D
  const filteredLines = useMemo(() => {
    if (!currentAssessment?.lines) return [];
    if (groupFilter === 'ALL') return currentAssessment.lines;
    return currentAssessment.lines.filter(l => l.group === groupFilter);
  }, [currentAssessment, groupFilter]);

  // Phân trang danh sách hồ sơ
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return assessmentsList.slice(start, start + pageSize);
  }, [assessmentsList, currentPage, pageSize]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Banner tiêu đề & Thanh chuyển Tab ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/25">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Đánh Giá Chỉ Số Hiệu Quả KPI
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
                  Phiên bản 2.0
                </span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tích hợp bảng tính KPI 26 chỉ số, công thức Excel gốc, tổng nhóm và kết luận quản trị
              </p>
            </div>
          </div>

          {/* Cụm Tabs chính */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/60 self-start md:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('sheet')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'sheet'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calculator className="w-4 h-4" />
              Bảng tính KPI
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'list'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Danh sách hồ sơ
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'config'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              Cấu hình KPI
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Hướng dẫn
            </button>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: BẢNG TÍNH KPI CHÍNH */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'sheet' && (
        <div className="space-y-6">
          {/* Thanh chọn Đơn vị, Kỳ đánh giá & Thao tác */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Chọn Khoa Phòng */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase">Đơn vị:</span>
                <select
                  value={selectedDeptId}
                  onChange={(e) => {
                    const id = e.target.value === '' ? '' : Number(e.target.value);
                    setSelectedDeptId(id);
                    const d = departments.find(item => item.id === id);
                    if (d) setSelectedDeptName(d.name);
                    else setSelectedDeptName('Kho Trang bị');
                  }}
                  className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                >
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id} className="dark:bg-slate-800 dark:text-white">
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Loại Kỳ */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-slate-500" />
                <select
                  value={selectedPeriodType}
                  onChange={(e) => setSelectedPeriodType(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                >
                  <option value="Tháng" className="dark:bg-slate-800">Theo Tháng</option>
                  <option value="Quý" className="dark:bg-slate-800">Theo Quý</option>
                  <option value="Năm" className="dark:bg-slate-800">Theo Năm</option>
                </select>
              </div>

              {/* Chi tiết Tháng / Quý */}
              {selectedPeriodType === 'Tháng' && (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500">Tháng:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m} className="dark:bg-slate-800">Tháng {m}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedPeriodType === 'Quý' && (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500">Quý:</span>
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                    className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    <option value={1} className="dark:bg-slate-800">Quý 1</option>
                    <option value={2} className="dark:bg-slate-800">Quý 2</option>
                    <option value={3} className="dark:bg-slate-800">Quý 3</option>
                    <option value={4} className="dark:bg-slate-800">Quý 4</option>
                  </select>
                </div>
              )}

              {/* Năm */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500">Năm:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                >
                  <option value={currentYear + 1} className="dark:bg-slate-800">{currentYear + 1}</option>
                  <option value={currentYear} className="dark:bg-slate-800">{currentYear}</option>
                  <option value={currentYear - 1} className="dark:bg-slate-800">{currentYear - 1}</option>
                </select>
              </div>

              {/* Trạng thái hồ sơ */}
              {currentAssessment && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  currentAssessment.status === 'Approved'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
                    : currentAssessment.status === 'Submitted'
                      ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700'
                      : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700'
                }`}>
                  ● {currentAssessment.status === 'Approved' ? 'Đã duyệt' : (currentAssessment.status === 'Submitted' ? 'Chờ duyệt' : 'Bản nháp')}
                </span>
              )}
            </div>

            {/* Các nút hành động chính */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSaveAssessment}
                disabled={saving || currentAssessment?.status === 'Approved' && !isAdmin()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Lưu bảng tính'}
              </button>

              {currentAssessment?.status === 'Draft' && (
                <button
                  onClick={() => handleChangeStatus('Submitted')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Gửi duyệt
                </button>
              )}

              {currentAssessment?.status === 'Submitted' && (isManager() || isAdmin()) && (
                <button
                  onClick={() => handleChangeStatus('Approved')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Phê duyệt
                </button>
              )}

              {currentAssessment?.status === 'Approved' && isAdmin() && (
                <button
                  onClick={() => handleChangeStatus('Draft')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-700 hover:bg-slate-800 text-white shadow-sm transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Mở lại
                </button>
              )}

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                title="Xuất file Excel 3 Sheet: KPI Tổng hợp, Cấu hình KPI, Hướng dẫn"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </button>
            </div>
          </div>

          {/* Thông báo lưu thành công */}
          {saveSuccessMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl text-sm flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Cụm Lọc nhóm A, B, C, D */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase shrink-0">Lọc nhóm:</span>
            {[
              { id: 'ALL', label: 'Tất cả (26)', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
              { id: 'A', label: 'Nhóm A - Mục tiêu chất lượng (7)', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
              { id: 'B', label: 'Nhóm B - Vận hành & Kỹ thuật (8)', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
              { id: 'C', label: 'Nhóm C - An toàn & Quản lý (6)', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
              { id: 'D', label: 'Nhóm D - Hiệu quả & Tài chính (5)', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setGroupFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  groupFilter === tab.id
                    ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-500/30'
                    : `${tab.color} hover:opacity-80`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* BẢNG TÍNH 26 CHỈ SỐ - 15 CỘT A ĐẾN O */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[640px] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                {/* Header cố định 2 tầng chuẩn Excel: Tầng 1 Ký hiệu cột A-O; Tầng 2 Tên cột */}
                <thead className="sticky top-0 z-20 shadow-sm border-b border-slate-300 dark:border-slate-700 select-none">
                  {/* TẦNG 1: DÒNG KÝ HIỆU CỘT EXCEL (A ĐẾN O) - ĐỒNG BỘ 100% CÙNG MỘT GAM MÀU CÂN ĐỐI */}
                  <tr className="border-b border-slate-300 dark:border-slate-750 text-[11px] font-mono font-black tracking-wider">
                    <th className="py-1.5 px-1 text-center w-14 min-w-[56px] max-w-[56px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700 sticky left-0 z-30">A</th>
                    <th className="py-1.5 px-3 text-center min-w-[280px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700">B</th>
                    <th className="py-1.5 px-2 text-center w-14 min-w-[56px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700">C</th>
                    <th className="py-1.5 px-2 text-center w-24 min-w-[90px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700">D</th>
                    <th className="py-1.5 px-2 text-center w-24 min-w-[95px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700">E</th>
                    <th className="py-1.5 px-2 text-center w-28 min-w-[110px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700">F</th>
                    <th className="py-1.5 px-2 text-center w-24 min-w-[95px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700" title="Cột G: Tử số (Vùng nhập liệu Tỷ lệ %)">G</th>
                    <th className="py-1.5 px-2 text-center w-24 min-w-[95px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700" title="Cột H: Mẫu số (Vùng nhập liệu Tỷ lệ %)">H</th>
                    <th className="py-1.5 px-2 text-center w-26 min-w-[105px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700" title="Cột I: Giá trị đo (Vùng nhập liệu Sự cố / Điểm)">I</th>
                    <th className="py-1.5 px-2 text-center w-24 min-w-[95px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700" title="Cột J: Kết quả (Tự động tính theo công thức)">J</th>
                    <th className="py-1.5 px-2 text-center w-28 min-w-[110px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700" title="Cột K: Mức KPI (Tự động tra cứu theo ngưỡng)">K</th>
                    <th className="py-1.5 px-2 text-center w-16 min-w-[65px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700" title="Cột L: Điểm (Tự động quy đổi)">L</th>
                    <th className="py-1.5 px-2 text-center w-20 min-w-[80px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700" title="Cột M: Điểm QĐ (Tự động tính L * D)">M</th>
                    <th className="py-1.5 px-3 text-center min-w-[190px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700">N</th>
                    <th className="py-1.5 px-3 text-center min-w-[170px] bg-slate-200/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300">O</th>
                  </tr>

                  {/* TẦNG 2: TIÊU ĐỀ TÊN CỘT - ĐỒNG BỘ GAM MÀU CÂN ĐỐI, RÕ RÀNG */}
                  <tr className="text-slate-700 dark:text-slate-200 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-2 text-center w-14 min-w-[56px] max-w-[56px] bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-30">
                      MÃ KPI
                    </th>
                    <th className="py-2.5 px-3 text-left min-w-[280px] bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                      TÊN CHỈ SỐ KPI
                    </th>
                    <th className="py-2.5 px-2 text-center w-14 min-w-[56px] bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                      NHÓM
                    </th>
                    <th className="py-2.5 px-2 text-center w-24 min-w-[90px] whitespace-nowrap bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                      TRỌNG SỐ
                    </th>
                    <th className="py-2.5 px-2 text-center w-24 min-w-[95px] whitespace-nowrap bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                      ĐƠN VỊ
                    </th>
                    <th className="py-2.5 px-2 text-center w-28 min-w-[110px] whitespace-nowrap bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                      CHIỀU
                    </th>
                    <th className="py-2.5 px-2 text-center w-24 min-w-[95px] whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700" title="Cột G: Tử số">
                      TỬ SỐ (*)
                    </th>
                    <th className="py-2.5 px-2 text-center w-24 min-w-[95px] whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700" title="Cột H: Mẫu số">
                      MẪU SỐ (*)
                    </th>
                    <th className="py-2.5 px-2 text-center w-26 min-w-[105px] whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700" title="Cột I: Giá trị đo">
                      GIÁ TRỊ ĐO (*)
                    </th>
                    <th className="py-2.5 px-2 text-center w-24 min-w-[95px] whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700" title="Công thức: =IF(E5='Tỷ lệ %', IF(OR(G5='', H5='', H5=0), '', G5/H5*100), IF(OR(E5='Số sự cố', E5='Điểm đánh giá'), I5, ''))">
                      KẾT QUẢ
                    </th>
                    <th className="py-2.5 px-2 text-center w-28 min-w-[110px] whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700" title="Công thức: Xác định mức Xuất sắc / Tốt / Trung bình / Không đạt theo ngưỡng">
                      MỨC KPI
                    </th>
                    <th className="py-2.5 px-2 text-center w-16 min-w-[65px] whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700" title="Công thức: Xuất sắc=100, Tốt=85, Trung bình=70, Không đạt=0">
                      ĐIỂM
                    </th>
                    <th className="py-2.5 px-2 text-center w-20 min-w-[80px] whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700" title="Công thức: =L5 * D5">
                      ĐIỂM QĐ
                    </th>
                    <th className="py-2.5 px-3 text-left min-w-[190px] bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                      GHI CHÚ / MINH CHỨNG
                    </th>
                    <th className="py-2.5 px-3 text-left min-w-[170px] bg-slate-100 dark:bg-slate-800">
                      NGOẠI LỆ
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {loadingAssessment ? (
                    <tr>
                      <td colSpan={15} className="p-12 text-center text-slate-500">
                        Đang nạp bảng tính KPI...
                      </td>
                    </tr>
                  ) : filteredLines.map((line, idx) => {
                    const isRatio = line.unit === 'Tỷ lệ %';
                    const isCountOrScore = line.unit === 'Số sự cố' || line.unit === 'Điểm đánh giá';

                    // Group badge colors
                    const groupBadge = 
                      line.group === 'A' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                      line.group === 'B' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                      line.group === 'C' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                      'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';

                    // Rating pill badges
                    const ratingBadge = 
                      line.ratingLevel === 'Xuất sắc' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300' :
                      line.ratingLevel === 'Tốt' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300' :
                      line.ratingLevel === 'Trung bình' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300' :
                      line.ratingLevel === 'Không đạt' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border-rose-300' :
                      'text-slate-400';

                    return (
                      <tr 
                        key={line.kpiCode} 
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        {/* A: Mã KPI */}
                        <td className="p-2 text-center align-middle sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-slate-200 dark:border-slate-800">
                          <span className="inline-flex items-center justify-center font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                            {line.kpiCode}
                          </span>
                        </td>

                        {/* B: Tên chỉ số */}
                        <td className="py-2.5 px-3 text-left align-middle border-r border-slate-200 dark:border-slate-800">
                          <div title={line.kpiName} className="font-semibold text-slate-900 dark:text-slate-100 text-xs leading-snug">
                            {line.kpiName}
                          </div>
                        </td>

                        {/* C: Nhóm */}
                        <td className="p-2 text-center align-middle border-r border-slate-200 dark:border-slate-800">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-mono ${groupBadge}`}>
                            {line.group}
                          </span>
                        </td>

                        {/* D: Trọng số */}
                        <td className="p-2 text-center align-middle font-mono font-bold text-slate-700 dark:text-slate-300 text-xs border-r border-slate-200 dark:border-slate-800">
                          {(line.weight * 100).toFixed(0)}%
                        </td>

                        {/* E: Đơn vị tính */}
                        <td className="p-2 text-center align-middle border-r border-slate-200 dark:border-slate-800">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {line.unit}
                          </span>
                        </td>

                        {/* F: Chiều đánh giá */}
                        <td className="p-2 text-center align-middle border-r border-slate-200 dark:border-slate-800 text-[11px]">
                          {line.evaluationDirection === 'Thấp hơn tốt hơn' || line.evaluationDirection === 'Càng thấp càng tốt' ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap inline-flex items-center justify-center gap-0.5">
                              ↓ {line.evaluationDirection}
                            </span>
                          ) : line.evaluationDirection === 'Cao hơn tốt hơn' || line.evaluationDirection === 'Càng cao càng tốt' ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap inline-flex items-center justify-center gap-0.5">
                              ↑ {line.evaluationDirection}
                            </span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap inline-flex items-center justify-center gap-0.5">
                              • {line.evaluationDirection}
                            </span>
                          )}
                        </td>

                        {/* G: Tử số (Input cho Tỷ lệ %) */}
                        <td className="p-1.5 text-center align-middle bg-blue-50/40 dark:bg-blue-950/20 border-l border-r border-blue-200/80 dark:border-blue-900/50">
                          {isRatio ? (
                            <input
                              type="number"
                              step="any"
                              value={line.numerator !== null && line.numerator !== undefined ? line.numerator : ''}
                              onChange={(e) => handleCellChange(line.kpiCode, 'numerator', e.target.value)}
                              placeholder="Nhập..."
                              className="w-full h-8 text-center px-1.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                            />
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 select-none font-mono">-</span>
                          )}
                        </td>

                        {/* H: Mẫu số (Input cho Tỷ lệ %) */}
                        <td className="p-1.5 text-center align-middle bg-blue-50/40 dark:bg-blue-950/20 border-r border-blue-200/80 dark:border-blue-900/50">
                          {isRatio ? (
                            <input
                              type="number"
                              step="any"
                              value={line.denominator !== null && line.denominator !== undefined ? line.denominator : ''}
                              onChange={(e) => handleCellChange(line.kpiCode, 'denominator', e.target.value)}
                              placeholder="Nhập..."
                              className="w-full h-8 text-center px-1.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                            />
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 select-none font-mono">-</span>
                          )}
                        </td>

                        {/* I: Giá trị đo (Input cho Số sự cố & D1) */}
                        <td className="p-1.5 text-center align-middle bg-amber-50/40 dark:bg-amber-950/20 border-r border-amber-200/80 dark:border-amber-900/50">
                          {isCountOrScore ? (
                            <input
                              type="number"
                              step="any"
                              value={line.actualValue !== null && line.actualValue !== undefined ? line.actualValue : ''}
                              onChange={(e) => handleCellChange(line.kpiCode, 'actualValue', e.target.value)}
                              placeholder={line.kpiCode === 'D1' ? '0-100' : 'Số lượng'}
                              className="w-full h-8 text-center px-1.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 outline-none shadow-2xs"
                            />
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 select-none font-mono">-</span>
                          )}
                        </td>

                        {/* J: Kết quả (%) / Giá trị đo (Công thức, chỉ đọc) */}
                        <td 
                          className="p-2 text-center align-middle font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-50/30 dark:bg-teal-950/15 border-r border-teal-100/60 dark:border-teal-900/40 text-xs cursor-help"
                          title={`Công thức J: =IF(E${idx+5}="Tỷ lệ %", IF(OR(G${idx+5}="", H${idx+5}="", H${idx+5}=0), "", G${idx+5}/H${idx+5}*100), IF(OR(E${idx+5}="Số sự cố", E${idx+5}="Điểm đánh giá"), I${idx+5}, ""))`}
                        >
                          {line.calculatedResult !== null && line.calculatedResult !== undefined
                            ? (isRatio ? `${line.calculatedResult.toFixed(2)}%` : line.calculatedResult.toFixed(1))
                            : <span className="text-slate-300 dark:text-slate-700 font-mono">rỗng</span>}
                        </td>

                        {/* K: Mức KPI (Công thức, chỉ đọc) */}
                        <td 
                          className="p-2 text-center align-middle bg-teal-50/30 dark:bg-teal-950/15 border-r border-teal-100/60 dark:border-teal-900/40 cursor-help"
                          title="Công thức K: Tra cứu ngưỡng Xuất sắc / Tốt / Trung bình / Không đạt"
                        >
                          {line.ratingLevel ? (
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${ratingBadge}`}>
                              {line.ratingLevel}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 font-mono">-</span>
                          )}
                        </td>

                        {/* L: Điểm KPI (Công thức, chỉ đọc) */}
                        <td 
                          className="p-2 text-center align-middle font-mono font-bold text-slate-800 dark:text-slate-200 bg-teal-50/30 dark:bg-teal-950/15 border-r border-teal-100/60 dark:border-teal-900/40 text-xs cursor-help"
                          title="Công thức L: Xuất sắc=100, Tốt=85, Trung bình=70, Không đạt=0"
                        >
                          {line.score !== null && line.score !== undefined ? line.score : <span className="text-slate-300 dark:text-slate-700 font-mono">-</span>}
                        </td>

                        {/* M: Điểm quy đổi (Công thức, chỉ đọc: L * D) */}
                        <td 
                          className="p-2 text-center align-middle font-mono font-black text-teal-800 dark:text-teal-200 bg-teal-50/30 dark:bg-teal-950/15 border-r border-teal-100/60 dark:border-teal-900/40 text-xs cursor-help"
                          title={`Công thức M: =L${idx+5} * D${idx+5}`}
                        >
                          {line.convertedScore !== null && line.convertedScore !== undefined
                            ? line.convertedScore.toFixed(2)
                            : <span className="text-slate-300 dark:text-slate-700 font-mono">-</span>}
                        </td>

                        {/* N: Ghi chú / Minh chứng */}
                        <td className="p-1.5 align-middle border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="text"
                            value={line.notes || ''}
                            onChange={(e) => handleCellChange(line.kpiCode, 'notes', e.target.value)}
                            placeholder="Số văn bản, minh chứng..."
                            className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                          />
                        </td>

                        {/* O: Ngoại lệ */}
                        <td className="p-1.5 align-middle">
                          <input
                            type="text"
                            value={line.exceptionNotes || ''}
                            onChange={(e) => handleCellChange(line.kpiCode, 'exceptionNotes', e.target.value)}
                            placeholder="Giải trình ngoại lệ..."
                            className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── KHỐI TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ (DƯỚI BẢNG TÍNH) ── */}
            {currentAssessment && (
              <div className="bg-slate-50 dark:bg-slate-850 p-6 border-t border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Điểm Nhóm A */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-sm">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Nhóm A - Mục tiêu chất lượng</span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                        {currentAssessment.scoreGroupA.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ 30.00 điểm</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (currentAssessment.scoreGroupA / 30) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Điểm Nhóm B */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Nhóm B - Vận hành & Kỹ thuật</span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                        {currentAssessment.scoreGroupB.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ 35.00 điểm</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (currentAssessment.scoreGroupB / 35) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Điểm Nhóm C */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-sm">
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Nhóm C - An toàn & Quản lý</span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                        {currentAssessment.scoreGroupC.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ 20.00 điểm</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-amber-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (currentAssessment.scoreGroupC / 20) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Điểm Nhóm D */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 shadow-sm">
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">Nhóm D - Hiệu quả & Tài chính</span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                        {currentAssessment.scoreGroupD.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ 15.00 điểm</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-purple-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (currentAssessment.scoreGroupD / 15) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Khối Điểm tổng hợp & Điều kiện chặn */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Bên trái: Điểm tổng hợp & Xếp loại theo điểm */}
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">TỔNG ĐIỂM KPI TÍNH TOÁN</span>
                      <div className="text-4xl font-black text-slate-900 dark:text-white font-mono mt-1">
                        {currentAssessment.totalScore.toFixed(2)}
                        <span className="text-lg font-normal text-slate-400 ml-1">/ 100</span>
                      </div>
                    </div>

                    <div className="h-12 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">XẾP LOẠI THEO ĐIỂM</span>
                      <span className={`inline-block mt-1 px-4 py-1.5 rounded-xl text-base font-extrabold border ${
                        currentAssessment.scoreRating === 'Xuất sắc' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300' :
                        currentAssessment.scoreRating === 'Tốt' ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300' :
                        currentAssessment.scoreRating === 'Trung bình' ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300' :
                        'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300'
                      }`}>
                        ★ {currentAssessment.scoreRating}
                      </span>
                    </div>
                  </div>

                  {/* Giữa: Điều kiện chặn & cờ cảnh báo */}
                  <div className="flex-1 max-w-md">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">ĐIỀU KIỆN CHẶN & CỜ QUẢN TRỊ</span>
                    {currentAssessment.blockingNote ? (
                      <div className="mt-1.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{currentAssessment.blockingNote}</span>
                      </div>
                    ) : (
                      <div className="mt-1.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                        <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span>Không có điều kiện chặn vi phạm</span>
                      </div>
                    )}
                  </div>

                  {/* Bên phải: Kết luận quản trị cuối cùng */}
                  <div className="flex flex-col items-start lg:items-end gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">KẾT LUẬN QUẢN TRỊ CUỐI CÙNG</span>
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-1.5 rounded-xl text-base font-extrabold border ${
                        currentAssessment.finalRating === 'Xuất sắc' ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20' :
                        currentAssessment.finalRating === 'Tốt' ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-600/20' :
                        currentAssessment.finalRating === 'Trung bình' ? 'bg-amber-600 text-white border-amber-700 shadow-md shadow-amber-600/20' :
                        currentAssessment.finalRating === 'Chờ xem xét' ? 'bg-purple-600 text-white border-purple-700 shadow-md shadow-purple-600/20' :
                        'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/20'
                      }`}>
                        {currentAssessment.finalRating || currentAssessment.scoreRating}
                      </span>

                      {(isAdmin() || isManager()) && (
                        <button
                          onClick={() => {
                            setDecisionFinalRating(currentAssessment.finalRating || currentAssessment.scoreRating);
                            setDecisionNotes(currentAssessment.finalConclusionNotes || '');
                            setDecisionRef(currentAssessment.decisionReference || '');
                            setShowDecisionModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 cursor-pointer"
                        >
                          Ghi nhận kết luận
                        </button>
                      )}
                    </div>
                    {currentAssessment.decidedBy && (
                      <span className="text-[11px] text-slate-400">
                        Phê duyệt bởi: <b>{currentAssessment.decidedBy}</b>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: DANH SÁCH HỒ SƠ ĐÁNH GIÁ THEO KỲ / ĐƠN VỊ */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Bộ lọc danh sách */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-500">Năm:</span>
              <select
                value={listYearFilter}
                onChange={(e) => setListYearFilter(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              >
                <option value={currentYear + 1}>{currentYear + 1}</option>
                <option value={currentYear}>{currentYear}</option>
                <option value={currentYear - 1}>{currentYear - 1}</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-500">Đơn vị:</span>
              <select
                value={listDeptFilter}
                onChange={(e) => setListDeptFilter(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả khoa phòng</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-500">Trạng thái:</span>
              <select
                value={listStatusFilter}
                onChange={(e) => setListStatusFilter(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="Draft">Bản nháp</option>
                <option value="Submitted">Chờ duyệt</option>
                <option value="Approved">Đã duyệt</option>
              </select>
            </div>
          </div>

          {/* Bảng danh sách hồ sơ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 text-center w-12">STT</th>
                    <th className="p-3">Khoa Phòng / Đơn vị</th>
                    <th className="p-3">Kỳ đánh giá</th>
                    <th className="p-3 text-right">Tổng điểm</th>
                    <th className="p-3 text-center">Xếp loại điểm</th>
                    <th className="p-3 text-center">Kết luận cuối</th>
                    <th className="p-3 text-center">Trạng thái</th>
                    <th className="p-3">Người tạo / Cập nhật</th>
                    <th className="p-3 text-center w-36">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {loadingList ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        Đang tải danh sách hồ sơ...
                      </td>
                    </tr>
                  ) : paginatedList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        Chưa có hồ sơ KPI nào cho bộ lọc này.
                      </td>
                    </tr>
                  ) : paginatedList.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 text-center text-slate-500">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {item.departmentName}
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {item.periodName}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
                        {item.totalScore.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          item.scoreRating === 'Xuất sắc' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          item.scoreRating === 'Tốt' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          item.scoreRating === 'Trung bình' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {item.scoreRating}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {item.finalRating || item.scoreRating}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          item.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                          item.status === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                          'bg-amber-50 text-amber-700 border-amber-300'
                        }`}>
                          {item.status === 'Approved' ? 'Đã duyệt' : (item.status === 'Submitted' ? 'Chờ duyệt' : 'Bản nháp')}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">
                        <div>{item.createdByUserName || 'Hệ thống'}</div>
                        <div className="text-[10px] text-slate-400">{new Date(item.updatedAt).toLocaleDateString('vi-VN')}</div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={async () => {
                              await loadOrCreateAssessment(item.id);
                              setActiveTab('sheet');
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 transition-colors"
                          >
                            Xem / Sửa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phân trang chuẩn */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <Pagination
                currentPage={currentPage}
                totalItems={assessmentsList.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: CẤU HÌNH KPI (26 CHỈ SỐ) */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Card tóm tắt cấu hình */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Danh Mục 26 Chỉ Số KPI Chuẩn
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Tổng trọng số 100.0%
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Nhóm A: 30% (7 chỉ số) · Nhóm B: 35% (8 chỉ số) · Nhóm C: 20% (6 chỉ số) · Nhóm D: 15% (5 chỉ số)
              </p>
            </div>
            {isAdmin() && (
              <span className="text-xs text-slate-400 italic">
                * Quản trị viên có quyền điều chỉnh ngưỡng đánh giá và tiêu chí
              </span>
            )}
          </div>

          {/* Bảng cấu hình */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 text-center w-14">Mã</th>
                    <th className="p-3 min-w-[220px]">Tên chỉ số KPI</th>
                    <th className="p-3 text-center w-16">Nhóm</th>
                    <th className="p-3 text-right w-20">Trọng số</th>
                    <th className="p-3 w-24">Đơn vị</th>
                    <th className="p-3 w-28">Chiều</th>
                    <th className="p-3 text-center w-24 text-emerald-600 dark:text-emerald-400">Ngưỡng XS</th>
                    <th className="p-3 text-center w-24 text-blue-600 dark:text-blue-400">Ngưỡng Tốt</th>
                    <th className="p-3 text-center w-24 text-amber-600 dark:text-amber-400">Ngưỡng TB</th>
                    <th className="p-3 min-w-[180px]">Ghi chú tiêu chí</th>
                    {isAdmin() && <th className="p-3 text-center w-20">Thao tác</th>}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {loadingConfig ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-500">
                        Đang nạp cấu hình KPI...
                      </td>
                    </tr>
                  ) : kpiDefinitions.map(def => (
                    <tr key={def.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 text-center font-bold text-slate-900 dark:text-white">
                        {def.code}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">
                        {def.name}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          def.group === 'A' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                          def.group === 'B' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                          def.group === 'C' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                          'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                        }`}>
                          {def.group}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {(def.weight * 100).toFixed(0)}%
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{def.unit}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px]">{def.evaluationDirection}</td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {def.thresholdExcellent !== null ? (def.unit === 'Tỷ lệ %' ? `≥ ${def.thresholdExcellent}%` : (def.evaluationDirection === 'Thấp hơn tốt hơn' ? `≤ ${def.thresholdExcellent}` : `≥ ${def.thresholdExcellent}`)) : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                        {def.thresholdGood !== null ? (def.unit === 'Tỷ lệ %' ? `≥ ${def.thresholdGood}%` : (def.evaluationDirection === 'Thấp hơn tốt hơn' ? `≤ ${def.thresholdGood}` : `≥ ${def.thresholdGood}`)) : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                        {def.thresholdAverage !== null ? (def.unit === 'Tỷ lệ %' ? `≥ ${def.thresholdAverage}%` : (def.evaluationDirection === 'Thấp hơn tốt hơn' ? `≤ ${def.thresholdAverage}` : `≥ ${def.thresholdAverage}`)) : '-'}
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">{def.criteriaNote || '-'}</td>
                      {isAdmin() && (
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setEditingDef({ ...def })}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                          >
                            Sửa
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: HƯỚNG DẪN ĐÁNH GIÁ (QUY TRÌNH & NGUYÊN TẮC) */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'guide' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <BookOpen className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Quy Trình & Hướng Dẫn Đánh Giá KPI (Phiên Bản 2.0)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300 flex items-center justify-center text-xs">1</span>
                Quy tắc nhập liệu
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                - Người dùng <b>chỉ nhập số liệu thực tế tại các cột G, H, I</b> theo đúng hướng dẫn.<br/>
                - Tuyệt đối không can thiệp các cột J, K, L, M vì đây là các ô tự động tính bằng <b>công thức Excel gốc</b>.<br/>
                - Cột N (Ghi chú/Minh chứng) và O (Ngoại lệ) phục vụ bổ trợ thông tin, đính kèm số công văn, giải trình.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300 flex items-center justify-center text-xs">2</span>
                Xử lý các loại chỉ số
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                - <b>KPI Tỷ lệ %:</b> Nhập Tử số tại G, Mẫu số tại H. Cột J tự tính phần trăm (G/H*100).<br/>
                - <b>KPI Số sự cố (A7, C6):</b> Nhập số sự cố tại I. Cột J lấy giá trị I.<br/>
                - <b>Đặc biệt ô I trống:</b> Theo công thức gốc Excel, ô I để trống tự động quy về 0 &rarr; A7=2 điểm (Xuất sắc), C6=2 điểm (Xuất sắc), D1=0 điểm (Không đạt). Tổng khởi tạo = 4 điểm.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300 flex items-center justify-center text-xs">3</span>
                Quy đổi điểm (Cột L & M)
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                - Mức Xuất sắc: <b>100 điểm</b>.<br/>
                - Mức Tốt: <b>85 điểm</b>.<br/>
                - Mức Trung bình: <b>70 điểm</b>.<br/>
                - Mức Không đạt: <b>0 điểm</b>.<br/>
                - Điểm quy đổi (M) = Điểm KPI (L) × Trọng số (D). Điểm tối đa cả 26 chỉ số là 100 điểm.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300 flex items-center justify-center text-xs">4</span>
                Xếp loại tổng & Điều kiện chặn
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                - <b>≥ 95:</b> Xuất sắc · <b>85 đến &lt;95:</b> Tốt · <b>70 đến &lt;85:</b> Trung bình · <b>&lt; 70:</b> Không đạt.<br/>
                - Nếu có bất kỳ KPI nào Không đạt, hệ thống hiển thị cờ <i>"Có KPI không đạt – cần xem xét"</i>.<br/>
                - Bảng tính không tự ý hạ bậc hay đưa ra hình phạt khi chưa có quy định chính thức; việc hạ xếp loại do người có thẩm quyền quyết định.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL GHI NHẬN KẾT LUẬN QUẢN TRỊ ── */}
      {showDecisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Ghi Nhận Kết Luận Quản Trị
            </h3>
            <p className="text-xs text-slate-500">
              Quyết định xếp loại cuối cùng sau khi xem xét điểm tính toán và các điều kiện chặn (sự cố nghiêm trọng, thiết bị quá hạn, vi phạm...).
            </p>

            <div className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Xếp loại cuối cùng (*)</label>
                <select
                  value={decisionFinalRating}
                  onChange={(e) => setDecisionFinalRating(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                >
                  <option value="Xuất sắc">Xuất sắc</option>
                  <option value="Tốt">Tốt</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Không đạt">Không đạt</option>
                  <option value="Chờ xem xét">Chờ xem xét</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Căn cứ văn bản / Quyết định</label>
                <input
                  type="text"
                  value={decisionRef}
                  onChange={(e) => setDecisionRef(e.target.value)}
                  placeholder="Ví dụ: Quyết định số 12/QĐ-BV87..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Ghi chú kết luận / Lý do điều chỉnh</label>
                <textarea
                  rows={3}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Ghi rõ lý do hạ bậc, giải trình hoặc kết luận của Lãnh đạo..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDecisionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveDecision}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-md shadow-teal-600/20"
              >
                Lưu kết luận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SỬA CẤU HÌNH KPI CHO ADMIN ── */}
      {editingDef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Điều Chỉnh Cấu Hình Chỉ Số: [{editingDef.code}]
            </h3>

            <div className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Tên chỉ số KPI</label>
                <input
                  type="text"
                  value={editingDef.name || ''}
                  onChange={(e) => setEditingDef({ ...editingDef, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Ngưỡng XS</label>
                  <input
                    type="number"
                    step="any"
                    value={editingDef.thresholdExcellent ?? ''}
                    onChange={(e) => setEditingDef({ ...editingDef, thresholdExcellent: e.target.value === '' ? null : Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Ngưỡng Tốt</label>
                  <input
                    type="number"
                    step="any"
                    value={editingDef.thresholdGood ?? ''}
                    onChange={(e) => setEditingDef({ ...editingDef, thresholdGood: e.target.value === '' ? null : Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Ngưỡng TB</label>
                  <input
                    type="number"
                    step="any"
                    value={editingDef.thresholdAverage ?? ''}
                    onChange={(e) => setEditingDef({ ...editingDef, thresholdAverage: e.target.value === '' ? null : Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Ghi chú tiêu chí / Mô tả</label>
                <textarea
                  rows={2}
                  value={editingDef.criteriaNote || ''}
                  onChange={(e) => setEditingDef({ ...editingDef, criteriaNote: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingDef(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.put(`/kpi/definitions/${editingDef.id}`, editingDef);
                    setEditingDef(null);
                    await loadKpiDefinitions();
                    alert("Đã cập nhật cấu hình chỉ số KPI!");
                  } catch (err: any) {
                    alert(err.response?.data?.message || "Lỗi khi cập nhật cấu hình.");
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-md shadow-teal-600/20"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
