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
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLog;

    public UsersController(ApplicationDbContext context, IAuditLogService auditLog)
    {
        _context = context;
        _auditLog = auditLog;
    }

    private string GetClientIp() => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private string GetCurrentUsername() => User.Identity?.Name ?? "Admin";

    // GET /api/users — Tất cả tài khoản đăng nhập có thể xem danh sách nhân sự để phân công xử lý
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _context.Users
            .Include(u => u.Role)
            .Include(u => u.Department)
            .OrderBy(u => u.RoleId).ThenBy(u => u.FullName)
            .Select(u => new
            {
                u.Id, u.Username, u.FullName, u.Email,
                u.RoleId, u.IsActive, u.LastLoginAt, u.CreatedAt,
                u.DepartmentId,
                DepartmentName = u.Department != null ? u.Department.Name : null,
                isDefaultPassword = PasswordPolicy.IsDefaultPassword(u.PasswordHash)
            })
            .ToListAsync();
        return Ok(users);
    }

    // POST /api/users — Admin only
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest req)
    {
        var ip = GetClientIp();
        var adminUser = GetCurrentUsername();

        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Tên đăng nhập và mật khẩu là bắt buộc." });

        var (isValid, errorMsg) = PasswordPolicy.Validate(req.Password);
        if (!isValid)
            return BadRequest(new { message = errorMsg });

        var exists = await _context.Users.AnyAsync(u => u.Username == req.Username.Trim());
        if (exists)
            return BadRequest(new { message = $"Tên đăng nhập '{req.Username}' đã tồn tại." });

        var roleExists = await _context.Roles.AnyAsync(r => r.Id == req.RoleId);
        if (!roleExists)
            return BadRequest(new { message = "Vai trò không hợp lệ." });

        var user = new User
        {
            Username = req.Username.Trim(),
            FullName = req.FullName?.Trim() ?? "",
            Email = req.Email?.Trim() ?? "",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            RoleId = req.RoleId,
            DepartmentId = req.DepartmentId,
            IsActive = true,
            CreatedAt = DateTime.Now,
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync("CREATE_USER", adminUser, ip, 
            $"Đã tạo tài khoản mới: {user.Username} (Role: {req.RoleId})", true);

        return Ok(new { message = $"Đã tạo tài khoản '{user.Username}'.", id = user.Id });
    }

    // PUT /api/users/{id} — Admin only
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest req)
    {
        var ip = GetClientIp();
        var adminUser = GetCurrentUsername();

        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "Không tìm thấy tài khoản." });

        // Không cho phép vô hiệu hóa tài khoản admin duy nhất
        if (!req.IsActive && user.RoleId == 1)
        {
            var adminCount = await _context.Users.CountAsync(u => u.RoleId == 1 && u.IsActive);
            if (adminCount <= 1)
                return BadRequest(new { message = "Không thể vô hiệu hóa tài khoản Admin duy nhất." });
        }

        user.FullName = req.FullName?.Trim() ?? user.FullName;
        user.Email = req.Email?.Trim() ?? user.Email;
        user.RoleId = req.RoleId;
        user.DepartmentId = req.DepartmentId;
        user.IsActive = req.IsActive;

        await _context.SaveChangesAsync();

        await _auditLog.LogAsync("UPDATE_USER", adminUser, ip, 
            $"Đã cập nhật tài khoản: {user.Username} (Trạng thái: {(req.IsActive ? "Kích hoạt" : "Khóa")})", true);

        return Ok(new { message = "Đã cập nhật tài khoản." });
    }

    // POST /api/users/{id}/reset-password — Admin only
    [HttpPost("{id}/reset-password")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordRequest req)
    {
        var ip = GetClientIp();
        var adminUser = GetCurrentUsername();

        var (isValid, errorMsg) = PasswordPolicy.Validate(req.NewPassword);
        if (!isValid)
            return BadRequest(new { message = errorMsg });

        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "Không tìm thấy tài khoản." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync("RESET_PASSWORD", adminUser, ip, 
            $"Đã đặt lại mật khẩu cho tài khoản: {user.Username}", true);

        return Ok(new { message = $"Đã đặt lại mật khẩu cho '{user.Username}'." });
    }
}

public record CreateUserRequest(string Username, string Password, string? FullName, string? Email, int RoleId, int? DepartmentId = null);
public record UpdateUserRequest(string? FullName, string? Email, int RoleId, bool IsActive, int? DepartmentId = null);
public record ResetPasswordRequest(string NewPassword);
