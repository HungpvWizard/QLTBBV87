namespace AssetManagement.Domain.Entities;

public class KpiAssessment : BaseEntity
{
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public string DepartmentName { get; set; } = string.Empty;

    public string PeriodType { get; set; } = "Tháng"; // "Tháng", "Quý", "Năm"
    public int PeriodYear { get; set; }
    public int? PeriodQuarter { get; set; }
    public int? PeriodMonth { get; set; }
    public string PeriodName { get; set; } = string.Empty; // "Tháng 10/2026"
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public int ConfigVersion { get; set; } = 1;
    public string Status { get; set; } = "Draft"; // "Draft", "Submitted", "Approved"
    public int Revision { get; set; } = 1;

    public int? CreatedByUserId { get; set; }
    public string? CreatedByUserName { get; set; }
    public int? ApprovedByUserId { get; set; }
    public string? ApprovedByUserName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;

    // Điểm nhóm & tổng hợp (chỉ lưu kết quả tính chuẩn từ Server)
    public decimal ScoreGroupA { get; set; }
    public decimal ScoreGroupB { get; set; }
    public decimal ScoreGroupC { get; set; }
    public decimal ScoreGroupD { get; set; }
    public decimal TotalScore { get; set; }
    public string ScoreRating { get; set; } = "Không đạt"; // Xuất sắc, Tốt, Trung bình, Không đạt

    // Điều kiện chặn & cờ quản trị
    public bool HasFailKpi { get; set; }
    public bool HasSevereIncidents { get; set; }
    public bool HasOverdueDevicesUsed { get; set; }
    public bool HasLegalViolations { get; set; }
    public string? BlockingNote { get; set; }

    // Kết luận quản trị cuối cùng
    public string? FinalRating { get; set; } // Xuất sắc, Tốt, Trung bình, Không đạt, Chờ xem xét
    public string? FinalConclusionNotes { get; set; }
    public string? DecidedBy { get; set; }
    public DateTime? DecisionDate { get; set; }
    public string? DecisionReference { get; set; }

    public ICollection<KpiAssessmentLine> Lines { get; set; } = new List<KpiAssessmentLine>();
    public ICollection<KpiAudit> Audits { get; set; } = new List<KpiAudit>();
}
