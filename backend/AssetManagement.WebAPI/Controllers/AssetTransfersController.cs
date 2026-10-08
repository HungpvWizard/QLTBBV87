using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class AssetTransfersController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AssetTransfersController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AssetTransfer>>> GetTransfers()
    {
        return await _context.AssetTransfers
            .Include(t => t.Asset)
            .Include(t => t.FromUser)
            .Include(t => t.ToUser)
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<AssetTransfer>> PostTransfer(AssetTransfer transfer)
    {
        // Add transfer history
        _context.AssetTransfers.Add(transfer);

        // Update asset status and assignee
        var asset = await _context.Assets.FindAsync(transfer.AssetId);
        if (asset != null)
        {
            if (transfer.ToUserId != null) 
            {
                asset.AssignedUserId = transfer.ToUserId;
            }
            asset.Status = AssetStatus.InUse;
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTransfers), new { id = transfer.Id }, transfer);
    }
}

