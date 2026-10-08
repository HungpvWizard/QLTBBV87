using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;

namespace AssetManagement.WebAPI.Services;

public interface IAuditLogService
{
    Task LogAsync(string action, string username, string? ipAddress, string? details, bool isSuccess = true);
}

public class AuditLogService : IAuditLogService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuditLogService> _logger;

    public AuditLogService(IServiceScopeFactory scopeFactory, ILogger<AuditLogService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task LogAsync(string action, string username, string? ipAddress, string? details, bool isSuccess = true)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var log = new SecurityAuditLog
            {
                Action = action,
                Username = string.IsNullOrWhiteSpace(username) ? "anonymous" : username.Trim(),
                IpAddress = ipAddress,
                Details = details,
                IsSuccess = isSuccess,
                Timestamp = DateTime.Now
            };

            db.SecurityAuditLogs.Add(log);
            await db.SaveChangesAsync();

            _logger.LogInformation("[SECURITY AUDIT] {Action} by {Username} from {IpAddress} (Success: {IsSuccess})",
                action, username, ipAddress ?? "unknown", isSuccess);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SECURITY AUDIT FAILED] Could not write audit log for {Action}", action);
        }
    }
}
