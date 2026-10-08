using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class DepartmentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DepartmentsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/departments
    [HttpGet]
    public async Task<IActionResult> GetDepartments()
    {
        var departments = await _context.Departments
            .OrderBy(d => d.Id)
            .Select(d => new
            {
                d.Id,
                d.Name,
                UserCount = d.Users.Count
            })
            .ToListAsync();

        return Ok(departments);
    }

    // GET: api/departments/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetDepartment(int id)
    {
        var department = await _context.Departments
            .Where(d => d.Id == id)
            .Select(d => new
            {
                d.Id,
                d.Name,
                UserCount = d.Users.Count
            })
            .FirstOrDefaultAsync();

        if (department == null)
            return NotFound(new { message = "Không tìm thấy khoa phòng." });

        return Ok(department);
    }

    // POST: api/departments
    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> CreateDepartment([FromBody] DepartmentDto req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Tên khoa phòng không được để trống." });

        var trimmedName = req.Name.Trim();
        var exists = await _context.Departments.AnyAsync(d => d.Name.ToLower() == trimmedName.ToLower());
        if (exists)
            return BadRequest(new { message = $"Khoa phòng '{trimmedName}' đã tồn tại." });

        var department = new Department
        {
            Name = trimmedName
        };

        _context.Departments.Add(department);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            id = department.Id,
            name = department.Name,
            userCount = 0,
            message = $"Đã thêm khoa phòng '{department.Name}'."
        });
    }

    // PUT: api/departments/{id}
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UpdateDepartment(int id, [FromBody] DepartmentDto req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Tên khoa phòng không được để trống." });

        var trimmedName = req.Name.Trim();
        var department = await _context.Departments.FindAsync(id);
        if (department == null)
            return NotFound(new { message = "Không tìm thấy khoa phòng." });

        var exists = await _context.Departments.AnyAsync(d => d.Id != id && d.Name.ToLower() == trimmedName.ToLower());
        if (exists)
            return BadRequest(new { message = $"Khoa phòng '{trimmedName}' đã tồn tại." });

        department.Name = trimmedName;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Đã cập nhật khoa phòng thành '{department.Name}'." });
    }

    // DELETE: api/departments/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteDepartment(int id)
    {
        var department = await _context.Departments
            .Include(d => d.Users)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (department == null)
            return NotFound(new { message = "Không tìm thấy khoa phòng." });

        if (department.Users != null && department.Users.Any())
        {
            return BadRequest(new
            {
                message = $"Khoa phòng '{department.Name}' đang có {department.Users.Count} tài khoản trực thuộc. Vui lòng chuyển các tài khoản này sang khoa phòng khác trước khi xóa."
            });
        }

        _context.Departments.Remove(department);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Đã xóa khoa phòng '{department.Name}' thành công." });
    }
}

public record DepartmentDto(string Name);
