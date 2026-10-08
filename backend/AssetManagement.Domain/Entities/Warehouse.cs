namespace AssetManagement.Domain.Entities;

public class Warehouse : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ICollection<Category> Categories { get; set; } = new List<Category>();
}
