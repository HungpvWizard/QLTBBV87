namespace AssetManagement.Domain.Entities;

public class KpiAudit : BaseEntity
{
    public int AssessmentId { get; set; }
    public KpiAssessment? Assessment { get; set; }

    public string Action { get; set; } = string.Empty; // CREATE, UPDATE, SUBMIT, APPROVE, REOPEN, DECISION
    public string PerformedBy { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
