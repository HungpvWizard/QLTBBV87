using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class WarehousesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public WarehousesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Warehouse>>> GetWarehouses()
    {
        return await _context.Warehouses.ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Warehouse>> PostWarehouse(Warehouse warehouse)
    {
        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetWarehouses), new { id = warehouse.Id }, warehouse);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutWarehouse(int id, Warehouse warehouse)
    {
        if (id != warehouse.Id)
        {
            return BadRequest(new { message = "ID không trùng khớp." });
        }

        var existing = await _context.Warehouses.FindAsync(id);
        if (existing == null)
        {
            return NotFound(new { message = "Không tìm thấy kho cần sửa." });
        }

        existing.Name = warehouse.Name.Trim();
        existing.Description = warehouse.Description?.Trim() ?? "";

        await _context.SaveChangesAsync();
        return Ok(new { message = "Đã cập nhật kho thành công." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWarehouse(int id)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if (warehouse == null)
        {
            return NotFound(new { message = "Không tìm thấy kho cần xóa." });
        }

        // Kiểm tra xem có danh mục nào đang thuộc kho này không
        var hasCategories = await _context.Categories.AnyAsync(c => c.WarehouseId == id);
        if (hasCategories)
        {
            return BadRequest(new { message = "Không thể xóa kho này vì đang chứa danh mục. Vui lòng chuyển hoặc xóa các danh mục thuộc kho trước." });
        }

        _context.Warehouses.Remove(warehouse);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã xóa kho thành công." });
    }
}

