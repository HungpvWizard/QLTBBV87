using System.Text.Json;

namespace AssetManagement.WebAPI.Services;

public class BackupScheduleConfig
{
    public bool Enabled { get; set; } = false;
    public int IntervalHours { get; set; } = 24;
    public int StartHour { get; set; } = 2;
    public int MaxBackupsToKeep { get; set; } = 10;
    public string? LastAutoBackupAt { get; set; }
    public string? NextBackupAt { get; set; }
}

public class BackupSchedulerService : BackgroundService
{
    private readonly IConfiguration _config;
    private readonly ILogger<BackupSchedulerService> _logger;
    private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(1);

    public BackupSchedulerService(IConfiguration config, ILogger<BackupSchedulerService> logger)
    {
        _config = config;
        _logger = logger;
    }

    private string DbPath => Path.GetFullPath(
        _config.GetConnectionString("DefaultConnection")!
            .Replace("Data Source=", "").Trim()
    );
    private string BackupDir => Path.Combine(Path.GetDirectoryName(DbPath)!, "backups");
    public string ScheduleConfigPath => Path.Combine(Path.GetDirectoryName(DbPath)!, "backup-schedule.json");

    public BackupScheduleConfig ReadConfig()
    {
        try
        {
            if (!File.Exists(ScheduleConfigPath)) return new BackupScheduleConfig();
            var json = File.ReadAllText(ScheduleConfigPath);
            return JsonSerializer.Deserialize<BackupScheduleConfig>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? new BackupScheduleConfig();
        }
        catch { return new BackupScheduleConfig(); }
    }

    public void WriteConfig(BackupScheduleConfig cfg)
    {
        var json = JsonSerializer.Serialize(cfg, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(ScheduleConfigPath, json);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("BackupSchedulerService started.");
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await DoCheck(); }
            catch (Exception ex) { _logger.LogError(ex, "Loi backup scheduler"); }
            await Task.Delay(CheckInterval, stoppingToken);
        }
    }

    private async Task DoCheck()
    {
        var cfg = ReadConfig();
        if (!cfg.Enabled) return;

        var now = DateTime.Now;

        if (string.IsNullOrEmpty(cfg.NextBackupAt))
        {
            cfg.NextBackupAt = CalculateNextBackup(now, cfg).ToString("o");
            WriteConfig(cfg);
            return;
        }

        var nextBackup = DateTime.Parse(cfg.NextBackupAt, null,
            System.Globalization.DateTimeStyles.RoundtripKind);

        if (now < nextBackup) return;

        _logger.LogInformation("Den lich backup tu dong!");
        await CreateAutoBackup(cfg, now);
    }

    private async Task CreateAutoBackup(BackupScheduleConfig cfg, DateTime now)
    {
        try
        {
            if (!File.Exists(DbPath)) return;
            Directory.CreateDirectory(BackupDir);

            var timestamp = now.ToString("yyyy-MM-dd_HH-mm-ss");
            var backupPath = Path.Combine(BackupDir, $"auto_backup_{timestamp}.db");

            await using (var src = new FileStream(DbPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            await using (var dst = new FileStream(backupPath, FileMode.Create, FileAccess.Write))
            {
                await src.CopyToAsync(dst);
            }

            _logger.LogInformation("Da tao auto backup: auto_backup_{Timestamp}.db", timestamp);

            cfg.LastAutoBackupAt = now.ToString("o");
            cfg.NextBackupAt = CalculateNextBackup(now, cfg).ToString("o");
            PurgeOldBackups(cfg.MaxBackupsToKeep);
            WriteConfig(cfg);
        }
        catch (Exception ex) { _logger.LogError(ex, "Loi tao auto backup"); }
    }

    public static DateTime CalculateNextBackup(DateTime from, BackupScheduleConfig cfg)
    {
        if (cfg.IntervalHours >= 24)
        {
            int days = cfg.IntervalHours / 24;
            var next = from.Date.AddDays(days).AddHours(cfg.StartHour);
            while (next <= from) next = next.AddHours(cfg.IntervalHours);
            return next;
        }
        return from.AddHours(cfg.IntervalHours);
    }

    private void PurgeOldBackups(int maxKeep)
    {
        if (!Directory.Exists(BackupDir) || maxKeep <= 0) return;
        var files = Directory.GetFiles(BackupDir, "*.db")
            .Select(f => new FileInfo(f))
            .OrderByDescending(f => f.LastWriteTime).ToList();
        foreach (var f in files.Skip(maxKeep))
        {
            try { f.Delete(); _logger.LogInformation("Da xoa backup cu: {F}", f.Name); }
            catch (Exception ex) { _logger.LogWarning(ex, "Khong xoa duoc: {F}", f.Name); }
        }
    }
}
