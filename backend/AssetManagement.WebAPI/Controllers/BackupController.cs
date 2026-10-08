using AssetManagement.WebAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
public class BackupController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly ILogger<BackupController> _logger;
    private readonly BackupSchedulerService _scheduler;

    // ÄÆ°á»ng dáº«n Ä‘áº¿n file DB gá»‘c
    private string DbPath => Path.GetFullPath(
        _config.GetConnectionString("DefaultConnection")!
            .Replace("Data Source=", "")
            .Trim()
    );

    // ThÆ° má»¥c chá»©a cÃ¡c báº£n backup
    private string BackupDir => Path.Combine(Path.GetDirectoryName(DbPath)!, "backups");

    public BackupController(IWebHostEnvironment env, IConfiguration config,
        ILogger<BackupController> logger, BackupSchedulerService scheduler)
    {
        _env = env;
        _config = config;
        _logger = logger;
        _scheduler = scheduler;
    }


    // â”€â”€â”€ GET /api/backup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Liá»‡t kÃª táº¥t cáº£ báº£n backup hiá»‡n cÃ³
    [HttpGet]
    public IActionResult GetBackups()
    {
        try
        {
            if (!Directory.Exists(BackupDir))
                return Ok(new List<object>());

            var files = Directory.GetFiles(BackupDir, "*.db")
                .Select(f => new FileInfo(f))
                .OrderByDescending(f => f.LastWriteTime)
                .Select(f => new
                {
                    filename = f.Name,
                    createdAt = f.LastWriteTime.ToString("yyyy-MM-ddTHH:mm:ss"),
                    sizeBytes = f.Length,
                    sizeText = FormatBytes(f.Length)
                })
                .ToList();

            return Ok(files);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lá»—i khi liá»‡t kÃª backup");
            return StatusCode(500, new { message = "KhÃ´ng thá»ƒ láº¥y danh sÃ¡ch backup." });
        }
    }

    // â”€â”€â”€ POST /api/backup/create â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Táº¡o báº£n backup má»›i vá»›i timestamp
    [HttpPost("create")]
    public IActionResult CreateBackup()
    {
        try
        {
            if (!System.IO.File.Exists(DbPath))
                return NotFound(new { message = "KhÃ´ng tÃ¬m tháº¥y file database." });

            Directory.CreateDirectory(BackupDir);

            var timestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
            var backupFileName = $"backup_{timestamp}.db";
            var backupPath = Path.Combine(BackupDir, backupFileName);

            System.IO.File.Copy(DbPath, backupPath, overwrite: true);

            var info = new FileInfo(backupPath);
            _logger.LogInformation("ÄÃ£ táº¡o backup: {FileName}", backupFileName);

            return Ok(new
            {
                message = "Táº¡o backup thÃ nh cÃ´ng!",
                filename = backupFileName,
                createdAt = info.LastWriteTime.ToString("yyyy-MM-ddTHH:mm:ss"),
                sizeBytes = info.Length,
                sizeText = FormatBytes(info.Length)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lá»—i khi táº¡o backup");
            return StatusCode(500, new { message = $"Lá»—i táº¡o backup: {ex.Message}" });
        }
    }

    // â”€â”€â”€ GET /api/backup/download/{filename} â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Táº£i file backup vá» mÃ¡y
    [HttpGet("download/{filename}")]
    public IActionResult DownloadBackup(string filename)
    {
        try
        {
            // Báº£o máº­t: chá»‰ cho phÃ©p tÃªn file há»£p lá»‡, cháº·n path traversal
            if (filename.Contains("..") || filename.Contains("/") || filename.Contains("\\"))
                return BadRequest(new { message = "TÃªn file khÃ´ng há»£p lá»‡." });

            var filePath = Path.Combine(BackupDir, filename);
            if (!System.IO.File.Exists(filePath))
                return NotFound(new { message = "KhÃ´ng tÃ¬m tháº¥y file backup." });

            var fileBytes = System.IO.File.ReadAllBytes(filePath);
            return File(fileBytes, "application/octet-stream", filename);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lá»—i khi download backup");
            return StatusCode(500, new { message = $"Lá»—i táº£i file: {ex.Message}" });
        }
    }

    // â”€â”€â”€ POST /api/backup/restore/{filename} â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // KhÃ´i phá»¥c tá»« má»™t báº£n backup cÃ³ sáºµn trÃªn server
    [HttpPost("restore/{filename}")]
    public IActionResult RestoreFromServer(string filename)
    {
        try
        {
            if (filename.Contains("..") || filename.Contains("/") || filename.Contains("\\"))
                return BadRequest(new { message = "TÃªn file khÃ´ng há»£p lá»‡." });

            var backupPath = Path.Combine(BackupDir, filename);
            if (!System.IO.File.Exists(backupPath))
                return NotFound(new { message = "KhÃ´ng tÃ¬m tháº¥y file backup." });

            // Táº¡o báº£n backup tá»± Ä‘á»™ng cá»§a DB hiá»‡n táº¡i trÆ°á»›c khi ghi Ä‘Ã¨ (safety net)
            Directory.CreateDirectory(BackupDir);
            var autoSaveTimestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
            var autoSaveName = $"before_restore_{autoSaveTimestamp}.db";
            System.IO.File.Copy(DbPath, Path.Combine(BackupDir, autoSaveName), overwrite: true);

            // Ghi Ä‘Ã¨ DB hiá»‡n táº¡i báº±ng báº£n backup
            System.IO.File.Copy(backupPath, DbPath, overwrite: true);

            _logger.LogInformation("ÄÃ£ restore tá»«: {FileName}", filename);

            return Ok(new
            {
                message = $"KhÃ´i phá»¥c dá»¯ liá»‡u tá»« '{filename}' thÃ nh cÃ´ng! Vui lÃ²ng táº£i láº¡i trang.",
                autoSaved = autoSaveName
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lá»—i khi restore backup");
            return StatusCode(500, new { message = $"Lá»—i khÃ´i phá»¥c: {ex.Message}" });
        }
    }

    // â”€â”€â”€ POST /api/backup/upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Upload file .db tá»« mÃ¡y tÃ­nh lÃªn vÃ  restore
    [HttpPost("upload")]
    public async Task<IActionResult> UploadAndRestore(IFormFile file)
    {
        try
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Vui lÃ²ng chá»n file backup (.db)." });

            if (!file.FileName.EndsWith(".db", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Chá»‰ cháº¥p nháº­n file cÃ³ Ä‘á»‹nh dáº¡ng .db" });

            // Táº¡o báº£n backup tá»± Ä‘á»™ng trÆ°á»›c khi ghi Ä‘Ã¨
            Directory.CreateDirectory(BackupDir);
            var autoSaveTimestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
            var autoSaveName = $"before_upload_restore_{autoSaveTimestamp}.db";
            if (System.IO.File.Exists(DbPath))
                System.IO.File.Copy(DbPath, Path.Combine(BackupDir, autoSaveName), overwrite: true);

            // Ghi file upload thÃ nh DB má»›i
            using (var stream = new FileStream(DbPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            _logger.LogInformation("ÄÃ£ restore tá»« file upload: {FileName}", file.FileName);

            return Ok(new
            {
                message = "Upload vÃ  khÃ´i phá»¥c dá»¯ liá»‡u thÃ nh cÃ´ng! Vui lÃ²ng táº£i láº¡i trang.",
                autoSaved = autoSaveName
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lá»—i khi upload restore");
            return StatusCode(500, new { message = $"Lá»—i upload: {ex.Message}" });
        }
    }

    // â”€â”€â”€ DELETE /api/backup/{filename} â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // XÃ³a má»™t báº£n backup
    [HttpDelete("{filename}")]
    public IActionResult DeleteBackup(string filename)
    {
        try
        {
            if (filename.Contains("..") || filename.Contains("/") || filename.Contains("\\"))
                return BadRequest(new { message = "TÃªn file khÃ´ng há»£p lá»‡." });

            var filePath = Path.Combine(BackupDir, filename);
            if (!System.IO.File.Exists(filePath))
                return NotFound(new { message = "KhÃ´ng tÃ¬m tháº¥y file backup." });

            System.IO.File.Delete(filePath);
            _logger.LogInformation("ÄÃ£ xÃ³a backup: {FileName}", filename);

            return Ok(new { message = $"ÄÃ£ xÃ³a backup '{filename}'." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lá»—i khi xÃ³a backup");
            return StatusCode(500, new { message = $"Lá»—i xÃ³a backup: {ex.Message}" });
        }
    }

    // â”€â”€â”€ GET /api/backup/schedule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Láº¥y cáº¥u hÃ¬nh lá»‹ch backup hiá»‡n táº¡i
    [HttpGet("schedule")]
    public IActionResult GetSchedule()
    {
        var cfg = _scheduler.ReadConfig();

        // TÃ­nh thá»i gian countdown Ä‘áº¿n láº§n backup tiáº¿p theo
        string? countdownText = null;
        if (cfg.Enabled && !string.IsNullOrEmpty(cfg.NextBackupAt))
        {
            var next = DateTime.Parse(cfg.NextBackupAt, null,
                System.Globalization.DateTimeStyles.RoundtripKind);
            var diff = next - DateTime.Now;
            if (diff.TotalSeconds > 0)
            {
                if (diff.TotalDays >= 1)
                    countdownText = $"{(int)diff.TotalDays} ngÃ y {diff.Hours} giá» ná»¯a";
                else if (diff.TotalHours >= 1)
                    countdownText = $"{(int)diff.TotalHours} giá» {diff.Minutes} phÃºt ná»¯a";
                else
                    countdownText = $"{diff.Minutes} phÃºt ná»¯a";
            }
        }

        return Ok(new
        {
            enabled = cfg.Enabled,
            intervalHours = cfg.IntervalHours,
            startHour = cfg.StartHour,
            maxBackupsToKeep = cfg.MaxBackupsToKeep,
            lastAutoBackupAt = cfg.LastAutoBackupAt,
            nextBackupAt = cfg.NextBackupAt,
            countdownText
        });
    }

    // â”€â”€â”€ POST /api/backup/schedule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Cáº­p nháº­t cáº¥u hÃ¬nh lá»‹ch backup
    [HttpPost("schedule")]
    public IActionResult UpdateSchedule([FromBody] BackupScheduleConfig newCfg)
    {
        try
        {
            // Giá»›i háº¡n an toÃ n
            newCfg.IntervalHours = Math.Clamp(newCfg.IntervalHours, 1, 24 * 30);
            newCfg.StartHour = Math.Clamp(newCfg.StartHour, 0, 23);
            newCfg.MaxBackupsToKeep = Math.Clamp(newCfg.MaxBackupsToKeep, 1, 100);

            // Giá»¯ láº¡i lá»‹ch sá»­ backup cÅ©
            var existing = _scheduler.ReadConfig();
            newCfg.LastAutoBackupAt = existing.LastAutoBackupAt;

            // TÃ­nh láº¡i NextBackupAt náº¿u báº­t hoáº·c thay Ä‘á»•i cáº¥u hÃ¬nh
            if (newCfg.Enabled)
                newCfg.NextBackupAt = BackupSchedulerService
                    .CalculateNextBackup(DateTime.Now, newCfg).ToString("o");
            else
                newCfg.NextBackupAt = null;

            _scheduler.WriteConfig(newCfg);
            _logger.LogInformation("ÄÃ£ cáº­p nháº­t lá»‹ch backup: Enabled={E}, Interval={I}h",
                newCfg.Enabled, newCfg.IntervalHours);

            return Ok(new
            {
                message = newCfg.Enabled
                    ? $"ÄÃ£ báº­t lá»‹ch backup tá»± Ä‘á»™ng má»—i {newCfg.IntervalHours} giá»."
                    : "ÄÃ£ táº¯t lá»‹ch backup tá»± Ä‘á»™ng.",
                nextBackupAt = newCfg.NextBackupAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lá»—i cáº­p nháº­t lá»‹ch backup");
            return StatusCode(500, new { message = $"Lá»—i: {ex.Message}" });
        }
    }

    // â”€â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    private static string FormatBytes(long bytes)
    {
        if (bytes < 1024) return $"{bytes} B";
        if (bytes < 1024 * 1024) return $"{bytes / 1024.0:F1} KB";
        return $"{bytes / (1024.0 * 1024):F1} MB";
    }
}

