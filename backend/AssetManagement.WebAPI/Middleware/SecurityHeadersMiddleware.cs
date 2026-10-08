namespace AssetManagement.WebAPI.Middleware;

public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // 1. Chống MIME-Type Sniffing
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");

        // 2. Chống Clickjacking (chỉ cho phép hiển thị iframe từ chính trang này)
        context.Response.Headers.Append("X-Frame-Options", "SAMEORIGIN");

        // 3. Bật bộ lọc XSS của trình duyệt
        context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");

        // 4. Giới hạn thông tin Referrer khi chuyển hướng
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");

        // 5. Khóa các quyền phần cứng không cần thiết (camera, mic, geolocation)
        context.Response.Headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

        // 6. Xóa các header lộ thông tin server
        context.Response.Headers.Remove("Server");
        context.Response.Headers.Remove("X-Powered-By");

        await _next(context);
    }
}

public static class SecurityHeadersMiddlewareExtensions
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<SecurityHeadersMiddleware>();
    }
}
