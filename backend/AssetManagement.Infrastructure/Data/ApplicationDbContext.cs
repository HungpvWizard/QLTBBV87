using AssetManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Role> Roles { get; set; } = null!;
    public DbSet<Department> Departments { get; set; } = null!;
    public DbSet<Category> Categories { get; set; } = null!;
    public DbSet<Warehouse> Warehouses { get; set; } = null!;
    public DbSet<Asset> Assets { get; set; } = null!;
    public DbSet<AssetTransfer> AssetTransfers { get; set; } = null!;
    public DbSet<MaintenanceTicket> MaintenanceTickets { get; set; } = null!;
    public DbSet<RepairRequest> RepairRequests { get; set; } = null!;
    public DbSet<Equipment> Equipments { get; set; } = null!;
    public DbSet<DeviceUsageLog> DeviceUsageLogs { get; set; } = null!;
    public DbSet<SecurityAuditLog> SecurityAuditLogs { get; set; } = null!;
    public DbSet<KpiDefinition> KpiDefinitions { get; set; } = null!;
    public DbSet<KpiAssessment> KpiAssessments { get; set; } = null!;
    public DbSet<KpiAssessmentLine> KpiAssessmentLines { get; set; } = null!;
    public DbSet<KpiAudit> KpiAudits { get; set; } = null!;
    public DbSet<AppModule> AppModules { get; set; } = null!;
    public DbSet<UserPermission> UserPermissions { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure relations
        modelBuilder.Entity<AssetTransfer>()
            .HasOne(at => at.FromUser)
            .WithMany()
            .HasForeignKey(at => at.FromUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AssetTransfer>()
            .HasOne(at => at.ToUser)
            .WithMany()
            .HasForeignKey(at => at.ToUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // KPI Relations & Indexes
        modelBuilder.Entity<KpiDefinition>()
            .HasIndex(d => new { d.Version, d.Code })
            .IsUnique();

        modelBuilder.Entity<KpiAssessment>()
            .HasMany(a => a.Lines)
            .WithOne(l => l.Assessment)
            .HasForeignKey(l => l.AssessmentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<KpiAssessment>()
            .HasMany(a => a.Audits)
            .WithOne(au => au.Assessment)
            .HasForeignKey(au => au.AssessmentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<KpiAssessmentLine>()
            .HasIndex(l => new { l.AssessmentId, l.KpiCode })
            .IsUnique();

        modelBuilder.Entity<AppModule>()
            .HasIndex(m => m.Code)
            .IsUnique();

        modelBuilder.Entity<UserPermission>()
            .HasIndex(p => new { p.UserId, p.ModuleCode })
            .IsUnique();

        modelBuilder.Entity<UserPermission>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Seed initial roles
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "Admin" },
            new Role { Id = 2, Name = "Manager" },
            new Role { Id = 3, Name = "Staff" }
        );
    }
}
