using System.Collections.Concurrent;

namespace AssetManagement.WebAPI.Services;

public interface ILoginRateLimiter
{
    bool IsLockedOut(string ipAddress, string username, out int remainingMinutes);
    void RecordFailedAttempt(string ipAddress, string username);
    void ResetAttempts(string ipAddress, string username);
    int GetRemainingAttempts(string ipAddress, string username);
}

public class LoginRateLimiter : ILoginRateLimiter
{
    private class AttemptRecord
    {
        public int FailedCount { get; set; } = 0;
        public DateTime FirstFailedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LockedUntil { get; set; }
    }

    private readonly ConcurrentDictionary<string, AttemptRecord> _attempts = new();
    private const int MaxFailedAttempts = 5;
    private const int LockoutDurationMinutes = 15;

    private static string GetKey(string ipAddress, string username)
    {
        var cleanIp = string.IsNullOrWhiteSpace(ipAddress) ? "unknown" : ipAddress.Trim();
        var cleanUser = string.IsNullOrWhiteSpace(username) ? "unknown" : username.Trim().ToLowerInvariant();
        return $"{cleanIp}_{cleanUser}";
    }

    public bool IsLockedOut(string ipAddress, string username, out int remainingMinutes)
    {
        remainingMinutes = 0;
        var key = GetKey(ipAddress, username);

        if (_attempts.TryGetValue(key, out var record) && record.LockedUntil.HasValue)
        {
            var now = DateTime.UtcNow;
            if (now < record.LockedUntil.Value)
            {
                remainingMinutes = (int)Math.Ceiling((record.LockedUntil.Value - now).TotalMinutes);
                if (remainingMinutes < 1) remainingMinutes = 1;
                return true;
            }
            else
            {
                // Hết thời gian khóa, tự động reset
                _attempts.TryRemove(key, out _);
            }
        }

        return false;
    }

    public void RecordFailedAttempt(string ipAddress, string username)
    {
        var key = GetKey(ipAddress, username);
        var now = DateTime.UtcNow;

        _attempts.AddOrUpdate(key,
            _ => new AttemptRecord
            {
                FailedCount = 1,
                FirstFailedAt = now
            },
            (_, existing) =>
            {
                // Nếu lần thử trước đã quá 15 phút, bắt đầu tính lại từ đầu
                if ((now - existing.FirstFailedAt).TotalMinutes > LockoutDurationMinutes)
                {
                    existing.FailedCount = 1;
                    existing.FirstFailedAt = now;
                    existing.LockedUntil = null;
                }
                else
                {
                    existing.FailedCount++;
                    if (existing.FailedCount >= MaxFailedAttempts)
                    {
                        existing.LockedUntil = now.AddMinutes(LockoutDurationMinutes);
                    }
                }
                return existing;
            });
    }

    public void ResetAttempts(string ipAddress, string username)
    {
        var key = GetKey(ipAddress, username);
        _attempts.TryRemove(key, out _);
    }

    public int GetRemainingAttempts(string ipAddress, string username)
    {
        var key = GetKey(ipAddress, username);
        if (_attempts.TryGetValue(key, out var record))
        {
            var left = MaxFailedAttempts - record.FailedCount;
            return left > 0 ? left : 0;
        }
        return MaxFailedAttempts;
    }
}
