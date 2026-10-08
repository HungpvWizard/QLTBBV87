namespace AssetManagement.Application.Services;

using AssetManagement.Domain.Entities;

public record KpiCalculationResult(
    decimal? CalculatedResult,  // J
    string? RatingLevel,        // K
    decimal? Score,             // L
    decimal? ConvertedScore     // M
);

public record KpiAssessmentSummary(
    decimal ScoreGroupA,
    decimal ScoreGroupB,
    decimal ScoreGroupC,
    decimal ScoreGroupD,
    decimal TotalScore,
    string ScoreRating,
    bool HasFailKpi,
    bool HasSevereIncidents,
    string? BlockingNote,
    string FinalRating
);

public static class KpiEngine
{
    /// <summary>
    /// Tính toán các cột J, K, L, M cho 1 dòng KPI theo đúng công thức gốc trong KPI.md v2.0
    /// </summary>
    public static KpiCalculationResult CalculateLine(
        string code,
        string unit,
        string direction,
        decimal weight,
        decimal? thresholdExcellent,
        decimal? thresholdGood,
        decimal? thresholdAverage,
        decimal? numerator,       // G - Tử số
        decimal? denominator,     // H - Mẫu số
        decimal? actualValue)     // I - Giá trị đo
    {
        // 1. Cột J:
        // =IF(E5="Tỷ lệ %", IF(OR(G5="", H5="", H5=0), "", G5/H5*100), IF(OR(E5="Số sự cố", E5="Điểm đánh giá"), I5, ""))
        // Lưu ý: Trong Excel, khi tham chiếu ô I5 trống, Excel trả về 0.
        // Do đó với "Số sự cố" và "Điểm đánh giá", nếu I trống (null), J = 0m.
        decimal? j = null;
        if (unit == "Tỷ lệ %")
        {
            if (numerator.HasValue && denominator.HasValue && denominator.Value != 0m)
            {
                j = (numerator.Value / denominator.Value) * 100m;
            }
            else
            {
                j = null;
            }
        }
        else if (unit == "Số sự cố" || unit == "Điểm đánh giá")
        {
            j = actualValue ?? 0m;
        }

        // 2. Cột K:
        // =IF(J5="", "", 
        //   IF(A5="D1", 
        //     IF(J5>=95, "Xuất sắc", IF(J5>=85, "Tốt", IF(J5>=70, "Trung bình", "Không đạt"))), 
        //     IF(F5="Cao hơn tốt hơn", 
        //       IF(J5>=NgưỡngXS, "Xuất sắc", IF(J5>=NgưỡngTốt, "Tốt", IF(J5>=NgưỡngTB, "Trung bình", "Không đạt"))), 
        //       IF(J5<=NgưỡngXS, "Xuất sắc", IF(J5<=NgưỡngTốt, "Tốt", IF(J5<=NgưỡngTB, "Trung bình", "Không đạt")))
        //     )
        //   )
        // )
        string? k = null;
        if (j.HasValue)
        {
            var val = j.Value;
            if (code == "D1")
            {
                if (val >= 95m) k = "Xuất sắc";
                else if (val >= 85m) k = "Tốt";
                else if (val >= 70m) k = "Trung bình";
                else k = "Không đạt";
            }
            else if (direction == "Cao hơn tốt hơn")
            {
                if (thresholdExcellent.HasValue && val >= thresholdExcellent.Value) k = "Xuất sắc";
                else if (thresholdGood.HasValue && val >= thresholdGood.Value) k = "Tốt";
                else if (thresholdAverage.HasValue && val >= thresholdAverage.Value) k = "Trung bình";
                else k = "Không đạt";
            }
            else // "Thấp hơn tốt hơn"
            {
                if (thresholdExcellent.HasValue && val <= thresholdExcellent.Value) k = "Xuất sắc";
                else if (thresholdGood.HasValue && val <= thresholdGood.Value) k = "Tốt";
                else if (thresholdAverage.HasValue && val <= thresholdAverage.Value) k = "Trung bình";
                else k = "Không đạt";
            }
        }

        // 3. Cột L:
        // =IF(K5="", "", IF(K5="Xuất sắc", 100, IF(K5="Tốt", 85, IF(K5="Trung bình", 70, 0))))
        decimal? l = null;
        if (!string.IsNullOrEmpty(k))
        {
            switch (k)
            {
                case "Xuất sắc":
                    l = 100m;
                    break;
                case "Tốt":
                    l = 85m;
                    break;
                case "Trung bình":
                    l = 70m;
                    break;
                default:
                    l = 0m;
                    break;
            }
        }

        // 4. Cột M:
        // =IF(L5="", "", L5 * D5)
        decimal? m = null;
        if (l.HasValue)
        {
            m = l.Value * weight;
        }

        return new KpiCalculationResult(j, k, l, m);
    }

