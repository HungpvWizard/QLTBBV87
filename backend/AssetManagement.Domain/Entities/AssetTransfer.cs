namespace AssetManagement.Domain.Entities;

public class AssetTransfer : BaseEntity
{
    public int AssetId { get; set; }
    public Asset? Asset { get; set; }

    public int? FromUserId { get; set; }
    public User? FromUser { get; set; }

    public int? ToUserId { get; set; }
    public User? ToUser { get; set; }

    public DateTime TransferDate { get; set; } = DateTime.UtcNow;
    public string Notes { get; set; } = string.Empty;

    // Phase 2 additions
    public string SignatureData { get; set; } = string.Empty; // Base64 signature image
    public string DocumentUrl { get; set; } = string.Empty; // PDF path
}
