using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EquipmentsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public EquipmentsController(ApplicationDbContext db) => _db = db;

    // GET /api/equipments
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int? categoryId)
    {
        var q = _db.Equipments.Include(e => e.Category).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(e => e.Name.Contains(search) || e.Code.Contains(search) || e.UsingUnit.Contains(search));
        if (categoryId.HasValue)
            q = q.Where(e => e.CategoryId == categoryId.Value);
        var list = await q.OrderByDescending(e => e.Id).Select(e => new {
            e.Id, e.Name, e.Code, e.Unit, e.Quantity, e.UsingUnit,
            e.ManufactureYear, e.UseYear, e.WarrantyPeriod, e.ExpiryDate,
            qualityGrade = e.QualityGrade.HasValue ? (int)e.QualityGrade.Value : (int?)null,
            qualityGradeLabel = e.QualityGrade.HasValue ? GetQualityLabel(e.QualityGrade.Value) : null,
            e.Notes, e.CategoryId,
            categoryName = e.Category != null ? e.Category.Name : null
        }).ToListAsync();
        return Ok(list);
    }

    // GET /api/equipments/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var e = await _db.Equipments.Include(x => x.Category).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return NotFound();
        return Ok(new {
            e.Id, e.Name, e.Code, e.Unit, e.Quantity, e.UsingUnit,
            e.ManufactureYear, e.UseYear, e.WarrantyPeriod, e.ExpiryDate,
            qualityGrade = e.QualityGrade.HasValue ? (int)e.QualityGrade.Value : (int?)null,
            e.Notes, e.CategoryId,
            categoryName = e.Category?.Name
        });
    }

    // POST /api/equipments
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EquipmentDto dto)
    {
        var eq = MapFromDto(dto, new Equipment());
        _db.Equipments.Add(eq);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = eq.Id }, new { eq.Id });
    }

    // PUT /api/equipments/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] EquipmentDto dto)
    {
        var eq = await _db.Equipments.FindAsync(id);
        if (eq == null) return NotFound();
        MapFromDto(dto, eq);
        await _db.SaveChangesAsync();

        // Đồng bộ số lượng sang bảng Assets nếu có tài sản tương ứng
        if (!string.IsNullOrEmpty(eq.Code))
        {
            var matchedAsset = await _db.Assets.FirstOrDefaultAsync(a => a.AssetTag == eq.Code || a.Serial == eq.Code);
            if (matchedAsset != null)
            {
                matchedAsset.Quantity = eq.Quantity;
                if (!string.IsNullOrEmpty(eq.Name)) matchedAsset.Name = eq.Name;
                await _db.SaveChangesAsync();
            }
        }

        return NoContent();
    }

    // DELETE /api/equipments/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var eq = await _db.Equipments.FindAsync(id);
        if (eq == null) return NotFound();

        // Đồng bộ xóa tài sản tương ứng bên bảng Assets nếu có
        Asset? matchedAsset = null;
        if (!string.IsNullOrWhiteSpace(eq.Code))
        {
            matchedAsset = await _db.Assets.FirstOrDefaultAsync(a => a.AssetTag == eq.Code || a.Serial == eq.Code);
        }
        if (matchedAsset == null && !string.IsNullOrWhiteSpace(eq.Name))
        {
            matchedAsset = await _db.Assets.FirstOrDefaultAsync(a => a.Name == eq.Name);
        }

        if (matchedAsset != null)
        {
            var aid = matchedAsset.Id;
            var transfers = _db.AssetTransfers.Where(t => t.AssetId == aid);
            _db.AssetTransfers.RemoveRange(transfers);

            var usageLogs = _db.DeviceUsageLogs.Where(u => u.AssetId == aid);
            _db.DeviceUsageLogs.RemoveRange(usageLogs);

            var tickets = _db.MaintenanceTickets.Where(m => m.AssetId == aid);
            _db.MaintenanceTickets.RemoveRange(tickets);

            var repairRequests = await _db.RepairRequests.Where(r => r.AssetId == aid).ToListAsync();
            foreach (var r in repairRequests)
            {
                r.AssetId = null;
            }

            _db.Assets.Remove(matchedAsset);
        }

        _db.Equipments.Remove(eq);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/equipments/import-excel
    [HttpPost("import-excel")]
    public async Task<IActionResult> ImportExcel(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Vui long chon file Excel." });

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (ext != ".xlsx" && ext != ".xls")
            return BadRequest(new { message = "Chi chap nhan file .xlsx hoac .xls." });

        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
        var errors = new List<string>();
        var added = 0;

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        using var pkg = new ExcelPackage(stream);
        var ws = pkg.Workbook.Worksheets.FirstOrDefault();
        if (ws == null) return BadRequest(new { message = "File Excel khong co sheet nao." });

        // Row 1 = header, data starts from row 2
        for (int row = 2; row <= ws.Dimension?.End.Row; row++)
        {
            var name = ws.Cells[row, 1].Text?.Trim();
            if (string.IsNullOrEmpty(name)) continue;

            var code = ws.Cells[row, 2].Text?.Trim() ?? "";
            var unit = ws.Cells[row, 3].Text?.Trim() ?? "";
            int.TryParse(ws.Cells[row, 4].Text?.Trim(), out var qty);
            var categoryName = ws.Cells[row, 5].Text?.Trim() ?? "";
            var usingUnit = ws.Cells[row, 6].Text?.Trim() ?? "";
            int.TryParse(ws.Cells[row, 7].Text?.Trim(), out var mfYear);
            int.TryParse(ws.Cells[row, 8].Text?.Trim(), out var useYear);
            var warranty = ws.Cells[row, 9].Text?.Trim() ?? "";
            int.TryParse(ws.Cells[row, 10].Text?.Trim(), out var grade);

            // Find category
            var cat = await _db.Categories.FirstOrDefaultAsync(c => c.Name == categoryName);
            if (cat == null)
            {
                errors.Add($"Hang {row}: Khong tim thay danh muc '{categoryName}'");
                continue;
            }

            var eq = new Equipment
            {
                Name = name,
                Code = code,
                Unit = unit,
                Quantity = qty > 0 ? qty : 1,
                UsingUnit = usingUnit,
                ManufactureYear = mfYear > 0 ? mfYear : null,
                UseYear = useYear > 0 ? useYear : null,
                WarrantyPeriod = warranty,
                QualityGrade = grade >= 1 && grade <= 4 ? (QualityGrade?)grade : null,
                CategoryId = cat.Id
            };
            _db.Equipments.Add(eq);
            added++;
        }

        await _db.SaveChangesAsync();
        return Ok(new { added, errors });
    }

    // GET /api/equipments/export-template
    [HttpGet("export-template")]
    public IActionResult ExportTemplate()
    {
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
        using var pkg = new ExcelPackage();
        var ws = pkg.Workbook.Worksheets.Add("ThietBi");
        var headers = new[] {
            "Ten Thiet bi(*)", "Ma Thiet bi", "Don vi tinh", "So luong",
            "Danh muc(*)", "Don vi su dung", "Nam san xuat", "Nam su dung",
            "Thoi gian bao hanh", "Phan cap chat luong(1-4)"
        };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cells[1, i + 1].Value = headers[i];
            ws.Cells[1, i + 1].Style.Font.Bold = true;
        }
        ws.Cells[2, 1].Value = "May sieu am";
        ws.Cells[2, 2].Value = "TB-001";
        ws.Cells[2, 3].Value = "Cai";
        ws.Cells[2, 4].Value = 2;
        ws.Cells[2, 5].Value = "Thiet bi y te";
        ws.Cells[2, 6].Value = "Khoa Noi";
        ws.Cells[2, 7].Value = 2020;
        ws.Cells[2, 8].Value = 2021;
        ws.Cells[2, 9].Value = "24 thang";
        ws.Cells[2, 10].Value = 1;
        ws.Cells.AutoFitColumns();

        var bytes = pkg.GetAsByteArray();
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Mau_NhapThietBi.xlsx");
    }

    private static Equipment MapFromDto(EquipmentDto dto, Equipment eq)
    {
        eq.Name = dto.Name ?? "";
        eq.Code = dto.Code ?? "";
        eq.Unit = dto.Unit ?? "";
        eq.Quantity = dto.Quantity > 0 ? dto.Quantity : 1;
        eq.UsingUnit = dto.UsingUnit ?? "";
        eq.ManufactureYear = dto.ManufactureYear;
        eq.UseYear = dto.UseYear;
        eq.WarrantyPeriod = dto.WarrantyPeriod ?? "";
        eq.ExpiryDate = dto.ExpiryDate;
        eq.QualityGrade = dto.QualityGrade.HasValue ? (QualityGrade)dto.QualityGrade.Value : null;
        eq.Notes = dto.Notes ?? "";
        eq.CategoryId = dto.CategoryId;
        return eq;
    }

    private static string GetQualityLabel(QualityGrade g) => g switch
    {
        QualityGrade.Cap1 => "Cấp 1",
        QualityGrade.Cap2 => "Cấp 2",
        QualityGrade.Cap3 => "Cấp 3",
        QualityGrade.Cap4 => "Cấp 4",
        QualityGrade.Cap5 => "Cấp 5",
        QualityGrade.Cap6 => "Cấp 6",
        _ => ""
    };
}

public record EquipmentDto(
    string? Name,
    string? Code,
    string? Unit,
    int Quantity,
    string? UsingUnit,
    int? ManufactureYear,
    int? UseYear,
    string? WarrantyPeriod,
    DateTime? ExpiryDate,
    int? QualityGrade,
    string? Notes,
    int CategoryId
);
