using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using AssetManagement.WebAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;
    private readonly ILoginRateLimiter _rateLimiter;
    private readonly IAuditLogService _auditLog;

    public AuthController(
        ApplicationDbContext context, 
        IConfiguration config, 
        ILogger<AuthController> logger,
        ILoginRateLimiter rateLimiter,
        IAuditLogService auditLog)
    {
        _context = context;
        _config = config;
        _logger = logger;
        _rateLimiter = rateLimiter;
        _auditLog = auditLog;
    }

    private string GetClientIp()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    // POST /api/auth/login
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var ip = GetClientIp();

        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Vui lòng nhập tên đăng nhập và mật khẩu." });

        var username = request.Username.Trim();

        // 1. Kiểm tra khóa tài khoản / Rate Limiting chống Brute-Force
        if (_rateLimiter.IsLockedOut(ip, username, out int remainingMinutes))
        {
            await _auditLog.LogAsync("LOGIN_LOCKED", username, ip, 
                $"Tài khoản bị tạm khóa còn {remainingMinutes} phút do nhập sai quá 5 lần liên tiếp.", false);

            return StatusCode(429, new 
            { 
                message = $"Tài khoản hoặc địa chỉ IP tạm thời bị khóa do nhập sai mật khẩu quá 5 lần liên tiếp. Vui lòng thử lại sau {remainingMinutes} phút để đảm bảo an toàn." 
            });
        }

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Username == username);

        if (user == null || !user.IsActive)
        {
            _rateLimiter.RecordFailedAttempt(ip, username);
            int remaining = _rateLimiter.GetRemainingAttempts(ip, username);

            await _auditLog.LogAsync("LOGIN_FAILED", username, ip, 
                user == null ? "Tài khoản không tồn tại" : "Tài khoản đã bị vô hiệu hóa", false);

            return Unauthorized(new 
            { 
                message = $"Tên đăng nhập hoặc mật khẩu không đúng. (Còn lại {remaining} lần thử trước khi bị khóa tạm thời)" 
            });
        }

        // Verify password
        bool valid;
        try { valid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash); }
        catch { valid = false; }

        if (!valid)
        {
            _rateLimiter.RecordFailedAttempt(ip, username);
            int remaining = _rateLimiter.GetRemainingAttempts(ip, username);

            await _auditLog.LogAsync("LOGIN_FAILED", username, ip, "Mật khẩu không chính xác", false);

            return Unauthorized(new 
            { 
                message = $"Tên đăng nhập hoặc mật khẩu không đúng. (Còn lại {remaining} lần thử trước khi bị khóa tạm thời)" 
            });
        }

        // Đăng nhập thành công -> Reset số lần thử sai
        _rateLimiter.ResetAttempts(ip, username);

        // Update last login
        user.LastLoginAt = DateTime.Now;
        await _context.SaveChangesAsync();

        var token = GenerateJwt(user);
        bool isDefaultPassword = PasswordPolicy.IsDefaultPassword(user.PasswordHash);

        await _auditLog.LogAsync("LOGIN_SUCCESS", user.Username, ip, "Đăng nhập hệ thống thành công", true);

        return Ok(new
        {
            token,
            user = new
            {
                id = user.Id,
                username = user.Username,
                fullName = user.FullName,
                email = user.Email,
                role = user.Role!.Name,
                roleId = user.RoleId,
                isDefaultPassword
            }
        });
    }

    // GET /api/auth/me
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        bool isDefaultPassword = PasswordPolicy.IsDefaultPassword(user.PasswordHash);

        return Ok(new
        {
            id = user.Id,
            username = user.Username,
            fullName = user.FullName,
            email = user.Email,
            role = user.Role!.Name,
            roleId = user.RoleId,
            isDefaultPassword
        });
    }

    // POST /api/auth/change-password
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var ip = GetClientIp();
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        bool valid;
        try { valid = BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash); }
        catch { valid = false; }

        if (!valid)
        {
            await _auditLog.LogAsync("CHANGE_PASSWORD_FAILED", user.Username, ip, "Mật khẩu hiện tại không đúng", false);
            return BadRequest(new { message = "Mật khẩu hiện tại không đúng." });
        }

        // Kiểm tra chính sách mật khẩu mạnh
        var (isValid, errorMessage) = PasswordPolicy.Validate(request.NewPassword);
        if (!isValid)
        {
            return BadRequest(new { message = errorMessage });
        }

        if (request.OldPassword == request.NewPassword)
        {
            return BadRequest(new { message = "Mật khẩu mới không được trùng với mật khẩu cũ." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync("CHANGE_PASSWORD_SUCCESS", user.Username, ip, "Đổi mật khẩu tài khoản thành công", true);

        return Ok(new { message = "Đổi mật khẩu thành công!" });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────
    private string GenerateJwt(User user)
    {
        var jwtSection = _config.GetSection("JwtSettings");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["SecretKey"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expHours = int.Parse(jwtSection["ExpirationHours"] ?? "8");

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role!.Name),
            new Claim("fullName", user.FullName),
        };

        var token = new JwtSecurityToken(
            issuer: jwtSection["Issuer"],
            audience: jwtSection["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expHours),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }
}

public record LoginRequest(string Username, string Password);
public record ChangePasswordRequest(string OldPassword, string NewPassword);
