import * as XLSX from 'xlsx';

export interface KpiLineExportData {
  code: string;
  name: string;
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

export interface KpiAssessmentExportData {
  departmentName: string;
  periodName: string;
  status: string;
  totalScore: number;
  scoreRating: string;
  scoreGroupA: number;
  scoreGroupB: number;
  scoreGroupC: number;
  scoreGroupD: number;
  blockingNote: string | null;
  finalRating: string | null;
  finalConclusionNotes: string | null;
  decidedBy: string | null;
  createdByUserName: string | null;
  approvedByUserName: string | null;
  lines: KpiLineExportData[];
}

export function exportKpiToExcel(data: KpiAssessmentExportData) {
  const wb = XLSX.utils.book_new();

  // ═════════════════════════════════════════════════════════════════════════════
  // SHEET 1: KPI Tổng hợp
  // ═════════════════════════════════════════════════════════════════════════════
  const ws1: XLSX.WorkSheet = {};
  const range1 = { s: { c: 0, r: 0 }, e: { c: 14, r: 40 } };

  const setCell = (
    c: number,
    r: number,
    val: any,
    type: 's' | 'n' | 'b' = 's',
    formula?: string,
    numFmt?: string
  ) => {
    const addr = XLSX.utils.encode_cell({ c, r });
    const cell: XLSX.CellObject = { t: type, v: val };
    if (formula) {
      cell.f = formula;
    }
    if (numFmt) {
      cell.z = numFmt;
    }
    ws1[addr] = cell;
  };

  // Header Tiêu đề
  setCell(0, 0, 'BỆNH VIỆN QUÂN Y 87 - PHÒNG HẬU CẦN - KỸ THUẬT', 's');
  setCell(0, 1, 'BẢNG ĐÁNH GIÁ CHỈ SỐ HIỆU QUẢ CÔNG VIỆC (KPI)', 's');
  setCell(
    0,
    2,
    `Đơn vị: ${data.departmentName}  |  Kỳ đánh giá: ${data.periodName}  |  Trạng thái: ${data.status}  |  Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`,
    's'
  );

  // Dòng 4 (index 3): Tiêu đề các cột
  const headers = [
    'Mã KPI',
    'Tên chỉ số KPI',
    'Nhóm',
    'Trọng số',
    'Đơn vị tính',
    'Chiều đánh giá',
    'Tử số',
    'Mẫu số',
    'Giá trị đo',
    'Kết quả (%) / Giá trị đo',
    'Mức KPI',
    'Điểm KPI',
    'Điểm quy đổi',
    'Ghi chú / Minh chứng',
    'Ngoại lệ'
  ];

  headers.forEach((h, idx) => setCell(idx, 3, h, 's'));

  // Sắp xếp đúng 26 chỉ số
  const orderMap: Record<string, number> = {
    A1: 1, A2: 2, A3: 3, A4: 4, A5: 5, A6: 6, A7: 7,
    B1: 8, B2: 9, B3: 10, B4: 11, B5: 12, B6: 13, B7: 14, B8: 15,
    C1: 16, C2: 17, C3: 18, C4: 19, C5: 20, C6: 21,
    D1: 22, D2: 23, D3: 24, D4: 25, D5: 26
  };

  const sortedLines = [...data.lines].sort(
    (a, b) => (orderMap[a.code] || 99) - (orderMap[b.code] || 99)
  );

  // Điền 26 dòng dữ liệu (Row 5 đến 30 -> index 4 đến 29)
  sortedLines.forEach((item, i) => {
    const rowIdx = 4 + i; // 0-indexed row (Excel row = rowIdx + 1, vd i=0 -> Excel row 5)
    const excelRow = rowIdx + 1;

    // A: Mã KPI
    setCell(0, rowIdx, item.code, 's');
    // B: Tên chỉ số KPI
    setCell(1, rowIdx, item.name, 's');
    // C: Nhóm
    setCell(2, rowIdx, item.group, 's');
    // D: Trọng số (lưu 0.07, định dạng hiển thị %)
    setCell(3, rowIdx, item.weight, 'n', undefined, '0.0%');
    // E: Đơn vị tính
    setCell(4, rowIdx, item.unit, 's');
    // F: Chiều đánh giá
    setCell(5, rowIdx, item.evaluationDirection, 's');

    // G: Tử số
    if (item.numerator !== null && item.numerator !== undefined) {
      setCell(6, rowIdx, item.numerator, 'n');
    } else {
      setCell(6, rowIdx, '', 's');
    }

    // H: Mẫu số
    if (item.denominator !== null && item.denominator !== undefined) {
      setCell(7, rowIdx, item.denominator, 'n');
    } else {
      setCell(7, rowIdx, '', 's');
    }

    // I: Giá trị đo
    if (item.actualValue !== null && item.actualValue !== undefined) {
      setCell(8, rowIdx, item.actualValue, 'n');
    } else {
      setCell(8, rowIdx, '', 's');
    }

    // J: Cột kết quả với công thức gốc Excel
    // =IF(E5="Tỷ lệ %", IF(OR(G5="", H5="", H5=0), "", G5/H5*100), IF(OR(E5="Số sự cố", E5="Điểm đánh giá"), I5, ""))
    const fJ = `IF(E${excelRow}="Tỷ lệ %", IF(OR(G${excelRow}="", H${excelRow}="", H${excelRow}=0), "", G${excelRow}/H${excelRow}*100), IF(OR(E${excelRow}="Số sự cố", E${excelRow}="Điểm đánh giá"), I${excelRow}, ""))`;
    if (item.calculatedResult !== null && item.calculatedResult !== undefined) {
      setCell(9, rowIdx, item.calculatedResult, 'n', fJ, '0.00');
    } else {
      setCell(9, rowIdx, '', 's', fJ);
    }

    // K: Mức KPI với công thức gốc Excel
    const fK = `IF(J${excelRow}="", "", IF(A${excelRow}="D1", IF(J${excelRow}>=95, "Xuất sắc", IF(J${excelRow}>=85, "Tốt", IF(J${excelRow}>=70, "Trung bình", "Không đạt"))), IF(F${excelRow}="Cao hơn tốt hơn", IF(J${excelRow}>=VLOOKUP(A${excelRow}, 'Cấu hình KPI'!$A$2:$D$27, 2, FALSE), "Xuất sắc", IF(J${excelRow}>=VLOOKUP(A${excelRow}, 'Cấu hình KPI'!$A$2:$D$27, 3, FALSE), "Tốt", IF(J${excelRow}>=VLOOKUP(A${excelRow}, 'Cấu hình KPI'!$A$2:$D$27, 4, FALSE), "Trung bình", "Không đạt"))), IF(J${excelRow}<=VLOOKUP(A${excelRow}, 'Cấu hình KPI'!$A$2:$D$27, 2, FALSE), "Xuất sắc", IF(J${excelRow}<=VLOOKUP(A${excelRow}, 'Cấu hình KPI'!$A$2:$D$27, 3, FALSE), "Tốt", IF(J${excelRow}<=VLOOKUP(A${excelRow}, 'Cấu hình KPI'!$A$2:$D$27, 4, FALSE), "Trung bình", "Không đạt"))))))`;
    setCell(10, rowIdx, item.ratingLevel || '', 's', fK);

    // L: Điểm KPI với công thức gốc Excel
    // =IF(K5="", "", IF(K5="Xuất sắc", 100, IF(K5="Tốt", 85, IF(K5="Trung bình", 70, 0))))
    const fL = `IF(K${excelRow}="", "", IF(K${excelRow}="Xuất sắc", 100, IF(K${excelRow}="Tốt", 85, IF(K${excelRow}="Trung bình", 70, 0))))`;
    if (item.score !== null && item.score !== undefined) {
      setCell(11, rowIdx, item.score, 'n', fL, '0');
    } else {
      setCell(11, rowIdx, '', 's', fL);
    }

    // M: Điểm quy đổi với công thức gốc Excel
    // =IF(L5="", "", L5 * D5)
    const fM = `IF(L${excelRow}="", "", L${excelRow} * D${excelRow})`;
    if (item.convertedScore !== null && item.convertedScore !== undefined) {
      setCell(12, rowIdx, item.convertedScore, 'n', fM, '0.00');
    } else {
      setCell(12, rowIdx, '', 's', fM);
    }

    // N: Ghi chú / Minh chứng
    setCell(13, rowIdx, item.notes || '', 's');

    // O: Ngoại lệ
    setCell(14, rowIdx, item.exceptionNotes || '', 's');
  });

  // ── Khối tổng hợp kết quả (Dòng 31 - 38 trong Excel, index 30 - 37) ──
  // Row 31 (idx 30): Điểm nhóm A
  setCell(1, 30, 'Điểm nhóm A (Mục tiêu chất lượng - Tối đa 30 điểm):', 's');
  setCell(12, 30, data.scoreGroupA, 'n', 'SUMIF(C5:C30, "A", M5:M30)', '0.00');

  // Row 32 (idx 31): Điểm nhóm B
  setCell(1, 31, 'Điểm nhóm B (Vận hành & Kỹ thuật - Tối đa 35 điểm):', 's');
  setCell(12, 31, data.scoreGroupB, 'n', 'SUMIF(C5:C30, "B", M5:M30)', '0.00');

  // Row 33 (idx 32): Điểm nhóm C
  setCell(1, 32, 'Điểm nhóm C (An toàn & Quản lý - Tối đa 20 điểm):', 's');
  setCell(12, 32, data.scoreGroupC, 'n', 'SUMIF(C5:C30, "C", M5:M30)', '0.00');

  // Row 34 (idx 33): Điểm nhóm D
  setCell(1, 33, 'Điểm nhóm D (Hiệu quả & Tài chính - Tối đa 15 điểm):', 's');
  setCell(12, 33, data.scoreGroupD, 'n', 'SUMIF(C5:C30, "D", M5:M30)', '0.00');

  // Row 35 (idx 34): Điểm tổng hợp
  setCell(1, 34, 'TỔNG ĐIỂM KPI (Thang điểm 100):', 's');
  setCell(12, 34, data.totalScore, 'n', 'SUM(M5:M30)', '0.00');

  // Row 36 (idx 35): Xếp loại theo điểm
  setCell(1, 35, 'XẾP LOẠI THEO ĐIỂM (≥95 XS, ≥85 Tốt, ≥70 TB, <70 Không đạt):', 's');
  setCell(12, 35, data.scoreRating, 's', 'IF(M35>=95, "Xuất sắc", IF(M35>=85, "Tốt", IF(M35>=70, "Trung bình", "Không đạt")))');

  // Row 37 (idx 36): Điều kiện chặn
  setCell(1, 36, 'ĐIỀU KIỆN CHẶN / CẢNH BÁO QUẢN TRỊ:', 's');
  setCell(12, 36, data.blockingNote || 'Không có điều kiện chặn', 's');

  // Row 38 (idx 37): Xếp loại cuối cùng / Kết luận quản trị
  setCell(1, 37, 'KẾT LUẬN QUẢN TRỊ CUỐI CÙNG:', 's');
  setCell(12, 37, data.finalRating || data.scoreRating, 's');

  // Row 39 (idx 38): Căn cứ / Người quyết định
  if (data.finalConclusionNotes || data.decidedBy) {
    setCell(1, 38, `Căn cứ / Ghi chú: ${data.finalConclusionNotes || ''} (Người duyệt: ${data.decidedBy || data.approvedByUserName || 'Lãnh đạo'})`, 's');
  }

  // Căn chỉnh độ rộng cột chuẩn
  ws1['!cols'] = [
    { wch: 10 }, // A: Mã KPI
    { wch: 45 }, // B: Tên chỉ số KPI
    { wch: 8 },  // C: Nhóm
    { wch: 12 }, // D: Trọng số
    { wch: 14 }, // E: Đơn vị
    { wch: 18 }, // F: Chiều
    { wch: 12 }, // G: Tử số
    { wch: 12 }, // H: Mẫu số
    { wch: 12 }, // I: Giá trị đo
    { wch: 24 }, // J: Kết quả
    { wch: 14 }, // K: Mức KPI
    { wch: 12 }, // L: Điểm KPI
    { wch: 14 }, // M: Điểm quy đổi
    { wch: 30 }, // N: Ghi chú
    { wch: 25 }, // O: Ngoại lệ
  ];

  ws1['!ref'] = XLSX.utils.encode_range(range1);
  XLSX.utils.book_append_sheet(wb, ws1, 'KPI Tổng hợp');

  // ═════════════════════════════════════════════════════════════════════════════
  // SHEET 2: Cấu hình KPI
  // ═════════════════════════════════════════════════════════════════════════════
  const ws2Data: (string | number | null)[][] = [
    [
      'Mã KPI',
      'Ngưỡng Xuất sắc',
      'Ngưỡng Tốt',
      'Ngưỡng Trung bình',
      'Tên chỉ số KPI',
      'Nhóm',
      'Trọng số',
      'Đơn vị tính',
      'Chiều đánh giá',
      'Ghi chú tiêu chí'
    ]
  ];

  sortedLines.forEach(l => {
    ws2Data.push([
      l.code,
      l.thresholdExcellent,
      l.thresholdGood,
      l.thresholdAverage,
      l.name,
      l.group,
      l.weight,
      l.unit,
      l.evaluationDirection,
      l.code === 'D1' ? 'Chấm điểm 0-100 (≥95 XS, ≥85 Tốt, ≥70 TB)' : ''
    ]);
  });

  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
  ws2['!cols'] = [
    { wch: 10 }, // Mã
    { wch: 16 }, // XS
    { wch: 16 }, // Tốt
    { wch: 18 }, // TB
    { wch: 45 }, // Tên
    { wch: 8 },  // Nhóm
    { wch: 12 }, // Trọng số
    { wch: 14 }, // Đơn vị
    { wch: 18 }, // Chiều
    { wch: 40 }  // Ghi chú
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Cấu hình KPI');

  // ═════════════════════════════════════════════════════════════════════════════
  // SHEET 3: Hướng dẫn
  // ═════════════════════════════════════════════════════════════════════════════
  const ws3Data = [
    ['HƯỚNG DẪN ĐÁNH GIÁ CHỈ SỐ HIỆU QUẢ CÔNG VIỆC (KPI) - PHIÊN BẢN 2.0'],
    ['BỆNH VIỆN QUÂN Y 87'],
    [''],
    ['1. NGUYÊN TẮC NHẬP LIỆU'],
    ['  - Người dùng chỉ nhập số liệu thực tế tại các cột G, H, I theo đúng hướng dẫn.'],
    ['  - Tuyệt đối không sửa các cột J, K, L, M vì đây là các ô tự động tính bằng công thức Excel gốc.'],
    ['  - Cột N (Ghi chú/Minh chứng) và Cột O (Ngoại lệ) dùng để bổ trợ, đính kèm giải trình theo quyền.'],
    [''],
    ['2. HƯỚNG DẪN CÁC LOẠI CHỈ SỐ'],
    ['  - KPI Tỷ lệ %: Nhập Tử số tại cột G, Mẫu số tại cột H. Cột J tự động tính: G / H * 100.'],
    ['  - KPI Số sự cố (A7, C6): Nhập số sự cố phát sinh tại cột I. Cột J tự động lấy giá trị I.'],
    ['    * ĐẶC BIỆT: Nếu ô I để trống (chưa nhập), công thức Excel gốc quy về 0 => J=0 đúng chuẩn mẫu.'],
    ['  - KPI Điểm đánh giá (D1): Nhập điểm 0-100 tại cột I theo bộ tiêu chí kiểm soát chi phí mua sắm do BV phê duyệt.'],
    ['    * Điểm quy đổi M của D1 lấy Điểm quy đổi L nhân Trọng số (L * D), không lấy I nhân D.'],
    [''],
    ['3. QUY TẮC QUY ĐỔI ĐIỂM (CỘT L & M)'],
    ['  - Mức Xuất sắc: 100 điểm.'],
    ['  - Mức Tốt: 85 điểm.'],
    ['  - Mức Trung bình: 70 điểm.'],
    ['  - Mức Không đạt: 0 điểm.'],
    ['  - Điểm quy đổi (M) = Điểm KPI (L) * Trọng số (D).'],
    ['  - Tổng điểm tối đa toàn bộ 26 chỉ số là 100 điểm (Nhóm A: 30, B: 35, C: 20, D: 15).'],
    [''],
    ['4. XẾP LOẠI THEO ĐIỂM & ĐIỀU KIỆN CHẶN'],
    ['  - Tổng điểm ≥ 95: Xuất sắc.'],
    ['  - Tổng điểm 85 đến < 95: Tốt.'],
    ['  - Tổng điểm 70 đến < 85: Trung bình.'],
    ['  - Tổng điểm < 70: Không đạt.'],
    ['  - Cờ xem xét quản trị: Khi có chỉ số Không đạt hoặc có sự cố nghiêm trọng/vi phạm.'],
    ['  - Kết luận cuối cùng do Lãnh đạo phê duyệt trên cơ sở điểm số và các điều kiện chặn.']
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
  ws3['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Hướng dẫn');

  // Xuất file tải về
  const cleanDept = data.departmentName.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  const cleanPeriod = data.periodName.replace(/[^a-zA-Z0-9_]/g, '_');
  const fileName = `BangDanhGia_KPI_${cleanDept}_${cleanPeriod}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