    /// <summary>
    /// Tổng hợp điểm nhóm A, B, C, D, điểm tổng hợp, xếp loại theo điểm và điều kiện chặn
    /// </summary>
    public static KpiAssessmentSummary CalculateAssessmentSummary(IEnumerable<KpiAssessmentLine> lines)
    {
        decimal sumA = 0m;
        decimal sumB = 0m;
        decimal sumC = 0m;
        decimal sumD = 0m;
        bool hasFail = false;
        bool hasSevere = false;

        foreach (var line in lines)
        {
            if (line.ConvertedScore.HasValue)
            {
                switch (line.Group)
                {
                    case "A": sumA += line.ConvertedScore.Value; break;
                    case "B": sumB += line.ConvertedScore.Value; break;
                    case "C": sumC += line.ConvertedScore.Value; break;
                    case "D": sumD += line.ConvertedScore.Value; break;
                }
            }

            if (line.RatingLevel == "Không đạt")
            {
                hasFail = true;
            }

            if (line.KpiCode == "C6" && (line.ActualValue ?? 0m) > 0m)
            {
                hasSevere = true;
            }
        }

        decimal total = sumA + sumB + sumC + sumD;

        string scoreRating;
        if (total >= 95m) scoreRating = "Xuất sắc";
        else if (total >= 85m) scoreRating = "Tốt";
        else if (total >= 70m) scoreRating = "Trung bình";
        else scoreRating = "Không đạt";

        string? blockingNote = null;
        if (hasFail)
        {
            blockingNote = "Có KPI không đạt – cần xem xét";
        }
        else if (hasSevere)
        {
            blockingNote = "Có sự cố nghiêm trọng do lỗi quản lý – cần xem xét";
        }

        string finalRating;
        if (total < 70m)
        {
            finalRating = "Không đạt";
        }
        else if (hasFail || hasSevere)
        {
            finalRating = "Chờ xem xét";
        }
        else
        {
            finalRating = scoreRating;
        }

        return new KpiAssessmentSummary(
            sumA, sumB, sumC, sumD, total, scoreRating, hasFail, hasSevere, blockingNote, finalRating);
    }

