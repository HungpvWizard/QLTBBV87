using System.Security.Claims;
using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class DeviceUsagesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DeviceUsagesController(ApplicationDbContext context)
    {
        _context = context;
    }

    private bool CheckIsAdmin()
    {
        if (User.IsInRole("Admin")) return true;
        return User.Claims.Any(c => 
            (c.Type == ClaimTypes.Role || c.Type == "role") && 
            c.Value.Equals("Admin", StringComparison.OrdinalIgnoreCase)
        );
    }

    // GET: api/deviceusages/monthly?year=2026&month=9&department=Khoa+X&fromDate=2026-09-01&toDate=2026-09-20
    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthlyReport(
        [FromQuery] int? year, 
        [FromQuery] int? month, 
        [FromQuery] string? department,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate)
    {
        DateTime startDate;
        DateTime endDate;
        bool isCustomRange = false;

        if (!string.IsNullOrEmpty(fromDate) && !string.IsNullOrEmpty(toDate) &&
            DateTime.TryParse(fromDate, out var parsedStart) && DateTime.TryParse(toDate, out var parsedEnd) &&
            parsedStart <= parsedEnd)
        {
            isCustomRange = true;
            startDate = parsedStart.Date;
            endDate = parsedEnd.Date;
            // Giới hạn khoảng ngày tối đa 62 ngày để ma trận hiển thị tối ưu
            if ((endDate - startDate).TotalDays > 62)
            {
                endDate = startDate.AddDays(61);
            }
        }
        else
        {
            int targetYear = year ?? DateTime.UtcNow.Year;
            int targetMonth = month ?? DateTime.UtcNow.Month;
            int daysInMonth = DateTime.DaysInMonth(targetYear, targetMonth);
            startDate = new DateTime(targetYear, targetMonth, 1);
            endDate = new DateTime(targetYear, targetMonth, daysInMonth);
        }

        string startStr = startDate.ToString("yyyy-MM-dd");
        string endStr = endDate.ToString("yyyy-MM-dd");

        // Danh sách tất cả các ngày trong khoảng
        var dateList = new List<DateTime>();
        for (var cur = startDate; cur <= endDate; cur = cur.AddDays(1))
        {
            dateList.Add(cur);
        }
        int totalDays = dateList.Count;

        // 1. Lấy danh sách tài sản (Assets)
        var assetQuery = _context.Assets.AsQueryable();
        if (!string.IsNullOrEmpty(department) && department != "all" && department != "handed_over" && department != "warehouse")
        {
            assetQuery = assetQuery.Where(a => 
                (a.CurrentDepartment != null && a.CurrentDepartment.Contains(department)) ||
                _context.DeviceUsageLogs.Any(l => l.AssetId == a.Id && l.DepartmentName != null && l.DepartmentName.Contains(department))
            );
        }
        else if (department == "warehouse")
        {
            assetQuery = assetQuery.Where(a => 
                (a.CurrentDepartment == null || a.CurrentDepartment.Contains("Còn ở kho") || a.Status == AssetStatus.Available) &&
                !_context.DeviceUsageLogs.Any(l => l.AssetId == a.Id && string.Compare(l.UsageDate, startStr) >= 0 && string.Compare(l.UsageDate, endStr) <= 0 && l.UsageCount > 0)
            );
        }
        else if (department == "handed_over")
        {
            assetQuery = assetQuery.Where(a => 
                a.Status == AssetStatus.InUse || 
                (a.CurrentDepartment != null && !a.CurrentDepartment.Contains("Còn ở kho")) ||
                _context.DeviceUsageLogs.Any(l => l.AssetId == a.Id && string.Compare(l.UsageDate, startStr) >= 0 && string.Compare(l.UsageDate, endStr) <= 0 && l.UsageCount > 0)
            );
        }

        var rawAssets = await assetQuery
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.Serial,
                a.AssetTag,
                a.KyHieu,
                a.Manufacturer,
                a.CurrentDepartment,
                Status = (int)a.Status
            })
            .ToListAsync();

        // 2. Gom nhóm các máy có cùng Số Seri và Tên máy thành 1 thiết bị duy nhất
        var assetGroups = rawAssets
            .GroupBy(a => new
            {
                SerialKey = !string.IsNullOrWhiteSpace(a.Serial) ? a.Serial.Trim().ToLowerInvariant() : $"__empty_serial_{a.Id}",
                NameKey = (a.Name ?? "").Trim().ToLowerInvariant()
            })
            .Select(g =>
            {
                var primary = g.OrderBy(a => a.Id).First();
                return new
                {
                    Primary = primary,
                    AssetIds = g.Select(a => a.Id).ToList()
                };
            })
            .ToList();

        var allAssetIds = rawAssets.Select(a => a.Id).ToList();

        // 3. Lấy toàn bộ nhật ký sử dụng trong khoảng thời gian này
        var logs = await _context.DeviceUsageLogs
            .Where(l => allAssetIds.Contains(l.AssetId) && 
                        string.Compare(l.UsageDate, startStr) >= 0 && 
                        string.Compare(l.UsageDate, endStr) <= 0)
            .OrderBy(l => l.UsageDate)
            .ThenBy(l => l.CreatedAt)
            .ToListAsync();

        var dateHeaders = dateList.Select(d => new
        {
            DateStr = d.ToString("yyyy-MM-dd"),
            Day = d.Day,
            Month = d.Month,
            Year = d.Year,
            Label = isCustomRange && startDate.Month != endDate.Month ? $"{d.Day:D2}/{d.Month:D2}" : $"{d.Day}"
        }).ToList();

        var matrixRows = assetGroups.Select(grp =>
        {
            var p = grp.Primary;
            // Tất cả logs của các assetId thuộc nhóm máy này
            var groupLogs = logs.Where(l => grp.AssetIds.Contains(l.AssetId)).ToList();

            var dailyMap = new Dictionary<int, int>();
            var dailyMapByDate = new Dictionary<string, int>();

            for (int i = 0; i < dateList.Count; i++)
            {
                var dt = dateList[i];
                string dStr = dt.ToString("yyyy-MM-dd");
                
                // Quy tắc: Nếu cùng 1 máy được check nhiều lần trong ngày, LẤY LẦN CUỐI CÙNG (CreatedAt mới nhất hoặc Id lớn nhất)
                var lastLogOfDay = groupLogs
                    .Where(l => l.UsageDate == dStr)
                    .OrderByDescending(l => l.CreatedAt)
                    .ThenByDescending(l => l.Id)
                    .FirstOrDefault();

                int count = lastLogOfDay != null ? lastLogOfDay.UsageCount : 0;
                dailyMapByDate[dStr] = count;
                if (!isCustomRange || startDate.Month == endDate.Month)
                {
                    dailyMap[dt.Day] = count;
                }
                else
                {
                    dailyMap[i + 1] = count;
                }
            }

            int totalUsage = dailyMapByDate.Values.Sum();
            int activeDays = dailyMapByDate.Values.Count(v => v > 0);
            double avgPerDay = totalDays > 0 ? Math.Round((double)totalUsage / totalDays, 1) : 0;

            // Xác định khoa phòng hiển thị: Ưu tiên khoa phòng từ bản ghi sử dụng mới nhất
            var latestLogWithDept = groupLogs
                .OrderByDescending(l => l.UsageDate)
                .ThenByDescending(l => l.CreatedAt)
                .FirstOrDefault(l => !string.IsNullOrEmpty(l.DepartmentName));

            string displayDept = !string.IsNullOrEmpty(p.CurrentDepartment) && !p.CurrentDepartment.Contains("Còn ở kho")
                ? p.CurrentDepartment
                : (latestLogWithDept?.DepartmentName ?? p.CurrentDepartment ?? "Kho Trang bị (Còn ở kho)");

            return new
            {
                AssetId = p.Id,
                AllAssetIds = grp.AssetIds,
                p.Name,
                p.Serial,
                p.AssetTag,
                p.KyHieu,
                p.Manufacturer,
                DepartmentName = displayDept,
                p.Status,
                DailyUsages = dailyMap,
                DailyUsagesByDate = dailyMapByDate,
                TotalMonthUsage = totalUsage,
                ActiveDays = activeDays,
                AveragePerDay = avgPerDay
            };
        }).OrderByDescending(r => r.TotalMonthUsage).ThenBy(r => r.Name).ToList();

        int totalUsageAll = matrixRows.Sum(r => r.TotalMonthUsage);
        int activeAssetsCount = matrixRows.Count(r => r.TotalMonthUsage > 0);

        return Ok(new
        {
            FilterType = isCustomRange ? "custom_range" : "month",
            FromDate = startStr,
            ToDate = endStr,
            Year = startDate.Year,
            Month = startDate.Month,
            DaysInMonth = totalDays,
            DateHeaders = dateHeaders,
            TotalUsageAll = totalUsageAll,
            ActiveAssetsCount = activeAssetsCount,
            TotalAssets = matrixRows.Count,
            Rows = matrixRows
        });
    }

    // POST: api/deviceusages
    [HttpPost]
    public async Task<IActionResult> SaveDailyUsage([FromBody] DeviceUsageLogDto dto)
    {
        if (dto.AssetId <= 0 || string.IsNullOrEmpty(dto.UsageDate))
        {
            return BadRequest(new { message = "AssetId và UsageDate là bắt buộc." });
        }

        // QUY TẮC KHÓA DỮ LIỆU: Chỉ Admin mới được sửa khác ngày hiện tại của hệ thống (sau 23h59 khóa)
        bool isAdmin = CheckIsAdmin();
        string todayStr = DateTime.Now.ToString("yyyy-MM-dd");

        if (!isAdmin && dto.UsageDate != todayStr)
        {
            return StatusCode(403, new { message = "Dữ liệu ngày này đã được chốt sổ và khóa sau 23h59. Chỉ tài khoản Quản trị viên (Admin) mới có quyền chỉnh sửa khác ngày hệ thống." });
        }

        // Tìm thiết bị
        var targetAsset = await _context.Assets.FindAsync(dto.AssetId);
        if (targetAsset == null)
        {
            return NotFound(new { message = "Không tìm thấy thiết bị." });
        }

        // Tìm tất cả các Asset có cùng Serial và Name
        var targetSerial = (targetAsset.Serial ?? "").Trim().ToLowerInvariant();
        var targetName = (targetAsset.Name ?? "").Trim().ToLowerInvariant();

        var relatedAssetIds = await _context.Assets
            .Where(a => 
                ((a.Serial != null && a.Serial.Trim().ToLower() == targetSerial) || (string.IsNullOrEmpty(a.Serial) && string.IsNullOrEmpty(targetSerial))) &&
                a.Name.Trim().ToLower() == targetName
            )
            .Select(a => a.Id)
            .ToListAsync();

        if (!relatedAssetIds.Contains(dto.AssetId))
        {
            relatedAssetIds.Add(dto.AssetId);
        }

        // Lấy tất cả log trong ngày của nhóm máy này
        var existingLogs = await _context.DeviceUsageLogs
            .Where(l => relatedAssetIds.Contains(l.AssetId) && l.UsageDate == dto.UsageDate)
            .ToListAsync();

        var currentUserName = User.Identity?.Name ?? "Nhân viên khoa";

        if (existingLogs.Any())
        {
            // Cập nhật bản ghi thành lượt check lần cuối cùng
            var primaryLog = existingLogs.OrderByDescending(l => l.CreatedAt).ThenByDescending(l => l.Id).First();
            primaryLog.UsageCount = dto.UsageCount;
            primaryLog.RecordedBy = currentUserName;
            primaryLog.CreatedAt = DateTime.UtcNow; // Ghi nhận thời điểm check cuối cùng
            if (!string.IsNullOrEmpty(dto.DepartmentName)) primaryLog.DepartmentName = dto.DepartmentName;
            if (!string.IsNullOrEmpty(dto.Notes)) primaryLog.Notes = dto.Notes;

            // Xóa các bản ghi thừa khác của cùng máy trong ngày này (nếu có) để tránh sinh dòng phụ
            var redundantLogs = existingLogs.Where(l => l.Id != primaryLog.Id).ToList();
            if (redundantLogs.Any())
            {
                _context.DeviceUsageLogs.RemoveRange(redundantLogs);
            }
        }
        else
        {
            var log = new DeviceUsageLog
            {
                AssetId = dto.AssetId,
                UsageDate = dto.UsageDate,
                UsageCount = dto.UsageCount,
                DepartmentName = dto.DepartmentName,
                RecordedBy = currentUserName,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow
            };
            _context.DeviceUsageLogs.Add(log);
        }

        // Tự động đồng bộ khoa phòng cho tài sản nếu chưa được gán
        if (!string.IsNullOrEmpty(dto.DepartmentName) && !dto.DepartmentName.Contains("Còn ở kho"))
        {
            var relatedAssets = await _context.Assets.Where(a => relatedAssetIds.Contains(a.Id)).ToListAsync();
            foreach (var asset in relatedAssets)
            {
                if (string.IsNullOrEmpty(asset.CurrentDepartment) || asset.CurrentDepartment.Contains("Còn ở kho"))
                {
                    asset.CurrentDepartment = dto.DepartmentName;
                    if (asset.Status == AssetStatus.Available)
                    {
                        asset.Status = AssetStatus.InUse;
                    }
                }
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Lưu lượt sử dụng thành công (đã ghi nhận lần cuối cùng)." });
    }

    // POST: api/deviceusages/batch
    [HttpPost("batch")]
    public async Task<IActionResult> SaveBatchUsage([FromBody] BatchDeviceUsageDto batchDto)
    {
        if (string.IsNullOrEmpty(batchDto.UsageDate) || batchDto.Items == null || !batchDto.Items.Any())
        {
            return BadRequest(new { message = "Dữ liệu ghi nhận không hợp lệ." });
        }

        // QUY TẮC KHÓA DỮ LIỆU: Chỉ Admin mới được sửa khác ngày hiện tại của hệ thống (sau 23h59 khóa)
        bool isAdmin = CheckIsAdmin();
        string todayStr = DateTime.Now.ToString("yyyy-MM-dd");

        if (!isAdmin && batchDto.UsageDate != todayStr)
        {
            return StatusCode(403, new { message = "Dữ liệu ngày này đã được chốt sổ và khóa sau 23h59. Chỉ tài khoản Quản trị viên (Admin) mới có quyền chỉnh sửa khác ngày hệ thống." });
        }

        var currentUserName = User.Identity?.Name ?? "Nhân viên khoa";
        var inputAssetIds = batchDto.Items.Select(i => i.AssetId).Distinct().ToList();

        // Lấy thông tin các assets được gửi lên để tìm các máy cùng Serial và Name
        var assetsSent = await _context.Assets
            .Where(a => inputAssetIds.Contains(a.Id))
            .ToListAsync();

        // Gom nhóm items được gửi lên: nếu có nhiều item cùng máy, chỉ lấy item cuối cùng
        var processedItems = new List<BatchDeviceUsageItemDto>();
        foreach (var item in batchDto.Items)
        {
            processedItems.RemoveAll(x => x.AssetId == item.AssetId);
            processedItems.Add(item);
        }

        foreach (var item in processedItems)
        {
            var targetAsset = assetsSent.FirstOrDefault(a => a.Id == item.AssetId) ?? await _context.Assets.FindAsync(item.AssetId);
            if (targetAsset == null) continue;

            var targetSerial = (targetAsset.Serial ?? "").Trim().ToLowerInvariant();
            var targetName = (targetAsset.Name ?? "").Trim().ToLowerInvariant();

            // Tìm tất cả assetId trùng Serial và Name
            var relatedAssetIds = await _context.Assets
                .Where(a => 
                    ((a.Serial != null && a.Serial.Trim().ToLower() == targetSerial) || (string.IsNullOrEmpty(a.Serial) && string.IsNullOrEmpty(targetSerial))) &&
                    a.Name.Trim().ToLower() == targetName
                )
                .Select(a => a.Id)
                .ToListAsync();

            if (!relatedAssetIds.Contains(item.AssetId))
            {
                relatedAssetIds.Add(item.AssetId);
            }

            var existingLogs = await _context.DeviceUsageLogs
                .Where(l => relatedAssetIds.Contains(l.AssetId) && l.UsageDate == batchDto.UsageDate)
                .ToListAsync();

            if (existingLogs.Any())
            {
                // Cập nhật bản ghi lần cuối cùng
                var primaryLog = existingLogs.OrderByDescending(l => l.CreatedAt).ThenByDescending(l => l.Id).First();
                primaryLog.UsageCount = item.UsageCount;
                primaryLog.RecordedBy = currentUserName;
                primaryLog.CreatedAt = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(item.DepartmentName)) primaryLog.DepartmentName = item.DepartmentName;
                if (!string.IsNullOrEmpty(item.Notes)) primaryLog.Notes = item.Notes;

                // Xóa log thừa
                var redundantLogs = existingLogs.Where(l => l.Id != primaryLog.Id).ToList();
                if (redundantLogs.Any())
                {
                    _context.DeviceUsageLogs.RemoveRange(redundantLogs);
                }
            }
            else
            {
                _context.DeviceUsageLogs.Add(new DeviceUsageLog
                {
                    AssetId = item.AssetId,
                    UsageDate = batchDto.UsageDate,
                    UsageCount = item.UsageCount,
                    DepartmentName = item.DepartmentName,
                    RecordedBy = currentUserName,
                    Notes = item.Notes,
                    CreatedAt = DateTime.UtcNow
                });
            }

            if (!string.IsNullOrEmpty(item.DepartmentName) && !item.DepartmentName.Contains("Còn ở kho"))
            {
                var relatedAssets = await _context.Assets.Where(a => relatedAssetIds.Contains(a.Id)).ToListAsync();
                foreach (var a in relatedAssets)
                {
                    if (string.IsNullOrEmpty(a.CurrentDepartment) || a.CurrentDepartment.Contains("Còn ở kho"))
                    {
                        a.CurrentDepartment = item.DepartmentName;
                        if (a.Status == AssetStatus.Available)
                        {
                            a.Status = AssetStatus.InUse;
                        }
                    }
                }
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Đã cập nhật lượt sử dụng cho {processedItems.Count} thiết bị thành công (lần check cuối cùng)." });
    }
}

public class DeviceUsageLogDto
{
    public int AssetId { get; set; }
    public string UsageDate { get; set; } = string.Empty;
    public int UsageCount { get; set; } = 1;
    public string? DepartmentName { get; set; }
    public string? Notes { get; set; }
}

public class BatchDeviceUsageDto
{
    public string UsageDate { get; set; } = string.Empty;
    public List<BatchDeviceUsageItemDto> Items { get; set; } = new();
}

public class BatchDeviceUsageItemDto
{
    public int AssetId { get; set; }
    public int UsageCount { get; set; } = 1;
    public string? DepartmentName { get; set; }
    public string? Notes { get; set; }
}
