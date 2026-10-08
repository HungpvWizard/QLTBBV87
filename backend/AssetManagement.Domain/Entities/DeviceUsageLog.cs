namespace AssetManagement.Domain.Entities;

public class DeviceUsageLog : BaseEntity
{
    public int AssetId { get; set; }
    public Asset? Asset { get; set; }

    public string UsageDate { get; set; } = string.Empty; // YYYY-MM-DD
    public int UsageCount { get; set; } = 1; // Số lượt / ca sử dụng trong ngày

    public string? DepartmentName { get; set; }
    public string? RecordedBy { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