    /// <summary>
    /// Khởi tạo danh mục 26 KPI chuẩn theo KPI.md phiên bản 2.0
    /// </summary>
    public static List<KpiDefinition> GetStandardDefinitions(int version = 1)
    {
        return new List<KpiDefinition>
        {
            // Nhóm A (7 chỉ số, 30%)
            new() { Version = version, OrderIndex = 1, Code = "A1", Name = "Tỷ lệ đáp ứng nhu cầu hóa chất, VTYT", Group = "A", Weight = 0.07m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 99m, ThresholdGood = 97m, ThresholdAverage = 95m },
            new() { Version = version, OrderIndex = 2, Code = "A2", Name = "Tỷ lệ cung ứng đúng thời hạn", Group = "A", Weight = 0.05m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 99m, ThresholdGood = 97m, ThresholdAverage = 95m },
            new() { Version = version, OrderIndex = 3, Code = "A3", Name = "Hoàn thành đấu thầu, mua sắm đúng tiến độ", Group = "A", Weight = 0.06m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 98m, ThresholdGood = 95m, ThresholdAverage = 90m },
            new() { Version = version, OrderIndex = 4, Code = "A4", Name = "Hồ sơ không phải tổ chức lại do lỗi chủ quan", Group = "A", Weight = 0.04m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 99m, ThresholdGood = 97m, ThresholdAverage = 95m },
            new() { Version = version, OrderIndex = 5, Code = "A5", Name = "Kiểm soát tồn kho hóa chất, VTYT", Group = "A", Weight = 0.04m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 98m, ThresholdGood = 95m, ThresholdAverage = 90m },
            new() { Version = version, OrderIndex = 6, Code = "A6", Name = "Giá trị hàng hết hạn/không sử dụng được", Group = "A", Weight = 0.02m, Unit = "Tỷ lệ %", EvaluationDirection = "Thấp hơn tốt hơn", ThresholdExcellent = 0.1m, ThresholdGood = 0.3m, ThresholdAverage = 0.5m },
            new() { Version = version, OrderIndex = 7, Code = "A7", Name = "Sự cố thiếu hóa chất, VTYT ảnh hưởng chuyên môn", Group = "A", Weight = 0.02m, Unit = "Số sự cố", EvaluationDirection = "Thấp hơn tốt hơn", ThresholdExcellent = 0m, ThresholdGood = 1m, ThresholdAverage = 2m },

            // Nhóm B (8 chỉ số, 35%)
            new() { Version = version, OrderIndex = 8, Code = "B1", Name = "Tỷ lệ TTBYT sẵn sàng phục vụ", Group = "B", Weight = 0.09m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 98m, ThresholdGood = 96m, ThresholdAverage = 93m },
            new() { Version = version, OrderIndex = 9, Code = "B2", Name = "Bảo trì, bảo dưỡng đúng kế hoạch", Group = "B", Weight = 0.06m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 99m, ThresholdGood = 97m, ThresholdAverage = 95m },
            new() { Version = version, OrderIndex = 10, Code = "B3", Name = "Kiểm định/hiệu chuẩn đúng hạn", Group = "B", Weight = 0.06m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 100m, ThresholdGood = 98m, ThresholdAverage = 95m },
            new() { Version = version, OrderIndex = 11, Code = "B4", Name = "Xử lý sự cố trong thời gian cam kết", Group = "B", Weight = 0.05m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 98m, ThresholdGood = 95m, ThresholdAverage = 90m },
            new() { Version = version, OrderIndex = 12, Code = "B5", Name = "Thiết bị hư hỏng được khôi phục đúng hạn", Group = "B", Weight = 0.03m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 98m, ThresholdGood = 95m, ThresholdAverage = 90m },
            new() { Version = version, OrderIndex = 13, Code = "B6", Name = "Hồ sơ quản lý TTBYT đầy đủ", Group = "B", Weight = 0.02m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 100m, ThresholdGood = 98m, ThresholdAverage = 95m },
            new() { Version = version, OrderIndex = 14, Code = "B7", Name = "Thiết bị mua mới đưa vào sử dụng đúng tiến độ", Group = "B", Weight = 0.02m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 98m, ThresholdGood = 95m, ThresholdAverage = 90m },
            new() { Version = version, OrderIndex = 15, Code = "B8", Name = "Thiết bị ngừng hoạt động kéo dài", Group = "B", Weight = 0.02m, Unit = "Tỷ lệ %", EvaluationDirection = "Thấp hơn tốt hơn", ThresholdExcellent = 0.5m, ThresholdGood = 1.0m, ThresholdAverage = 2.0m },

            // Nhóm C (6 chỉ số, 20%)
            new() { Version = version, OrderIndex = 16, Code = "C1", Name = "Tiêu chí/nội dung chất lượng thuộc phạm vi Khoa đạt yêu cầu", Group = "C", Weight = 0.05m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 98m, ThresholdGood = 95m, ThresholdAverage = 90m },
            new() { Version = version, OrderIndex = 17, Code = "C2", Name = "Khuyến cáo được khắc phục đúng hạn", Group = "C", Weight = 0.04m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 98m, ThresholdGood = 95m, ThresholdAverage = 90m },
            new() { Version = version, OrderIndex = 18, Code = "C3", Name = "Sự cố TTBYT được xử lý và phân tích nguyên nhân", Group = "C", Weight = 0.04m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 100m, ThresholdGood = 98m, ThresholdAverage = 95m },
            new() { Version = version, OrderIndex = 19, Code = "C4", Name = "Hoàn thành kế hoạch cải tiến chất lượng", Group = "C", Weight = 0.03m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 95m, ThresholdGood = 90m, ThresholdAverage = 80m },
            new() { Version = version, OrderIndex = 20, Code = "C5", Name = "Tuân thủ quy trình quản lý TTBYT", Group = "C", Weight = 0.02m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 98m, ThresholdGood = 95m, ThresholdAverage = 90m },
            new() { Version = version, OrderIndex = 21, Code = "C6", Name = "Sự cố nghiêm trọng do lỗi quản lý thuộc trách nhiệm Khoa", Group = "C", Weight = 0.02m, Unit = "Số sự cố", EvaluationDirection = "Thấp hơn tốt hơn", ThresholdExcellent = 0m, ThresholdGood = 0m, ThresholdAverage = 1m },

            // Nhóm D (5 chỉ số, 15%)
            new() { Version = version, OrderIndex = 22, Code = "D1", Name = "Kiểm soát chi phí mua sắm", Group = "D", Weight = 0.03m, Unit = "Điểm đánh giá", EvaluationDirection = "Theo bộ tiêu chí", ThresholdExcellent = null, ThresholdGood = null, ThresholdAverage = null, CriteriaNote = "Chấm điểm 0-100 theo tiêu chí phê duyệt (Mốc: ≥95 Xuất sắc, ≥85 Tốt, ≥70 Trung bình)" },
            new() { Version = version, OrderIndex = 23, Code = "D2", Name = "Giá trị tồn kho trong ngưỡng kiểm soát", Group = "D", Weight = 0.03m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 95m, ThresholdGood = 90m, ThresholdAverage = 80m },
            new() { Version = version, OrderIndex = 24, Code = "D3", Name = "Tiết kiệm chi phí từ giải pháp quản lý hợp lý", Group = "D", Weight = 0.03m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 5m, ThresholdGood = 3m, ThresholdAverage = 1m },
            new() { Version = version, OrderIndex = 25, Code = "D4", Name = "Hiệu quả khai thác, sử dụng TTBYT", Group = "D", Weight = 0.03m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 95m, ThresholdGood = 90m, ThresholdAverage = 80m },
            new() { Version = version, OrderIndex = 26, Code = "D5", Name = "Kiểm soát chi phí sửa chữa, bảo trì", Group = "D", Weight = 0.03m, Unit = "Tỷ lệ %", EvaluationDirection = "Cao hơn tốt hơn", ThresholdExcellent = 98m, ThresholdGood = 95m, ThresholdAverage = 90m },
        };
    }
}
