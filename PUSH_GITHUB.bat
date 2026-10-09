@echo off
chcp 65001 >nul
title ĐẨY MÃ NGUỒN LÊN GITHUB - BV QUÂN Y 87
color 0A

echo ======================================================================
echo   ĐẨY DỰ ÁN LÊN GITHUB: https://github.com/HungpvWizard/QLTBBV87.git
echo ======================================================================
echo.

cd /d "%~dp0"

echo Đang thực hiện git push lên nhánh main...
git branch -M main
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ======================================================================
    echo   [THÀNH CÔNG] ĐÃ ĐẨY TOÀN BỘ MÃ NGUỒN LÊN GITHUB THÀNH CÔNG!
    echo   Địa chỉ Repository: https://github.com/HungpvWizard/QLTBBV87
    echo ======================================================================
) else (
    echo.
    echo [!] Nếu gặp thông báo yêu cầu xác thực, vui lòng đăng nhập tài khoản
    echo     GitHub trên trình duyệt hoặc sử dụng Personal Access Token (PAT).
)

echo.
pause
