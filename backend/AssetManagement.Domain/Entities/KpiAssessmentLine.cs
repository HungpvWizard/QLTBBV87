namespace AssetManagement.Domain.Entities;

public class KpiAssessmentLine : BaseEntity
{
    public int AssessmentId { get; set; }
    public KpiAssessment? Assessment { get; set; }

    public string KpiCode { get; set; } = string.Empty; // A1..D5
    public string KpiName { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty; // A, B, C, D
    public decimal Weight { get; set; } // 0.07, etc.
    public string Unit { get; set; } = string.Empty; // Tỷ lệ %, Số sự cố, Điểm đánh giá
    public string EvaluationDirection { get; set; } = string.Empty; // Cao hơn tốt hơn, Thấp hơn tốt hơn, Theo bộ tiêu chí
    public decimal? ThresholdExcellent { get; set; }
    public decimal? ThresholdGood { get; set; }
    public decimal? ThresholdAverage { get; set; }

    // Người dùng nhập (G, H, I)
    public decimal? Numerator { get; set; } // G - Tử số
    public decimal? Denominator { get; set; } // H - Mẫu số
    public decimal? ActualValue { get; set; } // I - Giá trị đo

    // Công thức tính J, K, L, M
    public decimal? CalculatedResult { get; set; } // J - Kết quả (%) / Giá trị đo
    public string? RatingLevel { get; set; } // K - Mức KPI (Xuất sắc, Tốt, Trung bình, Không đạt)
    public decimal? Score { get; set; } // L - Điểm KPI (100, 85, 70, 0)
    public decimal? ConvertedScore { get; set; } // M - Điểm quy đổi (L * Weight)

    // Thông tin bổ trợ (N, O)
    public string? Notes { get; set; } // N - Ghi chú / Minh chứng
    public string? ExceptionNotes { get; set; } // O - Ngoại lệ

    public string? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
