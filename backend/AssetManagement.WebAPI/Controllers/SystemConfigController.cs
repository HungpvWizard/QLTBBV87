using AssetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text.Json;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Route("api/system")]
public class SystemConfigController : ControllerBase
{
    private readonly string _configFilePath;
    private readonly IWebHostEnvironment _env;
    private readonly ApplicationDbContext _context;

    public SystemConfigController(IWebHostEnvironment env, ApplicationDbContext context)
    {
        _env = env;
        _context = context;
        _configFilePath = Path.Combine(_env.ContentRootPath, "server_config.json");
    }

    public class ServerConfigDto
    {
        public string ServerUrl { get; set; } = "";
        public bool RedirectEnabled { get; set; } = false;
        public string? RedirectMessage { get; set; } = "Hệ thống Quản lý Thiết bị Y tế đã được chuyển sang địa chỉ máy chủ mới. Đang tự động chuyển hướng...";
        public DateTime? UpdatedAt { get; set; }
    }

    [HttpGet("server-config")]
    [AllowAnonymous]
    public IActionResult GetServerConfig()
    {
        ServerConfigDto config = new ServerConfigDto();

        if (System.IO.File.Exists(_configFilePath))
        {
            try
            {
                var json = System.IO.File.ReadAllText(_configFilePath);
                var loaded = JsonSerializer.Deserialize<ServerConfigDto>(json);
                if (loaded != null) config = loaded;
            }
            catch {}
        }

        // Tự động phát hiện các địa chỉ IP mạng LAN của máy chủ hiện tại
        var detectedIps = new List<string>();
        try
        {
            var interfaces = NetworkInterface.GetAllNetworkInterfaces()
                .Where(n => n.OperationalStatus == OperationalStatus.Up && 
                            n.NetworkInterfaceType != NetworkInterfaceType.Loopback);

            foreach (var ni in interfaces)
            {
                var props = ni.GetIPProperties();
                foreach (var addr in props.UnicastAddresses)
                {
                    if (addr.Address.AddressFamily == AddressFamily.InterNetwork)
                    {
                        var ipStr = addr.Address.ToString();
                        if (!ipStr.StartsWith("127.") && !ipStr.StartsWith("169.254."))
                        {
                            detectedIps.Add(ipStr);
                        }
                    }
                }
            }
        }
        catch {}

        // Nếu chưa cấu hình serverUrl, gợi ý theo IP đầu tiên phát hiện hoặc request hiện tại
        if (string.IsNullOrWhiteSpace(config.ServerUrl))
        {
            var host = Request.Host.Value;
            var scheme = Request.Scheme;
            config.ServerUrl = $"{scheme}://{host}";
        }

        return Ok(new
        {
            serverUrl = config.ServerUrl,
            redirectEnabled = config.RedirectEnabled,
            redirectMessage = config.RedirectMessage,
            updatedAt = config.UpdatedAt,
            detectedIps = detectedIps.Distinct().ToList(),
            machineName = Environment.MachineName,
            currentHost = Request.Host.Value,
            currentScheme = Request.Scheme
        });
    }

    [HttpPost("server-config")]
    [Authorize(Roles = "Admin,Manager")]
    public IActionResult SaveServerConfig([FromBody] ServerConfigDto model)
    {
        if (string.IsNullOrWhiteSpace(model.ServerUrl))
        {
            return BadRequest(new { message = "Vui lòng nhập địa chỉ máy chủ hợp lệ!" });
        }

        var cleanUrl = model.ServerUrl.Trim().TrimEnd('/');
        if (!cleanUrl.StartsWith("http://") && !cleanUrl.StartsWith("https://"))
        {
            cleanUrl = "http://" + cleanUrl;
        }

        var config = new ServerConfigDto
        {
            ServerUrl = cleanUrl,
            RedirectEnabled = model.RedirectEnabled,
            RedirectMessage = string.IsNullOrWhiteSpace(model.RedirectMessage) 
                ? "Hệ thống Quản lý Thiết bị Y tế đã được chuyển sang địa chỉ máy chủ mới. Đang tự động chuyển hướng..."
                : model.RedirectMessage.Trim(),
            UpdatedAt = DateTime.Now
        };

        try
        {
            var json = JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true });
            System.IO.File.WriteAllText(_configFilePath, json);
            return Ok(new { message = "Đã lưu cấu hình địa chỉ máy chủ thành công!", config });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Lỗi ghi file cấu hình: {ex.Message}" });
        }
    }

    [HttpGet("download-shortcut")]
    [AllowAnonymous]
    public IActionResult DownloadShortcut([FromQuery] string? url)
    {
        var targetUrl = url;
        if (string.IsNullOrWhiteSpace(targetUrl))
        {
            if (System.IO.File.Exists(_configFilePath))
            {
                try
                {
                    var json = System.IO.File.ReadAllText(_configFilePath);
                    var loaded = JsonSerializer.Deserialize<ServerConfigDto>(json);
                    if (loaded != null && !string.IsNullOrWhiteSpace(loaded.ServerUrl))
                    {
                        targetUrl = loaded.ServerUrl;
                    }
                }
                catch {}
            }
        }

        if (string.IsNullOrWhiteSpace(targetUrl))
        {
            targetUrl = $"{Request.Scheme}://{Request.Host.Value}";
        }

        targetUrl = targetUrl.Trim().TrimEnd('/');
        if (!targetUrl.StartsWith("http://") && !targetUrl.StartsWith("https://"))
        {
            targetUrl = "http://" + targetUrl;
        }

        // Định dạng file .url chuẩn của Windows Internet Shortcut
        var fileContent = $"[InternetShortcut]\r\nURL={targetUrl}\r\nIconIndex=0\r\nIconFile={targetUrl}/logo-bvqy87.png\r\n";
        var bytes = System.Text.Encoding.UTF8.GetBytes(fileContent);

        return File(bytes, "application/octet-stream", "QuanLyTrangBi.url");
    }

    // ─── SECURITY AUDIT LOGS (Admin only) ──────────────────────────────────
    [HttpGet("audit-logs")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] string? search, 
        [FromQuery] string? action,
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 5) pageSize = 5;
        if (pageSize > 100) pageSize = 100;

        var query = _context.SecurityAuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(l => 
                l.Username.ToLower().Contains(s) || 
                (l.IpAddress != null && l.IpAddress.ToLower().Contains(s)) ||
                (l.Details != null && l.Details.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(l => l.Action == action.Trim());
        }

        var totalItems = await query.CountAsync();
        var logs = await query
            .OrderByDescending(l => l.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new
            {
                l.Id,
                l.Action,
                l.Username,
                l.IpAddress,
                l.Details,
                l.IsSuccess,
                timestamp = l.Timestamp.ToString("yyyy-MM-ddTHH:mm:ss")
            })
            .ToListAsync();

        return Ok(new
        {
            items = logs,
            totalItems,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
        });
    }

    [HttpPost("audit-logs/clear-old")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ClearOldAuditLogs([FromQuery] int days = 30)
    {
        if (days < 7) days = 7;
        var cutoff = DateTime.Now.AddDays(-days);

        var oldLogs = await _context.SecurityAuditLogs
            .Where(l => l.Timestamp < cutoff)
            .ToListAsync();

        if (oldLogs.Count > 0)
        {
            _context.SecurityAuditLogs.RemoveRange(oldLogs);
            await _context.SaveChangesAsync();
        }

        return Ok(new 
        { 
            message = $"Đã dọn dẹp {oldLogs.Count} bản ghi nhật ký bảo mật cũ hơn {days} ngày." 
        });
    }
}
