using System.Text.RegularExpressions;
using AssetManagement.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Infrastructure.Data;

public static class DbDataSeeder
{
    public static void SeedSqlServerIfEmpty(ApplicationDbContext dbContext, string contentRootPath)
    {
        try
        {
            // Kiểm tra xem đã có dữ liệu Tài sản hoặc Thiết bị chưa
            if (dbContext.Assets.Any() || dbContext.Equipments.Any())
            {
                Console.WriteLine("[DbDataSeeder] Cơ sở dữ liệu SQL Server đã có sẵn dữ liệu. Không cần nạp lại.");
                return;
            }

            Console.WriteLine("[DbDataSeeder] Phát hiện CSDL SQL Server trống. Đang tự động nạp dữ liệu ban đầu...");

            // Tìm file import_to_sqlserver.sql ở các vị trí có thể có
            var candidates = new List<string>
            {
                Path.Combine(contentRootPath, "backups", "import_to_sqlserver.sql"),
                Path.Combine(AppContext.BaseDirectory, "backups", "import_to_sqlserver.sql"),
                Path.Combine(contentRootPath, "..", "backups", "import_to_sqlserver.sql"),
                Path.Combine(contentRootPath, "..", "..", "backups", "import_to_sqlserver.sql"),
                "/app/backups/import_to_sqlserver.sql",
                "backups/import_to_sqlserver.sql"
            };

            string? sqlFilePath = candidates.FirstOrDefault(File.Exists);

            if (sqlFilePath == null)
            {
                Console.WriteLine("[DbDataSeeder] Không tìm thấy file import_to_sqlserver.sql để nạp tự động.");
                return;
            }

            Console.WriteLine($"[DbDataSeeder] Tìm thấy file dữ liệu tại: {sqlFilePath}. Bắt đầu nạp vào SQL Server...");
            var sqlText = File.ReadAllText(sqlFilePath);

            // Tách các lô lệnh theo từ khóa GO
            var batches = Regex.Split(sqlText, @"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase);

            var connection = (SqlConnection)dbContext.Database.GetDbConnection();
            bool wasClosed = connection.State != System.Data.ConnectionState.Open;
            if (wasClosed)
            {
                connection.Open();
            }

            int executedBatches = 0;
            foreach (var batch in batches)
            {
                var cleanBatch = batch.Trim();
                if (string.IsNullOrWhiteSpace(cleanBatch)) continue;
                if (cleanBatch.StartsWith("USE [", StringComparison.OrdinalIgnoreCase)) continue;

                using var cmd = connection.CreateCommand();
                cmd.CommandText = cleanBatch;
                cmd.CommandTimeout = 300; // 5 phút cho các bảng lớn
                cmd.ExecuteNonQuery();
                executedBatches++;
            }

            if (wasClosed)
            {
                connection.Close();
            }

            var assetCount = dbContext.Assets.Count();
            var equipCount = dbContext.Equipments.Count();
            var depCount = dbContext.Departments.Count();
            Console.WriteLine($"[DbDataSeeder] NẠP DỮ LIỆU SQL SERVER THÀNH CÔNG! Đã thực thi {executedBatches} lô lệnh.");
            Console.WriteLine($"[DbDataSeeder] Thống kê: {assetCount} Tài sản, {equipCount} Thiết bị y tế, {depCount} Khoa phòng.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DbDataSeeder LỖI] {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[DbDataSeeder Chi tiết] {ex.InnerException.Message}");
            }
        }
    }
}
