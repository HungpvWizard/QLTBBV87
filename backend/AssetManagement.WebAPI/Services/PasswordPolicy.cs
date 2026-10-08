using System.Text.RegularExpressions;

namespace AssetManagement.WebAPI.Services;

public static class PasswordPolicy
{
    private static readonly HashSet<string> WeakPasswords = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin123",
        "12345678",
        "123456789",
        "password",
        "password123",
        "123456",
        "qwertyuiop",
        "bvqy87",
        "bvqy87123"
    };

    public static (bool IsValid, string? ErrorMessage) Validate(string? password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return (false, "Mật khẩu không được để trống.");
        }

        if (password.Length < 8)
        {
            return (false, "Mật khẩu phải có độ dài tối thiểu 8 ký tự.");
        }

        if (WeakPasswords.Contains(password.Trim()))
        {
            return (false, "Mật khẩu này quá đơn giản hoặc phổ biến. Vui lòng chọn mật khẩu an toàn hơn.");
        }

        // Kiểm tra ít nhất 1 chữ cái và ít nhất 1 chữ số
        bool hasLetter = Regex.IsMatch(password, @"[A-Za-z]");
        bool hasDigit = Regex.IsMatch(password, @"\d");

        if (!hasLetter || !hasDigit)
        {
            return (false, "Mật khẩu phải bao gồm cả chữ cái và chữ số.");
        }

        return (true, null);
    }

    public static bool IsDefaultPassword(string passwordHash)
    {
        if (string.IsNullOrEmpty(passwordHash)) return false;
        try
        {
            return BCrypt.Net.BCrypt.Verify("admin123", passwordHash);
        }
        catch
        {
            return false;
        }
    }
}
