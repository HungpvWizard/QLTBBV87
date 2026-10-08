namespace AssetManagement.Domain.Entities;

public class KpiDefinition : BaseEntity
{
    public int Version { get; set; } = 1;
    public string Code { get; set; } = string.Empty; // A1..D5
    public string Name { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty; // A, B, C, D
    public decimal Weight { get; set; } // 0.07, 0.05, etc.
    public string Unit { get; set; } = string.Empty; // "Tỷ lệ %", "Số sự cố", "Điểm đánh giá"
    public string EvaluationDirection { get; set; } = string.Empty; // "Cao hơn tốt hơn", "Thấp hơn tốt hơn", "Theo bộ tiêu chí"
    public decimal? ThresholdExcellent { get; set; } // Ngưỡng Xuất sắc
    public decimal? ThresholdGood { get; set; } // Ngưỡng Tốt
    public decimal? ThresholdAverage { get; set; } // Ngưỡng Trung bình
    public int OrderIndex { get; set; }
    public string? CriteriaNote { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
