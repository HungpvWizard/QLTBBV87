using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class RepairRequestsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public RepairRequestsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RepairRequest>>> GetRequests()
    {
        return await _context.RepairRequests
            .Include(r => r.Department)
            .Include(r => r.Asset)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<RepairRequest>> PostRequest(RepairRequest request)
    {
        request.CreatedAt = DateTime.UtcNow;
        request.Status = 1; // Pending
        
        _context.RepairRequests.Add(request);

        // Tự động chuyển trạng thái thiết bị sang Bảo trì (3) khi có phiếu đề nghị
        if (request.AssetId.HasValue)
        {
            var asset = await _context.Assets.FindAsync(request.AssetId.Value);
            if (asset != null)
            {
                asset.Status = AssetStatus.Maintenance;
            }
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRequests), new { id = request.Id }, request);
    }

    [HttpPut("{id}/handle")]
    public async Task<IActionResult> HandleRequest(int id, [FromBody] RepairRequest updateData)
    {
        var request = await _context.RepairRequests.FindAsync(id);
        if (request == null) return NotFound();

        request.Status = updateData.Status;
        request.HandlingNotes = updateData.HandlingNotes;
        request.HandlerName = updateData.HandlerName;
        request.UpdatedAt = DateTime.UtcNow;

        // Tự động đồng bộ trạng thái thiết bị theo tiến độ xử lý phiếu:
        if (request.AssetId.HasValue)
        {
            var asset = await _context.Assets.FindAsync(request.AssetId.Value);
            if (asset != null)
            {
                if (updateData.Status == 3) // Hoàn thành
                {
                    // Chuyển lại trạng thái Đang sử dụng (2)
                    asset.Status = AssetStatus.InUse;
                }
                else if (updateData.Status == 1 || updateData.Status == 2) // Đang chờ hoặc Đang sửa
                {
                    asset.Status = AssetStatus.Maintenance;
                }
            }
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }
}

