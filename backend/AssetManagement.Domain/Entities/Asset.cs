namespace AssetManagement.Domain.Entities;

public enum AssetStatus
{
    Available = 1,
    InUse = 2,
    Maintenance = 3,
    Broken = 4,
    Disposed = 5
}

public class Asset : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string AssetTag { get; set; } = string.Empty; // QR Code Data
    public string Serial { get; set; } = string.Empty;
    public DateTime PurchaseDate { get; set; }
    public decimal Price { get; set; }
    public AssetStatus Status { get; set; } = AssetStatus.Available;

    // Các trường bổ sung theo yêu cầu
    public int Quantity { get; set; } = 1;
    public int? ManufactureYear { get; set; }
    public string Manufacturer { get; set; } = string.Empty;

    // Các trường y tế / thông tin chi tiết mở rộng
    public string KyHieu { get; set; } = string.Empty;
    public string NuocSX { get; set; } = string.Empty;
    public int? NamSD { get; set; }
    public string SoLuuHanh { get; set; } = string.Empty;
    public DateTime? HdTu { get; set; }
    public DateTime? HdDen { get; set; }
    public DateTime? TuNgay { get; set; }
    public DateTime? DenNgay { get; set; }
    public string LegacyId { get; set; } = string.Empty;

    public int CategoryId { get; set; }
    public Category? Category { get; set; }

    public int? AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }

    public string? CurrentDepartment { get; set; }
    public int? DepartmentId { get; set; }

    public ICollection<AssetTransfer> Transfers { get; set; } = new List<AssetTransfer>();
}
