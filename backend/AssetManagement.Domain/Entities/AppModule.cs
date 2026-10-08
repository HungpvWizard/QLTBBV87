namespace AssetManagement.Domain.Entities;

public class AppModule : BaseEntity
{
    public string Code { get; set; } = string.Empty; // Mã chức năng duy nhất, ví dụ: 'assets', 'equipments', 'kpi'...
    public string Name { get; set; } = string.Empty; // Tên hiển thị: 'Tài sản & Thiết bị', 'Quản lý Thiết bị'...
    public string Group { get; set; } = "Nghiệp vụ"; // Nhóm: 'Quản lý nghiệp vụ', 'Báo cáo & Đánh giá', 'Hệ thống'...
    public string? Description { get; set; } // Mô tả chức năng
    public int OrderIndex { get; set; } = 0; // Thứ tự hiển thị
    public bool IsActive { get; set; } = true; // Trạng thái kích hoạt
    public bool IsSystem { get; set; } = true; // True: chức năng mặc định hệ thống; False: chức năng mở rộng do người dùng tự tạo
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
