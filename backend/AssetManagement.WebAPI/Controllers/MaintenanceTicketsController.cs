using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class MaintenanceTicketsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MaintenanceTicketsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MaintenanceTicket>>> GetTickets()
    {
        return await _context.MaintenanceTickets
            .Include(t => t.Asset)
            .Include(t => t.ReportedByUser)
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<MaintenanceTicket>> PostTicket(MaintenanceTicket ticket)
    {
        ticket.CreatedDate = DateTime.UtcNow;
        _context.MaintenanceTickets.Add(ticket);

        // Update asset status to Maintenance
        var asset = await _context.Assets.FindAsync(ticket.AssetId);
        if (asset != null)
        {
            asset.Status = AssetStatus.Maintenance;
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTickets), new { id = ticket.Id }, ticket);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] int newStatus)
    {
        var ticket = await _context.MaintenanceTickets.FindAsync(id);
        if (ticket == null) return NotFound();

        ticket.Status = (TicketStatus)newStatus;
        if (newStatus == 3) // Completed
        {
            ticket.CompletedDate = DateTime.UtcNow;
            
            // Release the asset
            var asset = await _context.Assets.FindAsync(ticket.AssetId);
            if (asset != null) asset.Status = AssetStatus.Available;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }
}

