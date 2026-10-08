namespace AssetManagement.Domain.Entities;

public enum TicketStatus
{
    Open = 1,
    InProgress = 2,
    Resolved = 3,
    Closed = 4
}

public class MaintenanceTicket : BaseEntity
{
    public int AssetId { get; set; }
    public Asset? Asset { get; set; }

    public int? ReportedByUserId { get; set; }
    public User? ReportedByUser { get; set; }

    public string IssueDescription { get; set; } = string.Empty;
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public decimal Cost { get; set; }
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ScheduledDate { get; set; }
    public DateTime? CompletedDate { get; set; }
}
