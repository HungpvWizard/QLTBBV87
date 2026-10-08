using AssetManagement.Application.Services;
using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AssetManagement.WebAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class KpiController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public KpiController(ApplicationDbContext context)
    {
        _context = context;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    private string GetCurrentUserName()
    {
        return User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("fullName")?.Value ?? "User";
    }

    private string GetCurrentUserRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value ?? "Staff";
    }

    private string GetClientIp()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    // ─── 1. DANH MỤC CẤU HÌNH KPI ───────────────────────────────────────────

    // GET /api/kpi/definitions?version=1
    [HttpGet("definitions")]
    public async Task<IActionResult> GetDefinitions([FromQuery] int version = 1)
    {
        var defs = await _context.KpiDefinitions
            .Where(d => d.Version == version && d.IsActive)
            .OrderBy(d => d.OrderIndex)
            .ToListAsync();

        if (!defs.Any() && version == 1)
        {
            // Tự động nạp 26 KPI chuẩn nếu chưa có
            defs = KpiEngine.GetStandardDefinitions(1);
            _context.KpiDefinitions.AddRange(defs);
            await _context.SaveChangesAsync();
        }

        return Ok(defs);
    }

    // PUT /api/kpi/definitions/{id} (Chỉ Quản trị viên Admin)
    [HttpPut("definitions/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateDefinition(int id, [FromBody] UpdateDefinitionRequest req)
    {
        var def = await _context.KpiDefinitions.FindAsync(id);
        if (def == null) return NotFound(new { message = "Không tìm thấy chỉ số KPI." });

        def.Name = req.Name ?? def.Name;
        def.Weight = req.Weight ?? def.Weight;
        def.ThresholdExcellent = req.ThresholdExcellent;
        def.ThresholdGood = req.ThresholdGood;
        def.ThresholdAverage = req.ThresholdAverage;
        def.CriteriaNote = req.CriteriaNote ?? def.CriteriaNote;
        def.EvaluationDirection = req.EvaluationDirection ?? def.EvaluationDirection;

        await _context.SaveChangesAsync();
        return Ok(def);
    }

    // ─── 2. QUẢN LÝ HỒ SƠ ĐÁNH GIÁ KPI (ASSESSMENTS) ─────────────────────────

    // GET /api/kpi/assessments
    [HttpGet("assessments")]
    public async Task<IActionResult> GetAssessments(
        [FromQuery] int? departmentId,
        [FromQuery] int? year,
        [FromQuery] string? periodType,
        [FromQuery] string? status)
    {
        var query = _context.KpiAssessments
            .Include(a => a.Department)
            .AsNoTracking()
            .AsQueryable();

        if (departmentId.HasValue)
            query = query.Where(a => a.DepartmentId == departmentId.Value);

        if (year.HasValue)
            query = query.Where(a => a.PeriodYear == year.Value);

        if (!string.IsNullOrEmpty(periodType))
            query = query.Where(a => a.PeriodType == periodType);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(a => a.Status == status);

        var list = await query
            .OrderByDescending(a => a.PeriodYear)
            .ThenByDescending(a => a.PeriodMonth)
            .ThenByDescending(a => a.Id)
            .Select(a => new
            {
                a.Id,
                a.DepartmentId,
                DepartmentName = a.Department != null ? a.Department.Name : a.DepartmentName,
                a.PeriodType,
                a.PeriodYear,
                a.PeriodQuarter,
                a.PeriodMonth,
                a.PeriodName,
                a.StartDate,
                a.EndDate,
                a.ConfigVersion,
                a.Status,
                a.Revision,
                a.ScoreGroupA,
                a.ScoreGroupB,
                a.ScoreGroupC,
                a.ScoreGroupD,
                a.TotalScore,
                a.ScoreRating,
                a.HasFailKpi,
                a.HasSevereIncidents,
                a.BlockingNote,
                a.FinalRating,
                a.FinalConclusionNotes,
                a.DecidedBy,
                a.DecisionDate,
                a.CreatedByUserName,
                a.ApprovedByUserName,
                a.CreatedAt,
                a.UpdatedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    // GET /api/kpi/assessments/{id}
    [HttpGet("assessments/{id}")]
    public async Task<IActionResult> GetAssessment(int id)
    {
        var assessment = await _context.KpiAssessments
            .Include(a => a.Department)
            .Include(a => a.Lines)
            .Include(a => a.Audits.OrderByDescending(au => au.CreatedAt))
            .FirstOrDefaultAsync(a => a.Id == id);

        if (assessment == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ đánh giá KPI." });

        // Nếu hồ sơ chưa có đủ 26 dòng, nạp từ cấu hình
        if (assessment.Lines == null || assessment.Lines.Count < 26)
        {
            var defs = await _context.KpiDefinitions
                .Where(d => d.Version == assessment.ConfigVersion && d.IsActive)
                .OrderBy(d => d.OrderIndex)
                .ToListAsync();

            if (!defs.Any())
                defs = KpiEngine.GetStandardDefinitions(assessment.ConfigVersion);

            var existingCodes = assessment.Lines?.Select(l => l.KpiCode).ToHashSet() ?? new HashSet<string>();

            foreach (var def in defs)
            {
                if (!existingCodes.Contains(def.Code))
                {
                    var calc = KpiEngine.CalculateLine(
                        def.Code, def.Unit, def.EvaluationDirection, def.Weight,
                        def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage,
                        null, null, null);

                    assessment.Lines?.Add(new KpiAssessmentLine
                    {
                        AssessmentId = assessment.Id,
                        KpiCode = def.Code,
                        KpiName = def.Name,
                        Group = def.Group,
                        Weight = def.Weight,
                        Unit = def.Unit,
                        EvaluationDirection = def.EvaluationDirection,
                        ThresholdExcellent = def.ThresholdExcellent,
                        ThresholdGood = def.ThresholdGood,
                        ThresholdAverage = def.ThresholdAverage,
                        Numerator = null,
                        Denominator = null,
                        ActualValue = null,
                        CalculatedResult = calc.CalculatedResult,
                        RatingLevel = calc.RatingLevel,
                        Score = calc.Score,
                        ConvertedScore = calc.ConvertedScore,
                        UpdatedAt = DateTime.Now
                    });
                }
            }

            // Tính tổng hợp lại
            var summary = KpiEngine.CalculateAssessmentSummary(assessment.Lines!);
            assessment.ScoreGroupA = summary.ScoreGroupA;
            assessment.ScoreGroupB = summary.ScoreGroupB;
            assessment.ScoreGroupC = summary.ScoreGroupC;
            assessment.ScoreGroupD = summary.ScoreGroupD;
            assessment.TotalScore = summary.TotalScore;
            assessment.ScoreRating = summary.ScoreRating;
            assessment.HasFailKpi = summary.HasFailKpi;
            assessment.HasSevereIncidents = summary.HasSevereIncidents;
            assessment.BlockingNote = summary.BlockingNote;
            if (string.IsNullOrEmpty(assessment.FinalRating))
                assessment.FinalRating = summary.FinalRating;

            await _context.SaveChangesAsync();
        }

        // Sắp xếp các dòng theo danh mục chuẩn (A1 -> D5)
        var orderMap = new Dictionary<string, int>
        {
            {"A1",1},{"A2",2},{"A3",3},{"A4",4},{"A5",5},{"A6",6},{"A7",7},
            {"B1",8},{"B2",9},{"B3",10},{"B4",11},{"B5",12},{"B6",13},{"B7",14},{"B8",15},
            {"C1",16},{"C2",17},{"C3",18},{"C4",19},{"C5",20},{"C6",21},
            {"D1",22},{"D2",23},{"D3",24},{"D4",25},{"D5",26}
        };

        var orderedLines = (assessment.Lines ?? new List<KpiAssessmentLine>())
            .OrderBy(l => orderMap.TryGetValue(l.KpiCode, out var idx) ? idx : 999)
            .ToList();

        return Ok(new
        {
            assessment.Id,
            assessment.DepartmentId,
            DepartmentName = assessment.Department != null ? assessment.Department.Name : assessment.DepartmentName,
            assessment.PeriodType,
            assessment.PeriodYear,
            assessment.PeriodQuarter,
            assessment.PeriodMonth,
            assessment.PeriodName,
            assessment.StartDate,
            assessment.EndDate,
            assessment.ConfigVersion,
            assessment.Status,
            assessment.Revision,
            assessment.ScoreGroupA,
            assessment.ScoreGroupB,
            assessment.ScoreGroupC,
            assessment.ScoreGroupD,
            assessment.TotalScore,
            assessment.ScoreRating,
            assessment.HasFailKpi,
            assessment.HasSevereIncidents,
            assessment.HasOverdueDevicesUsed,
            assessment.HasLegalViolations,
            assessment.BlockingNote,
            assessment.FinalRating,
            assessment.FinalConclusionNotes,
            assessment.DecidedBy,
            assessment.DecisionDate,
            assessment.DecisionReference,
            assessment.CreatedByUserName,
            assessment.ApprovedByUserName,
            assessment.CreatedAt,
            assessment.UpdatedAt,
            Lines = orderedLines,
            Audits = assessment.Audits
        });
    }

    // POST /api/kpi/assessments (Tạo hồ sơ mới)
    [HttpPost("assessments")]
    public async Task<IActionResult> CreateAssessment([FromBody] CreateAssessmentRequest req)
    {
        var userName = GetCurrentUserName();
        var userId = GetCurrentUserId();
        var ip = GetClientIp();

        string deptName = req.DepartmentName ?? string.Empty;
        if (req.DepartmentId.HasValue)
        {
            var dept = await _context.Departments.FindAsync(req.DepartmentId.Value);
            if (dept != null) deptName = dept.Name;
        }

        if (string.IsNullOrWhiteSpace(deptName))
            deptName = "Toàn bệnh viện";

        // Tạo periodName hiển thị
        string periodName = req.PeriodName ?? string.Empty;
        if (string.IsNullOrWhiteSpace(periodName))
        {
            if (req.PeriodType == "Tháng")
                periodName = $"Tháng {req.PeriodMonth:D2}/{req.PeriodYear}";
            else if (req.PeriodType == "Quý")
                periodName = $"Quý {req.PeriodQuarter}/{req.PeriodYear}";
            else
                periodName = $"Năm {req.PeriodYear}";
        }

        // Lấy danh mục cấu hình KPI theo version
        int version = req.ConfigVersion > 0 ? req.ConfigVersion : 1;
        var defs = await _context.KpiDefinitions
            .Where(d => d.Version == version && d.IsActive)
            .OrderBy(d => d.OrderIndex)
            .ToListAsync();

        if (!defs.Any())
            defs = KpiEngine.GetStandardDefinitions(version);

        var assessment = new KpiAssessment
        {
            DepartmentId = req.DepartmentId,
            DepartmentName = deptName,
            PeriodType = req.PeriodType ?? "Tháng",
            PeriodYear = req.PeriodYear,
            PeriodQuarter = req.PeriodQuarter,
            PeriodMonth = req.PeriodMonth,
            PeriodName = periodName,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            ConfigVersion = version,
            Status = "Draft",
            Revision = 1,
            CreatedByUserId = userId,
            CreatedByUserName = userName,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now,
            Lines = new List<KpiAssessmentLine>(),
            Audits = new List<KpiAudit>()
        };

        // Khởi tạo đầy đủ 26 dòng theo đúng công thức gốc
        foreach (var def in defs)
        {
            var calc = KpiEngine.CalculateLine(
                def.Code, def.Unit, def.EvaluationDirection, def.Weight,
                def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage,
                null, null, null);

            assessment.Lines.Add(new KpiAssessmentLine
            {
                KpiCode = def.Code,
                KpiName = def.Name,
                Group = def.Group,
                Weight = def.Weight,
                Unit = def.Unit,
                EvaluationDirection = def.EvaluationDirection,
                ThresholdExcellent = def.ThresholdExcellent,
                ThresholdGood = def.ThresholdGood,
                ThresholdAverage = def.ThresholdAverage,
                Numerator = null,
                Denominator = null,
                ActualValue = null,
                CalculatedResult = calc.CalculatedResult,
                RatingLevel = calc.RatingLevel,
                Score = calc.Score,
                ConvertedScore = calc.ConvertedScore,
                Notes = null,
                ExceptionNotes = null,
                UpdatedBy = userName,
                UpdatedAt = DateTime.Now
            });
        }

        // Tính tổng hợp ban đầu (khi chưa nhập số liệu: tổng=4, Không đạt)
        var summary = KpiEngine.CalculateAssessmentSummary(assessment.Lines);
        assessment.ScoreGroupA = summary.ScoreGroupA;
        assessment.ScoreGroupB = summary.ScoreGroupB;
        assessment.ScoreGroupC = summary.ScoreGroupC;
        assessment.ScoreGroupD = summary.ScoreGroupD;
        assessment.TotalScore = summary.TotalScore;
        assessment.ScoreRating = summary.ScoreRating;
        assessment.HasFailKpi = summary.HasFailKpi;
        assessment.HasSevereIncidents = summary.HasSevereIncidents;
        assessment.BlockingNote = summary.BlockingNote;
        assessment.FinalRating = summary.FinalRating;

        // Ghi Audit
        assessment.Audits.Add(new KpiAudit
        {
            Action = "CREATE",
            PerformedBy = userName,
            IpAddress = ip,
            Details = $"Khởi tạo bảng tính KPI cho đơn vị '{deptName}' kỳ '{periodName}'.",
            CreatedAt = DateTime.Now
        });

        _context.KpiAssessments.Add(assessment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAssessment), new { id = assessment.Id }, new { id = assessment.Id, message = "Khởi tạo bảng tính KPI thành công!" });
    }

    // PUT /api/kpi/assessments/{id} (Cập nhật số liệu G/H/I và N/O)
    [HttpPut("assessments/{id}")]
    public async Task<IActionResult> UpdateAssessment(int id, [FromBody] UpdateAssessmentRequest req)
    {
        var assessment = await _context.KpiAssessments
            .Include(a => a.Lines)
            .Include(a => a.Audits)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (assessment == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ đánh giá KPI." });

        var role = GetCurrentUserRole();
        if (assessment.Status == "Approved" && role != "Admin")
        {
            return Forbid();
        }

        var userName = GetCurrentUserName();
        var ip = GetClientIp();

        // Cập nhật từng dòng: Server TỰ ĐỘNG TÍNH LẠI J, K, L, M từ công thức gốc
        // Tuyệt đối không nhận J, K, L, M từ phía client gửi lên!
        if (req.Lines != null && req.Lines.Any())
        {
            var lineMap = assessment.Lines.ToDictionary(l => l.KpiCode);

            foreach (var inputLine in req.Lines)
            {
                if (lineMap.TryGetValue(inputLine.KpiCode, out var line))
                {
                    // Phân biệt rõ input null với 0
                    line.Numerator = inputLine.Numerator;
                    line.Denominator = inputLine.Denominator;
                    line.ActualValue = inputLine.ActualValue;
                    line.Notes = inputLine.Notes;
                    line.ExceptionNotes = inputLine.ExceptionNotes;
                    line.UpdatedBy = userName;
                    line.UpdatedAt = DateTime.Now;

                    // Tính lại J, K, L, M chuẩn xác phía Server
                    var calc = KpiEngine.CalculateLine(
                        line.KpiCode, line.Unit, line.EvaluationDirection, line.Weight,
                        line.ThresholdExcellent, line.ThresholdGood, line.ThresholdAverage,
                        line.Numerator, line.Denominator, line.ActualValue);

                    line.CalculatedResult = calc.CalculatedResult;
                    line.RatingLevel = calc.RatingLevel;
                    line.Score = calc.Score;
                    line.ConvertedScore = calc.ConvertedScore;
                }
            }
        }

        // Cập nhật điều kiện chặn nếu người dùng có gửi lên
        if (req.HasSevereIncidents.HasValue)
            assessment.HasSevereIncidents = req.HasSevereIncidents.Value;
        if (req.HasOverdueDevicesUsed.HasValue)
            assessment.HasOverdueDevicesUsed = req.HasOverdueDevicesUsed.Value;
        if (req.HasLegalViolations.HasValue)
            assessment.HasLegalViolations = req.HasLegalViolations.Value;

        // Tính lại tổng điểm nhóm và điểm tổng thể
        var summary = KpiEngine.CalculateAssessmentSummary(assessment.Lines);
        assessment.ScoreGroupA = summary.ScoreGroupA;
        assessment.ScoreGroupB = summary.ScoreGroupB;
        assessment.ScoreGroupC = summary.ScoreGroupC;
        assessment.ScoreGroupD = summary.ScoreGroupD;
        assessment.TotalScore = summary.TotalScore;
        assessment.ScoreRating = summary.ScoreRating;
        assessment.HasFailKpi = summary.HasFailKpi;

        // Điều kiện chặn: nếu có cờ C6 hoặc cờ thiết bị quá hạn/vi phạm
        if (assessment.HasOverdueDevicesUsed || assessment.HasLegalViolations || assessment.HasSevereIncidents)
        {
            var notes = new List<string>();
            if (summary.HasFailKpi) notes.Add("Có KPI không đạt");
            if (assessment.HasSevereIncidents) notes.Add("Sự cố nghiêm trọng lỗi quản lý");
            if (assessment.HasOverdueDevicesUsed) notes.Add("Sử dụng thiết bị quá hạn KĐ/HC");
            if (assessment.HasLegalViolations) notes.Add("Vi phạm quy định bệnh viện");
            assessment.BlockingNote = string.Join("; ", notes) + " – cần xem xét";
        }
        else
        {
            assessment.BlockingNote = summary.BlockingNote;
        }

        // Kết luận cuối cùng:
        if (assessment.TotalScore < 70m)
        {
            assessment.FinalRating = "Không đạt";
        }
        else if (!string.IsNullOrEmpty(assessment.BlockingNote) && string.IsNullOrEmpty(assessment.DecidedBy))
        {
            assessment.FinalRating = "Chờ xem xét";
        }
        else if (string.IsNullOrEmpty(assessment.DecidedBy))
        {
            assessment.FinalRating = summary.ScoreRating;
        }

        assessment.UpdatedAt = DateTime.Now;

        assessment.Audits.Add(new KpiAudit
        {
            Action = "UPDATE",
            PerformedBy = userName,
            IpAddress = ip,
            Details = $"Cập nhật số liệu bảng tính. Tổng điểm: {assessment.TotalScore:F2}, Xếp loại: {assessment.ScoreRating}.",
            CreatedAt = DateTime.Now
        });

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Lưu số liệu KPI thành công!",
            assessment.Id,
            assessment.TotalScore,
            assessment.ScoreRating,
            assessment.ScoreGroupA,
            assessment.ScoreGroupB,
            assessment.ScoreGroupC,
            assessment.ScoreGroupD,
            assessment.BlockingNote,
            assessment.FinalRating
        });
    }

    // POST /api/kpi/assessments/{id}/status (Gửi duyệt, Duyệt, Mở lại)
    [HttpPost("assessments/{id}/status")]
    public async Task<IActionResult> ChangeStatus(int id, [FromBody] ChangeStatusRequest req)
    {
        var assessment = await _context.KpiAssessments
            .Include(a => a.Audits)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (assessment == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ đánh giá KPI." });

        var role = GetCurrentUserRole();
        var userName = GetCurrentUserName();
        var userId = GetCurrentUserId();
        var ip = GetClientIp();

        if (req.Status == "Approved" && role == "Staff")
        {
            return Forbid();
        }

        if (req.Status == "Draft" && role != "Admin") // Mở lại hồ sơ đã duyệt chỉ Admin
        {
            return Forbid();
        }

        var oldStatus = assessment.Status;
        assessment.Status = req.Status;
        assessment.UpdatedAt = DateTime.Now;

        if (req.Status == "Approved")
        {
            assessment.ApprovedByUserId = userId;
            assessment.ApprovedByUserName = userName;
        }

        assessment.Audits.Add(new KpiAudit
        {
            Action = req.Status.ToUpperInvariant(),
            PerformedBy = userName,
            IpAddress = ip,
            Details = $"Đổi trạng thái hồ sơ từ '{oldStatus}' sang '{req.Status}'. Lý do / Ghi chú: {req.Reason ?? "Không có"}",
            CreatedAt = DateTime.Now
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Đã cập nhật trạng thái hồ sơ sang '{req.Status}'.", assessment.Status });
    }

    // POST /api/kpi/assessments/{id}/decision (Kết luận quản trị / Điều kiện chặn)
    [HttpPost("assessments/{id}/decision")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> ManagementDecision(int id, [FromBody] ManagementDecisionRequest req)
    {
        var assessment = await _context.KpiAssessments
            .Include(a => a.Audits)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (assessment == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ đánh giá KPI." });

        var userName = GetCurrentUserName();
        var ip = GetClientIp();

        assessment.FinalRating = req.FinalRating ?? assessment.FinalRating;
        assessment.FinalConclusionNotes = req.FinalConclusionNotes;
        assessment.DecisionReference = req.DecisionReference;
        assessment.DecidedBy = userName;
        assessment.DecisionDate = DateTime.Now;
        assessment.UpdatedAt = DateTime.Now;

        if (req.HasSevereIncidents.HasValue) assessment.HasSevereIncidents = req.HasSevereIncidents.Value;
        if (req.HasOverdueDevicesUsed.HasValue) assessment.HasOverdueDevicesUsed = req.HasOverdueDevicesUsed.Value;
        if (req.HasLegalViolations.HasValue) assessment.HasLegalViolations = req.HasLegalViolations.Value;

        assessment.Audits.Add(new KpiAudit
        {
            Action = "DECISION",
            PerformedBy = userName,
            IpAddress = ip,
            Details = $"Ghi nhận Kết luận quản trị: Xếp loại cuối '{assessment.FinalRating}', Căn cứ: '{req.DecisionReference}', Ghi chú: '{req.FinalConclusionNotes}'.",
            CreatedAt = DateTime.Now
        });

        await _context.SaveChangesAsync();
        return Ok(new
        {
            message = "Đã lưu kết luận quản trị thành công!",
            assessment.FinalRating,
            assessment.FinalConclusionNotes,
            assessment.DecidedBy,
            assessment.DecisionDate
        });
    }

    // DELETE /api/kpi/assessments/{id}
    [HttpDelete("assessments/{id}")]
    public async Task<IActionResult> DeleteAssessment(int id)
    {
        var assessment = await _context.KpiAssessments.FindAsync(id);
        if (assessment == null) return NotFound();

        var role = GetCurrentUserRole();
        var userId = GetCurrentUserId();

        if (assessment.Status == "Approved" && role != "Admin")
            return Forbid();

        if (role == "Staff" && assessment.CreatedByUserId != userId)
            return Forbid();

        _context.KpiAssessments.Remove(assessment);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã xóa hồ sơ đánh giá KPI." });
    }
}

// ─── DTOs ───────────────────────────────────────────────────────────────────

public record UpdateDefinitionRequest(
    string? Name,
    decimal? Weight,
    decimal? ThresholdExcellent,
    decimal? ThresholdGood,
    decimal? ThresholdAverage,
    string? CriteriaNote,
    string? EvaluationDirection
);

public record CreateAssessmentRequest(
    int? DepartmentId,
    string? DepartmentName,
    string? PeriodType,
    int PeriodYear,
    int? PeriodQuarter,
    int? PeriodMonth,
    string? PeriodName,
    DateTime? StartDate,
    DateTime? EndDate,
    int ConfigVersion = 1
);

public record UpdateAssessmentLineInput(
    string KpiCode,
    decimal? Numerator,
    decimal? Denominator,
    decimal? ActualValue,
    string? Notes,
    string? ExceptionNotes
);

public record UpdateAssessmentRequest(
    List<UpdateAssessmentLineInput> Lines,
    bool? HasSevereIncidents,
    bool? HasOverdueDevicesUsed,
    bool? HasLegalViolations
);

public record ChangeStatusRequest(
    string Status,
    string? Reason
);

public record ManagementDecisionRequest(
    string? FinalRating,
    string? FinalConclusionNotes,
    string? DecisionReference,
    bool? HasSevereIncidents,
    bool? HasOverdueDevicesUsed,
    bool? HasLegalViolations
);
