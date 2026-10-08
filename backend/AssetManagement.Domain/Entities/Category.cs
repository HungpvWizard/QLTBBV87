namespace AssetManagement.Domain.Entities;

public enum CategoryType
{
    Asset = 1,
    Consumable = 2
}

public class Category : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public CategoryType Type { get; set; }
    public int? WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }
    public ICollection<Asset> Assets { get; set; } = new List<Asset>();
}
