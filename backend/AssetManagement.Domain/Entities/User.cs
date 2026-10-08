namespace AssetManagement.Domain.Entities;

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime? LastLoginAt { get; set; }

    public int RoleId { get; set; }
    public Role? Role { get; set; }

    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }

    public ICollection<Asset> Assets { get; set; } = new List<Asset>();
}

