using AssetManagement.Domain.Entities;
using AssetManagement.Infrastructure.Data;
using AssetManagement.WebAPI.Middleware;
using AssetManagement.WebAPI.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

// ─── Tối ưu ThreadPool cho 100+ người dùng đồng thời ────────────────────────
// Ngăn chặn hiện tượng nghẽn luồng (Thread Starvation) khi có nhiều yêu cầu gửi tới cùng lúc
ThreadPool.SetMinThreads(100, 100);

var builder = WebApplication.CreateBuilder(args);

// Cấu hình Kestrel Server phục vụ kết nối đồng thời cao
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxConcurrentConnections = 1000;
    serverOptions.Limits.MaxConcurrentUpgradedConnections = 1000;
    serverOptions.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(2);
    serverOptions.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);
});

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ─── BẢO MẬT & KIỂM TOÁN (SECURITY SERVICES) ──────────────────────────────
builder.Services.AddSingleton<ILoginRateLimiter, LoginRateLimiter>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();

// Bật nén dữ liệu Response Compression (Brotli + Gzip) để giảm 70% băng thông tải qua mạng LAN
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

// Cho phép upload file backup lớn (tối đa 100MB)
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 100 * 1024 * 1024;
});

// ─── CƠ SỞ DỮ LIỆU: HỖ TRỢ LINH HOẠT CẢ MICROSOFT SQL SERVER & SQLITE ────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                       ?? "Data Source=assetmanagement.db";
var dbProvider = builder.Configuration.GetValue<string>("DatabaseProvider", "");

// Tự động nhận diện Microsoft SQL Server nếu chuỗi kết nối chứa Server= / Database= hoặc chỉ định rõ DatabaseProvider=SqlServer
bool isSqlServer = string.Equals(dbProvider, "SqlServer", StringComparison.OrdinalIgnoreCase) ||
                   connectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase) ||
                   connectionString.Contains("Initial Catalog=", StringComparison.OrdinalIgnoreCase) ||
                   connectionString.Contains("Database=", StringComparison.OrdinalIgnoreCase) ||
                   connectionString.Contains("User Id=", StringComparison.OrdinalIgnoreCase);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    if (isSqlServer)
    {
        options.UseSqlServer(connectionString, sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorNumbersToAdd: null);
        });
    }
    else
    {
        options.UseSqlite(connectionString);
    }
});

// ─── JWT Authentication ───────────────────────────────────────────────────
var jwtSection = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSection["SecretKey"]!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero,
        };
    });

builder.Services.AddAuthorization();

// CORS — cho phép mọi origin trong mạng LAN
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", b =>
        b.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

// Đăng ký Background Service tự động backup theo lịch
builder.Services.AddHostedService<BackupSchedulerService>();
builder.Services.AddSingleton<BackupSchedulerService>();

var app = builder.Build();

app.UseCors("AllowAll");

// ─── GẮN TIÊU ĐỀ BẢO MẬT (HTTP SECURITY HEADERS) CHUẨN OWASP ──────────────
app.UseSecurityHeaders();

// Bật nén phản hồi trước khi trả file tĩnh
app.UseResponseCompression();

// Serve file tĩnh từ wwwroot với chính sách Cache thông minh:
// - File tĩnh JS/CSS/Fonts/Images: Cache 1 năm trên trình duyệt người dùng (tải 1 lần dùng mãi mãi)
// - File index.html: Không cache để luôn cập nhật code mới ngay lập tức
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var path = ctx.Context.Request.Path.Value ?? "";
        if (path.StartsWith("/assets/") || path.EndsWith(".js") || path.EndsWith(".css") || 
            path.EndsWith(".png") || path.EndsWith(".jpg") || path.EndsWith(".svg") || path.EndsWith(".woff2"))
        {
            ctx.Context.Response.Headers.Append("Cache-Control", "public, max-age=31536000, immutable");
        }
        else if (path.EndsWith("index.html") || path == "/" || string.IsNullOrEmpty(path))
        {
            ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
        }
    }
});

// ─── BẢO VỆ TÀI LIỆU SWAGGER (Chỉ mở trong Development hoặc cấu hình bật rõ ràng) ───
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("EnableSwagger", false))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ─── Auth Middleware (thứ tự quan trọng) ─────────────────────────────────
app.UseAuthentication();
app.UseAuthorization();

