namespace AssetManagement.Domain.Entities;

public class UserPermission : BaseEntity
{
    public int UserId { get; set; }
    public User? User { get; set; }

    public string ModuleCode { get; set; } = string.Empty; // Khớp với AppModule.Code

    public bool CanView { get; set; } = true;   // Quyền Xem chức năng
    public bool CanCreate { get; set; } = false; // Quyền Thêm mới / Nhập dữ liệu
    public bool CanEdit { get; set; } = false;   // Quyền Chỉnh sửa
    public bool CanDelete { get; set; } = false; // Quyền Xóa
    public bool CanExport { get; set; } = false; // Quyền Xuất file (Excel, PDF)

    public DateTime UpdatedAt { get; set; } = DateTime.Now;
}
