using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public CategoriesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Category>>> GetCategories()
    {
        return await _context.Categories.ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Category>> PostCategory(Category category)
    {
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCategories), new { id = category.Id }, category);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutCategory(int id, Category category)
    {
        if (id != category.Id)
        {
            return BadRequest(new { message = "ID không trùng khớp." });
        }

        var existing = await _context.Categories.FindAsync(id);
        if (existing == null)
        {
            return NotFound(new { message = "Không tìm thấy danh mục cần sửa." });
        }

        existing.Name = category.Name.Trim();
        existing.WarehouseId = category.WarehouseId;
        existing.Type = category.Type != 0 ? category.Type : CategoryType.Asset;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Đã cập nhật danh mục thành công." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
        {
            return NotFound(new { message = "Không tìm thấy danh mục cần xóa." });
        }

        // Kiểm tra xem có thiết bị/tài sản nào đang thuộc danh mục này không
        var hasAssets = await _context.Assets.AnyAsync(a => a.CategoryId == id);
        if (hasAssets)
        {
            return BadRequest(new { message = "Không thể xóa danh mục này vì đang có thiết bị/tài sản trực thuộc. Vui lòng chuyển thiết bị sang danh mục khác trước." });
        }

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã xóa danh mục thành công." });
    }
}

