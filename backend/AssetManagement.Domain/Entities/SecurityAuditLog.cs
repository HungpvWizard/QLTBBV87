namespace AssetManagement.Domain.Entities;

public class SecurityAuditLog : BaseEntity
{
    public string Action { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? Details { get; set; }
    public bool IsSuccess { get; set; } = true;
    public DateTime Timestamp { get; set; } = DateTime.Now;
}
