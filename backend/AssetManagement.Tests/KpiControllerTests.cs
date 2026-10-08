using AssetManagement.Application.Services;
using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using AssetManagement.WebAPI.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Xunit;

using Microsoft.Data.Sqlite;

namespace AssetManagement.Tests;

public class KpiControllerTests : IDisposable
{
    private readonly SqliteConnection _connection;

    public KpiControllerTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    public void Dispose()
    {
        _connection.Dispose();
    }

    private ApplicationDbContext GetDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;

        var context = new ApplicationDbContext(options);
        context.Database.EnsureCreated();

        // Seed 26 standard KPI definitions if not yet seeded
        if (!context.KpiDefinitions.Any())
        {
            var defs = KpiEngine.GetStandardDefinitions(1);
            context.KpiDefinitions.AddRange(defs);
        }

        // Seed test department
        if (!context.Departments.Any())
        {
            context.Departments.Add(new Department { Id = 1, Name = "Kho Trang bị" });
        }
        context.SaveChanges();

        return context;
    }

    private KpiController CreateController(ApplicationDbContext context, string username = "admin", string role = "Admin", int userId = 1)
    {
        var controller = new KpiController(context);
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, username),
            new Claim(ClaimTypes.Role, role),
            new Claim("fullName", "Quản trị viên")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        return controller;
    }

    [Fact]
    public async Task CreateAssessment_ShouldInitialize26Lines_WithTotalScore4()
    {
        using var context = GetDbContext();
        var controller = CreateController(context);

        var req = new CreateAssessmentRequest(
            DepartmentId: 1,
            DepartmentName: "Kho Trang bị",
            PeriodType: "Tháng",
            PeriodYear: 2026,
            PeriodQuarter: null,
            PeriodMonth: 10,
            PeriodName: "Tháng 10/2026",
            StartDate: null,
            EndDate: null,
            ConfigVersion: 1
        );

        var result = await controller.CreateAssessment(req);
        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.NotNull(created.Value);

        // Lấy chi tiết hồ sơ vừa tạo
        var getResult = await controller.GetAssessment(1);
        var okResult = Assert.IsType<OkObjectResult>(getResult);
        var jsonOptions = new System.Text.Json.JsonSerializerOptions 
        { 
            ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles 
        };
        var json = System.Text.Json.JsonSerializer.Serialize(okResult.Value, jsonOptions);
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var root = doc.RootElement;

        var lines = root.GetProperty("Lines").EnumerateArray().ToList();
        Assert.Equal(26, lines.Count);
        Assert.Equal(2.0m, root.GetProperty("ScoreGroupA").GetDecimal());
        Assert.Equal(0m, root.GetProperty("ScoreGroupB").GetDecimal());
        Assert.Equal(2.0m, root.GetProperty("ScoreGroupC").GetDecimal());
        Assert.Equal(0m, root.GetProperty("ScoreGroupD").GetDecimal());
        Assert.Equal(4.0m, root.GetProperty("TotalScore").GetDecimal());
        Assert.Equal("Không đạt", root.GetProperty("ScoreRating").GetString());
        Assert.True(root.GetProperty("HasFailKpi").GetBoolean());
        Assert.Equal("Có KPI không đạt – cần xem xét", root.GetProperty("BlockingNote").GetString());
        Assert.Equal("Không đạt", root.GetProperty("FinalRating").GetString());
    }

    [Fact]
    public async Task UpdateAssessment_ShouldRecalculateOnServer_AndRejectClientForgedScores()
    {
        using var context = GetDbContext();
        var controller = CreateController(context);

        var createReq = new CreateAssessmentRequest(
            DepartmentId: 1,
            DepartmentName: "Kho Trang bị",
            PeriodType: "Tháng",
            PeriodYear: 2026,
            PeriodQuarter: null,
            PeriodMonth: 10,
            PeriodName: "Tháng 10/2026",
            StartDate: null,
            EndDate: null,
            ConfigVersion: 1
        );
        await controller.CreateAssessment(createReq);

        // Cập nhật A1 (99/100 -> Xuất sắc, M=7.0), D1 (95 -> Xuất sắc, M=3.0)
        var updateReq = new UpdateAssessmentRequest(
            Lines: new List<UpdateAssessmentLineInput>
            {
                new("A1", 99m, 100m, null, "Đạt 99%", null),
                new("D1", null, null, 95m, "Chấm 95 điểm", null)
            },
            HasSevereIncidents: false,
            HasOverdueDevicesUsed: false,
            HasLegalViolations: false
        );

        var updateResult = await controller.UpdateAssessment(1, updateReq);
        Assert.IsType<OkObjectResult>(updateResult);

        var getResult = await controller.GetAssessment(1);
        var okResult = Assert.IsType<OkObjectResult>(getResult);
        var jsonOptions = new System.Text.Json.JsonSerializerOptions 
        { 
            ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles 
        };
        var json = System.Text.Json.JsonSerializer.Serialize(okResult.Value, jsonOptions);
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var root = doc.RootElement;

        var lines = root.GetProperty("Lines").EnumerateArray().ToList();
        var a1 = lines.First(l => l.GetProperty("KpiCode").GetString() == "A1");
        Assert.Equal(99m, a1.GetProperty("CalculatedResult").GetDecimal());
        Assert.Equal("Xuất sắc", a1.GetProperty("RatingLevel").GetString());
        Assert.Equal(100m, a1.GetProperty("Score").GetDecimal());
        Assert.Equal(7.0m, a1.GetProperty("ConvertedScore").GetDecimal());

        var d1 = lines.First(l => l.GetProperty("KpiCode").GetString() == "D1");
        Assert.Equal(95m, d1.GetProperty("CalculatedResult").GetDecimal());
        Assert.Equal("Xuất sắc", d1.GetProperty("RatingLevel").GetString());
        Assert.Equal(100m, d1.GetProperty("Score").GetDecimal());
        Assert.Equal(3.0m, d1.GetProperty("ConvertedScore").GetDecimal());

        // A=9 (A1=7 + A7=2), B=0, C=2 (C6=2), D=3 (D1=3) => Total = 14.0
        Assert.Equal(9.0m, root.GetProperty("ScoreGroupA").GetDecimal());
        Assert.Equal(0m, root.GetProperty("ScoreGroupB").GetDecimal());
        Assert.Equal(2.0m, root.GetProperty("ScoreGroupC").GetDecimal());
        Assert.Equal(3.0m, root.GetProperty("ScoreGroupD").GetDecimal());
        Assert.Equal(14.0m, root.GetProperty("TotalScore").GetDecimal());
    }

    [Fact]
    public async Task ManagementDecision_ShouldRecordDecisionAndNotes()
    {
        using var context = GetDbContext();
        var controller = CreateController(context);

        var createReq = new CreateAssessmentRequest(
            DepartmentId: 1,
            DepartmentName: "Kho Trang bị",
            PeriodType: "Tháng",
            PeriodYear: 2026,
            PeriodQuarter: null,
            PeriodMonth: 10,
            PeriodName: "Tháng 10/2026",
            StartDate: null,
            EndDate: null,
            ConfigVersion: 1
        );
        await controller.CreateAssessment(createReq);

        var decisionReq = new ManagementDecisionRequest(
            FinalRating: "Trung bình",
            FinalConclusionNotes: "Châm chước do thời gian đầu triển khai",
            DecisionReference: "Thông báo kết luận số 45/TB-BV",
            HasSevereIncidents: false,
            HasOverdueDevicesUsed: false,
            HasLegalViolations: false
        );

        var result = await controller.ManagementDecision(1, decisionReq);
        Assert.IsType<OkObjectResult>(result);

        var assessment = await context.KpiAssessments.Include(a => a.Audits).FirstAsync(a => a.Id == 1);
        Assert.Equal("Trung bình", assessment.FinalRating);
        Assert.Equal("Châm chước do thời gian đầu triển khai", assessment.FinalConclusionNotes);
        Assert.Equal("Thông báo kết luận số 45/TB-BV", assessment.DecisionReference);
        Assert.Contains(assessment.Audits, au => au.Action == "DECISION");
    }
}
