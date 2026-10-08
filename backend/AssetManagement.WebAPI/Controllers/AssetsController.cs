using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class AssetsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AssetsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Asset>>> GetAssets()
    {
        return await _context.Assets.AsNoTracking().Include(a => a.Category).ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Asset>> PostAsset(Asset asset)
    {
        _context.Assets.Add(asset);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAssets), new { id = asset.Id }, asset);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutAsset(int id, Asset asset)
    {
        if (id != asset.Id)
        {
            return BadRequest();
        }

        var existing = await _context.Assets.FindAsync(id);
        if (existing == null)
        {
            return NotFound();
        }

        existing.Name = asset.Name;
        existing.AssetTag = asset.AssetTag;
        existing.Serial = asset.Serial;
        existing.PurchaseDate = asset.PurchaseDate;
        existing.Price = asset.Price;
        existing.Status = asset.Status;
        existing.Quantity = asset.Quantity;
        existing.ManufactureYear = asset.ManufactureYear;
        existing.Manufacturer = asset.Manufacturer;
        existing.KyHieu = asset.KyHieu;
        existing.NuocSX = asset.NuocSX;
        existing.NamSD = asset.NamSD;
        existing.SoLuuHanh = asset.SoLuuHanh;
        existing.HdTu = asset.HdTu;
        existing.HdDen = asset.HdDen;
        existing.TuNgay = asset.TuNgay;
        existing.DenNgay = asset.DenNgay;
        existing.LegacyId = asset.LegacyId;
        existing.CategoryId = asset.CategoryId;
        existing.AssignedUserId = asset.AssignedUserId;
        existing.CurrentDepartment = asset.CurrentDepartment;
        existing.DepartmentId = asset.DepartmentId;

        // Đồng bộ số lượng sang Equipments nếu có thiết bị tương ứng
        if (!string.IsNullOrWhiteSpace(existing.AssetTag))
        {
            var matchedEq = await _context.Equipments.FirstOrDefaultAsync(e => e.Code == existing.AssetTag);
            if (matchedEq != null)
            {
                matchedEq.Quantity = existing.Quantity;
                if (!string.IsNullOrWhiteSpace(existing.Name)) matchedEq.Name = existing.Name;
            }
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!AssetExists(id))
            {
                return NotFound();
            }
            else
            {
                throw;
            }
        }

        return NoContent();
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateAssetStatusDto dto)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return NotFound(new { message = "Không tìm thấy tài sản." });

        if (dto.Status < 1 || dto.Status > 5)
        {
            return BadRequest(new { message = "Trạng thái không hợp lệ." });
        }

        asset.Status = (AssetStatus)dto.Status;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Cập nhật trạng thái thành công.", status = (int)asset.Status });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAsset(int id)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null)
        {
            return NotFound(new { message = "Không tìm thấy tài sản." });
        }

        // Dọn dẹp các ràng buộc phụ thuộc để xóa an toàn
        var transfers = _context.AssetTransfers.Where(t => t.AssetId == id);
        _context.AssetTransfers.RemoveRange(transfers);

        var usageLogs = _context.DeviceUsageLogs.Where(u => u.AssetId == id);
        _context.DeviceUsageLogs.RemoveRange(usageLogs);

        var tickets = _context.MaintenanceTickets.Where(m => m.AssetId == id);
        _context.MaintenanceTickets.RemoveRange(tickets);

        var repairRequests = await _context.RepairRequests.Where(r => r.AssetId == id).ToListAsync();
        foreach (var r in repairRequests)
        {
            r.AssetId = null;
        }

        // Nếu có thiết bị tương ứng bên Quản lý Thiết bị (theo mã QR/AssetTag/Serial/Name), xóa để đồng bộ số lượng
        Equipment? eq = null;
        if (!string.IsNullOrWhiteSpace(asset.AssetTag))
        {
            eq = await _context.Equipments.FirstOrDefaultAsync(e => e.Code == asset.AssetTag);
        }
        if (eq == null && !string.IsNullOrWhiteSpace(asset.Serial))
        {
            eq = await _context.Equipments.FirstOrDefaultAsync(e => e.Code == asset.Serial);
        }
        if (eq == null && !string.IsNullOrWhiteSpace(asset.Name))
        {
            eq = await _context.Equipments.FirstOrDefaultAsync(e => e.Name == asset.Name);
        }
        if (eq != null)
        {
            _context.Equipments.Remove(eq);
        }

        _context.Assets.Remove(asset);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã xóa tài sản thành công." });
    }

    public class UpdateAssetStatusDto
    {
        public int Status { get; set; }
    }

    private bool AssetExists(int id)
    {
        return _context.Assets.Any(e => e.Id == id);
    }
}

