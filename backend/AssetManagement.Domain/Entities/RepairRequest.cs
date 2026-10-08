namespace AssetManagement.Domain.Entities;

public class RepairRequest : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    // Khoa phòng yêu cầu
    public int DepartmentId { get; set; }
    public Department? Department { get; set; }

    // Thông tin tùy chọn: Nếu biết đích danh thiết bị hỏng
    public int? AssetId { get; set; }
    public Asset? Asset { get; set; }

    // Trạng thái: 1 = Đang chờ tiếp nhận, 2 = Đang xử lý, 3 = Hoàn thành, 4 = Từ chối
    public int Status { get; set; } = 1;

    // Phản hồi / Hướng xử lý từ Phòng Vật Tư
    public string? HandlingNotes { get; set; }
    
    // Người tiếp nhận / trực tiếp xử lý
    public string? HandlerName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
