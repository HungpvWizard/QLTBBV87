using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using AssetManagement.WebAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PermissionsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditLogService _auditLog;

    public PermissionsController(ApplicationDbContext db, IAuditLogService auditLog)
    {
        _db = db;
        _auditLog = auditLog;
    }

    private string GetClientIp() => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private string GetCurrentUsername() => User.Identity?.Name ?? "Admin";

    private int? GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(idClaim, out int id) ? id : null;
    }

    // 1. GET /api/permissions/modules — Lấy danh sách tất cả chức năng hệ thống
    [HttpGet("modules")]
    public async Task<IActionResult> GetModules()
    {
        var modules = await _db.AppModules
            .OrderBy(m => m.OrderIndex)
            .ThenBy(m => m.Id)
            .Select(m => new
            {
                m.Id,
                m.Code,
                m.Name,
                m.Group,
                m.Description,
                m.OrderIndex,
                m.IsActive,
                m.IsSystem,
                m.CreatedAt
            })
            .ToListAsync();

        return Ok(modules);
    }

    // 2. POST /api/permissions/modules — Đăng ký thêm chức năng mới (Mở rộng theo chức năng)
    [HttpPost("modules")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateModule([FromBody] CreateModuleRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Code) || string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Mã chức năng và Tên chức năng là bắt buộc." });

        var code = req.Code.Trim().ToLower().Replace(" ", "_");
        if (await _db.AppModules.AnyAsync(m => m.Code == code))
            return BadRequest(new { message = $"Mã chức năng '{code}' đã tồn tại trong hệ thống." });

        var maxOrder = await _db.AppModules.MaxAsync(m => (int?)m.OrderIndex) ?? 0;

        var newModule = new AppModule
        {
            Code = code,
            Name = req.Name.Trim(),
            Group = string.IsNullOrWhiteSpace(req.Group) ? "Nghiệp vụ mở rộng" : req.Group.Trim(),
            Description = req.Description?.Trim(),
            OrderIndex = req.OrderIndex > 0 ? req.OrderIndex : maxOrder + 1,
            IsActive = true,
            IsSystem = false,
            CreatedAt = DateTime.Now
        };

        _db.AppModules.Add(newModule);
        await _db.SaveChangesAsync();

        // Tự động cấp quyền mặc định cho tất cả user hiện có đối với chức năng mới này
        var allUsers = await _db.Users.ToListAsync();
        foreach (var u in allUsers)
        {
            bool isAdmin = u.RoleId == 1;
            bool isManager = u.RoleId == 2;

            _db.UserPermissions.Add(new UserPermission
            {
                UserId = u.Id,
                ModuleCode = code,
                CanView = true,
                CanCreate = isAdmin || isManager,
                CanEdit = isAdmin || isManager,
                CanDelete = isAdmin,
                CanExport = isAdmin || isManager,
                UpdatedAt = DateTime.Now
            });
        }
        await _db.SaveChangesAsync();

        await _auditLog.LogAsync("CREATE_MODULE", GetCurrentUsername(), GetClientIp(),
            $"Thêm chức năng mới vào hệ thống: [{code}] {req.Name}", true);

        return Ok(new { message = "Đã thêm và mở rộng chức năng mới vào hệ thống thành công!", module = newModule });
    }

    // 3. PUT /api/permissions/modules/{id} — Cập nhật thông tin chức năng
    [HttpPut("modules/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateModule(int id, [FromBody] UpdateModuleRequest req)
    {
        var module = await _db.AppModules.FindAsync(id);
        if (module == null) return NotFound(new { message = "Không tìm thấy chức năng này." });

        if (!string.IsNullOrWhiteSpace(req.Name)) module.Name = req.Name.Trim();
        if (!string.IsNullOrWhiteSpace(req.Group)) module.Group = req.Group.Trim();
        if (req.Description != null) module.Description = req.Description.Trim();
        if (req.OrderIndex.HasValue) module.OrderIndex = req.OrderIndex.Value;
        if (req.IsActive.HasValue) module.IsActive = req.IsActive.Value;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Cập nhật chức năng thành công.", module });
    }

    // 4. DELETE /api/permissions/modules/{id} — Xóa chức năng mở rộng
    [HttpDelete("modules/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteModule(int id)
    {
        var module = await _db.AppModules.FindAsync(id);
        if (module == null) return NotFound(new { message = "Không tìm thấy chức năng này." });

        if (module.IsSystem)
            return BadRequest(new { message = "Không thể xóa chức năng mặc định của hệ thống." });

        // Xóa các quyền liên quan
        var perms = _db.UserPermissions.Where(p => p.ModuleCode == module.Code);
        _db.UserPermissions.RemoveRange(perms);

        _db.AppModules.Remove(module);
        await _db.SaveChangesAsync();

        await _auditLog.LogAsync("DELETE_MODULE", GetCurrentUsername(), GetClientIp(),
            $"Xóa chức năng mở rộng: [{module.Code}] {module.Name}", true);

        return Ok(new { message = "Đã xóa chức năng mở rộng thành công." });
    }

    // 5. GET /api/permissions/users/{userId} — Lấy ma trận quyền của một người dùng
    [HttpGet("users/{userId}")]
    public async Task<IActionResult> GetUserPermissions(int userId)
    {
        var targetUser = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == userId);
        if (targetUser == null) return NotFound(new { message = "Không tìm thấy tài khoản người dùng." });

        var modules = await _db.AppModules
            .OrderBy(m => m.OrderIndex)
            .ThenBy(m => m.Id)
            .ToListAsync();

        var existingPerms = await _db.UserPermissions
            .Where(p => p.UserId == userId)
            .ToDictionaryAsync(p => p.ModuleCode);

        bool isAdmin = targetUser.RoleId == 1;

        var result = modules.Select(m =>
        {
            if (existingPerms.TryGetValue(m.Code, out var p))
            {
                return new
                {
                    moduleCode = m.Code,
                    moduleName = m.Name,
                    moduleGroup = m.Group,
                    moduleDescription = m.Description,
                    isSystem = m.IsSystem,
                    isActive = m.IsActive,
                    canView = isAdmin || p.CanView,
                    canCreate = isAdmin || p.CanCreate,
                    canEdit = isAdmin || p.CanEdit,
                    canDelete = isAdmin || p.CanDelete,
                    canExport = isAdmin || p.CanExport
                };
            }

            // Fallback quyền mặc định theo vai trò nếu chưa cấu hình
            bool isManager = targetUser.RoleId == 2;
            return new
            {
                moduleCode = m.Code,
                moduleName = m.Name,
                moduleGroup = m.Group,
                moduleDescription = m.Description,
                isSystem = m.IsSystem,
                isActive = m.IsActive,
                canView = true,
                canCreate = isAdmin || isManager,
                canEdit = isAdmin || isManager,
                canDelete = isAdmin,
                canExport = isAdmin || isManager
            };
        }).ToList();

        return Ok(new
        {
            user = new
            {
                targetUser.Id,
                targetUser.Username,
                targetUser.FullName,
                RoleName = targetUser.Role?.Name ?? "Staff",
                targetUser.RoleId
            },
            permissions = result
        });
    }

    // 6. POST /api/permissions/users/{userId} — Lưu ma trận quyền cho người dùng
    [HttpPost("users/{userId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SaveUserPermissions(int userId, [FromBody] SaveUserPermissionsRequest req)
    {
        var targetUser = await _db.Users.FindAsync(userId);
        if (targetUser == null) return NotFound(new { message = "Không tìm thấy người dùng." });

        if (req.Permissions == null || req.Permissions.Count == 0)
            return BadRequest(new { message = "Danh sách quyền không được rỗng." });

        var existingPerms = await _db.UserPermissions
            .Where(p => p.UserId == userId)
            .ToDictionaryAsync(p => p.ModuleCode);

        var now = DateTime.Now;

        foreach (var item in req.Permissions)
        {
            if (string.IsNullOrWhiteSpace(item.ModuleCode)) continue;
            var mCode = item.ModuleCode.Trim();

            if (existingPerms.TryGetValue(mCode, out var existing))
            {
                existing.CanView = item.CanView;
                existing.CanCreate = item.CanCreate;
                existing.CanEdit = item.CanEdit;
                existing.CanDelete = item.CanDelete;
                existing.CanExport = item.CanExport;
                existing.UpdatedAt = now;
            }
            else
            {
                _db.UserPermissions.Add(new UserPermission
                {
                    UserId = userId,
                    ModuleCode = mCode,
                    CanView = item.CanView,
                    CanCreate = item.CanCreate,
                    CanEdit = item.CanEdit,
                    CanDelete = item.CanDelete,
                    CanExport = item.CanExport,
                    UpdatedAt = now
                });
            }
        }

        await _db.SaveChangesAsync();

        await _auditLog.LogAsync("UPDATE_USER_PERMISSIONS", GetCurrentUsername(), GetClientIp(),
            $"Cập nhật phân quyền cho tài khoản: {targetUser.Username} ({targetUser.FullName})", true);

        return Ok(new { message = $"Đã lưu phân quyền thành công cho tài khoản: {targetUser.FullName}!" });
    }

    // 7. POST /api/permissions/users/{userId}/template — Áp dụng mẫu phân quyền nhanh
    [HttpPost("users/{userId}/template")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ApplyTemplate(int userId, [FromQuery] string template)
    {
        var targetUser = await _db.Users.FindAsync(userId);
        if (targetUser == null) return NotFound(new { message = "Không tìm thấy người dùng." });

        var modules = await _db.AppModules.ToListAsync();
        var now = DateTime.Now;

        // Xóa quyền cũ
        var old = _db.UserPermissions.Where(p => p.UserId == userId);
        _db.UserPermissions.RemoveRange(old);

        foreach (var m in modules)
        {
            var p = new UserPermission
            {
                UserId = userId,
                ModuleCode = m.Code,
                UpdatedAt = now
            };

            switch (template.ToLower())
            {
                case "full": // Toàn quyền
                case "admin":
                    p.CanView = true;
                    p.CanCreate = true;
                    p.CanEdit = true;
                    p.CanDelete = true;
                    p.CanExport = true;
                    break;

                case "manager": // Quản lý
                    p.CanView = true;
                    p.CanCreate = true;
                    p.CanEdit = true;
                    p.CanDelete = (m.Code == "assets" || m.Code == "equipments" || m.Code == "repair_requests");
                    p.CanExport = true;
                    break;

                case "readonly": // Chỉ xem
                    p.CanView = true;
                    p.CanCreate = false;
                    p.CanEdit = false;
                    p.CanDelete = false;
                    p.CanExport = false;
                    break;

                case "staff": // Nhân viên thông thường
                default:
                    p.CanView = (m.Code != "settings" && m.Code != "departments");
                    p.CanCreate = (m.Code == "repair_requests" || m.Code == "transfers");
                    p.CanEdit = (m.Code == "repair_requests");
                    p.CanDelete = false;
                    p.CanExport = false;
                    break;
            }

            _db.UserPermissions.Add(p);
        }

        await _db.SaveChangesAsync();

        await _auditLog.LogAsync("APPLY_PERMISSION_TEMPLATE", GetCurrentUsername(), GetClientIp(),
            $"Áp dụng mẫu quyền '{template}' cho tài khoản: {targetUser.Username}", true);

        return Ok(new { message = $"Đã áp dụng mẫu quyền '{template}' thành công!" });
    }

    // 8. GET /api/permissions/my-permissions — Lấy quyền của tài khoản đang đăng nhập
    [HttpGet("my-permissions")]
    public async Task<IActionResult> GetMyPermissions()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        bool isAdmin = user.RoleId == 1;

        var modules = await _db.AppModules
            .Where(m => m.IsActive)
            .OrderBy(m => m.OrderIndex)
            .ToListAsync();

        var perms = await _db.UserPermissions
            .Where(p => p.UserId == userId.Value)
            .ToDictionaryAsync(p => p.ModuleCode);

        var dict = new Dictionary<string, object>();

        foreach (var m in modules)
        {
            if (isAdmin)
            {
                dict[m.Code] = new { view = true, create = true, edit = true, delete = true, export = true };
            }
            else if (perms.TryGetValue(m.Code, out var p))
            {
                dict[m.Code] = new
                {
                    view = p.CanView,
                    create = p.CanCreate,
                    edit = p.CanEdit,
                    delete = p.CanDelete,
                    export = p.CanExport
                };
            }
            else
            {
                // Fallback theo Role
                bool isMgr = user.RoleId == 2;
                dict[m.Code] = new
                {
                    view = true,
                    create = isMgr,
                    edit = isMgr,
                    delete = false,
                    export = isMgr
                };
            }
        }

        return Ok(new
        {
            userId = user.Id,
            username = user.Username,
            role = user.Role?.Name ?? "Staff",
            isAdmin,
            permissions = dict
        });
    }
}

public class CreateModuleRequest
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Group { get; set; }
    public string? Description { get; set; }
    public int OrderIndex { get; set; } = 0;
}

public class UpdateModuleRequest
{
    public string? Name { get; set; }
    public string? Group { get; set; }
    public string? Description { get; set; }
    public int? OrderIndex { get; set; }
    public bool? IsActive { get; set; }
}

public class SaveUserPermissionsRequest
{
    public List<PermissionItemDto> Permissions { get; set; } = new();
}

public class PermissionItemDto
{
    public string ModuleCode { get; set; } = string.Empty;
    public bool CanView { get; set; } = true;
    public bool CanCreate { get; set; } = false;
    public bool CanEdit { get; set; } = false;
    public bool CanDelete { get; set; } = false;
    public bool CanExport { get; set; } = false;
}