// Khởi tạo cơ sở dữ liệu (tự động nhận diện Microsoft SQL Server hoặc SQLite)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    if (dbContext.Database.IsSqlServer())
    {
        // ─── KHỞI TẠO VÀ ĐỒNG BỘ TRÊN MICROSOFT SQL SERVER ───
        try
        {
            Console.WriteLine("[Database] Đang kết nối Microsoft SQL Server...");
            dbContext.Database.EnsureCreated();
            Console.WriteLine("[Database] Khởi tạo và kiểm tra bảng dữ liệu trên Microsoft SQL Server THÀNH CÔNG!");

            // Tự động nạp toàn bộ 362 thiết bị, 37 khoa phòng nếu database mới tạo và đang trống
            DbDataSeeder.SeedSqlServerIfEmpty(dbContext, app.Environment.ContentRootPath);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Lỗi khởi tạo Microsoft SQL Server] {ex.Message}");
        }
    }
    else if (dbContext.Database.IsSqlite())
    {
        // ─── KHỞI TẠO VÀ TỐI ƯU HÓA TRÊN SQLITE ───
        try
        {
            dbContext.Database.Migrate();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Lỗi Migration SQLite] {ex.Message}");
        }

    // ─── TỐI ƯU HÓA CƠ SỞ DỮ LIỆU SQLITE CHO 100+ NGƯỜI DÙNG ĐỒNG THỜI ───
    // 1. WAL (Write-Ahead Logging): Cho phép hàng trăm người cùng ĐỌC mà không bị khóa bởi người GHI
    // 2. busy_timeout = 5000ms: Khi có 2 thao tác ghi cùng lúc, tự động đợi tối đa 5s thay vì văng lỗi
    // 3. synchronous = NORMAL: Tăng tốc độ ghi dữ liệu gấp 3-5 lần
    // 4. cache_size = -20000: Dành ~20MB RAM để cache toàn bộ dữ liệu thường xuyên truy vấn
    // 5. temp_store = MEMORY: Chuyển toàn bộ sắp xếp và bảng tạm vào RAM
    // 1. Tự động tạo bảng SecurityAuditLogs nếu chưa có
    try
    {
        dbContext.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS SecurityAuditLogs (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Action TEXT NOT NULL,
                Username TEXT NOT NULL,
                IpAddress TEXT NULL,
                Details TEXT NULL,
                IsSuccess INTEGER NOT NULL DEFAULT 1,
                Timestamp TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS IX_SecurityAuditLogs_Timestamp ON SecurityAuditLogs(Timestamp);
            CREATE INDEX IF NOT EXISTS IX_SecurityAuditLogs_Action ON SecurityAuditLogs(Action);
            CREATE INDEX IF NOT EXISTS IX_SecurityAuditLogs_Username ON SecurityAuditLogs(Username);
        ");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Lỗi tạo SecurityAuditLogs] {ex.Message}");
    }

    // 1b. Tự động tạo bảng KPI nếu chưa có
    try
    {
        dbContext.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS KpiDefinitions (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Version INTEGER NOT NULL DEFAULT 1,
                Code TEXT NOT NULL,
                Name TEXT NOT NULL,
                ""Group"" TEXT NOT NULL,
                Weight REAL NOT NULL,
                Unit TEXT NOT NULL,
                EvaluationDirection TEXT NOT NULL,
                ThresholdExcellent REAL NULL,
                ThresholdGood REAL NULL,
                ThresholdAverage REAL NULL,
                OrderIndex INTEGER NOT NULL,
                CriteriaNote TEXT NULL,
                IsActive INTEGER NOT NULL DEFAULT 1,
                CreatedAt TEXT NOT NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS IX_KpiDefinitions_Version_Code ON KpiDefinitions(Version, Code);
            CREATE INDEX IF NOT EXISTS IX_KpiDefinitions_Group ON KpiDefinitions(""Group"");

            CREATE TABLE IF NOT EXISTS KpiAssessments (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                DepartmentId INTEGER NULL,
                DepartmentName TEXT NOT NULL,
                PeriodType TEXT NOT NULL,
                PeriodYear INTEGER NOT NULL,
                PeriodQuarter INTEGER NULL,
                PeriodMonth INTEGER NULL,
                PeriodName TEXT NOT NULL,
                StartDate TEXT NULL,
                EndDate TEXT NULL,
                ConfigVersion INTEGER NOT NULL DEFAULT 1,
                Status TEXT NOT NULL DEFAULT 'Draft',
                Revision INTEGER NOT NULL DEFAULT 1,
                CreatedByUserId INTEGER NULL,
                CreatedByUserName TEXT NULL,
                ApprovedByUserId INTEGER NULL,
                ApprovedByUserName TEXT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                ScoreGroupA REAL NOT NULL DEFAULT 0,
                ScoreGroupB REAL NOT NULL DEFAULT 0,
                ScoreGroupC REAL NOT NULL DEFAULT 0,
                ScoreGroupD REAL NOT NULL DEFAULT 0,
                TotalScore REAL NOT NULL DEFAULT 0,
                ScoreRating TEXT NOT NULL DEFAULT 'Không đạt',
                HasFailKpi INTEGER NOT NULL DEFAULT 0,
                HasSevereIncidents INTEGER NOT NULL DEFAULT 0,
                HasOverdueDevicesUsed INTEGER NOT NULL DEFAULT 0,
                HasLegalViolations INTEGER NOT NULL DEFAULT 0,
                BlockingNote TEXT NULL,
                FinalRating TEXT NULL,
                FinalConclusionNotes TEXT NULL,
                DecidedBy TEXT NULL,
                DecisionDate TEXT NULL,
                DecisionReference TEXT NULL,
                FOREIGN KEY (DepartmentId) REFERENCES Departments(Id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS IX_KpiAssessments_DepartmentId ON KpiAssessments(DepartmentId);
            CREATE INDEX IF NOT EXISTS IX_KpiAssessments_PeriodYear_PeriodMonth ON KpiAssessments(PeriodYear, PeriodMonth);
            CREATE INDEX IF NOT EXISTS IX_KpiAssessments_Status ON KpiAssessments(Status);

            CREATE TABLE IF NOT EXISTS KpiAssessmentLines (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                AssessmentId INTEGER NOT NULL,
                KpiCode TEXT NOT NULL,
                KpiName TEXT NOT NULL,
                ""Group"" TEXT NOT NULL,
                Weight REAL NOT NULL,
                Unit TEXT NOT NULL,
                EvaluationDirection TEXT NOT NULL,
                ThresholdExcellent REAL NULL,
                ThresholdGood REAL NULL,
                ThresholdAverage REAL NULL,
                Numerator REAL NULL,
                Denominator REAL NULL,
                ActualValue REAL NULL,
                CalculatedResult REAL NULL,
                RatingLevel TEXT NULL,
                Score REAL NULL,
                ConvertedScore REAL NULL,
                Notes TEXT NULL,
                ExceptionNotes TEXT NULL,
                UpdatedBy TEXT NULL,
                UpdatedAt TEXT NULL,
                FOREIGN KEY (AssessmentId) REFERENCES KpiAssessments(Id) ON DELETE CASCADE
            );
            CREATE UNIQUE INDEX IF NOT EXISTS IX_KpiAssessmentLines_AssessmentId_KpiCode ON KpiAssessmentLines(AssessmentId, KpiCode);
            CREATE INDEX IF NOT EXISTS IX_KpiAssessmentLines_AssessmentId ON KpiAssessmentLines(AssessmentId);

            CREATE TABLE IF NOT EXISTS KpiAudits (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                AssessmentId INTEGER NOT NULL,
                Action TEXT NOT NULL,
                PerformedBy TEXT NOT NULL,
                IpAddress TEXT NULL,
                Details TEXT NULL,
                CreatedAt TEXT NOT NULL,
                FOREIGN KEY (AssessmentId) REFERENCES KpiAssessments(Id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS IX_KpiAudits_AssessmentId ON KpiAudits(AssessmentId);
        ");

        // Seed 26 danh mục KPI v1 chuẩn nếu chưa có
        if (!dbContext.KpiDefinitions.Any(d => d.Version == 1))
        {
            var defs = AssetManagement.Application.Services.KpiEngine.GetStandardDefinitions(1);
            dbContext.KpiDefinitions.AddRange(defs);
            dbContext.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Lỗi khởi tạo KPI] {ex.Message}");
    }

    // 2. Tối ưu hóa SQLite và tạo Index
    try
    {
        dbContext.Database.ExecuteSqlRaw(@"
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA busy_timeout = 5000;
            PRAGMA cache_size = -20000;
            PRAGMA temp_store = MEMORY;
        ");

        dbContext.Database.ExecuteSqlRaw(@"
            CREATE INDEX IF NOT EXISTS IX_Assets_Serial ON Assets(Serial);
            CREATE INDEX IF NOT EXISTS IX_Assets_AssetTag ON Assets(AssetTag);
            CREATE INDEX IF NOT EXISTS IX_Assets_CategoryId ON Assets(CategoryId);
            CREATE INDEX IF NOT EXISTS IX_Assets_DepartmentId ON Assets(DepartmentId);
            CREATE INDEX IF NOT EXISTS IX_Assets_Status ON Assets(Status);
            CREATE INDEX IF NOT EXISTS IX_Categories_WarehouseId ON Categories(WarehouseId);
            CREATE INDEX IF NOT EXISTS IX_Users_DepartmentId ON Users(DepartmentId);
            CREATE INDEX IF NOT EXISTS IX_AssetTransfers_AssetId ON AssetTransfers(AssetId);
            CREATE INDEX IF NOT EXISTS IX_AssetTransfers_TransferDate ON AssetTransfers(TransferDate);
            CREATE INDEX IF NOT EXISTS IX_RepairRequests_DepartmentId ON RepairRequests(DepartmentId);
            CREATE INDEX IF NOT EXISTS IX_RepairRequests_Status ON RepairRequests(Status);
            CREATE INDEX IF NOT EXISTS IX_Equipments_CategoryId ON Equipments(CategoryId);
            CREATE INDEX IF NOT EXISTS IX_Equipments_Code ON Equipments(Code);
        ");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Cảnh báo tối ưu SQLite] {ex.Message}");
    }
}

    // Seed tài khoản admin mặc định nếu chưa có
    if (!dbContext.Users.Any())
    {
        dbContext.Users.Add(new User
        {
            Username = "admin",
            FullName = "Admin",
            Email = "admin@assetflow.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            RoleId = 1,     // Admin
            IsActive = true,
            CreatedAt = DateTime.Now,
        });
        dbContext.SaveChanges();
    }
}

app.MapControllers();

// SPA Fallback
app.MapFallbackToFile("index.html");

app.Run();
