namespace AssetManagement.Domain.Entities;

/// <summary>Phan cap chat luong thiet bi</summary>
public enum QualityGrade
{
    Cap1 = 1, // Cấp 1
    Cap2 = 2, // Cấp 2
    Cap3 = 3, // Cấp 3
    Cap4 = 4, // Cấp 4
    Cap5 = 5, // Cấp 5
    Cap6 = 6  // Cấp 6
}

public class Equipment : BaseEntity
{
    public string Name { get; set; } = string.Empty;           // Ten thiet bi
    public string Code { get; set; } = string.Empty;           // Ma thiet bi
    public string Unit { get; set; } = string.Empty;           // Don vi tinh
    public int Quantity { get; set; } = 1;                     // So luong
    public string UsingUnit { get; set; } = string.Empty;      // Don vi su dung

    public int? ManufactureYear { get; set; }                  // Nam san xuat
    public int? UseYear { get; set; }                          // Nam su dung
    public DateTime? ExpiryDate { get; set; }                  // Hạn sử dụng
    public string WarrantyPeriod { get; set; } = string.Empty; // Thoi gian bao hanh

    public QualityGrade? QualityGrade { get; set; }            // Phan cap chat luong

    public string Notes { get; set; } = string.Empty;          // Ghi chu

    // FK Danh muc
    public int CategoryId { get; set; }
    public Category? Category { get; set; }
}
