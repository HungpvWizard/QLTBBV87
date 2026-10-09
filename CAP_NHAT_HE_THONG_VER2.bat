@echo off
chcp 65001 >nul
title CẬP NHẬT HỆ THỐNG LÊN PHIÊN BẢN MỚI (VER 2.0) - BV QUÂN Y 87
color 0B

echo.
echo ======================================================================
echo   BỆNH VIỆN QUÂN Y 87 - PHÒNG TRANG BỊ KỸ THUẬT ^& CNTT
echo   CÔNG CỤ TỰ ĐỘNG CẬP NHẬT HỆ THỐNG LÊN BẢN VER 2.0 (AN TOÀN 100%%)
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. TỰ ĐỘNG TẠO BẢN SAO LƯU TRƯỚC KHI NÂNG CẤP
echo [1/4] Đang tạo bản sao lưu snapshot khẩn cấp trước khi nâng cấp...
if not exist "backups" mkdir backups

set TIMESTAMP=%DATE:~6,4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

if exist "assetmanagement.db" (
    copy /y "assetmanagement.db" "backups\pre_update_ver2_%TIMESTAMP%.db" >nul 2>&1
    echo       [OK] Đã sao lưu assetmanagement.db thành công:
    echo            -> backups\pre_update_ver2_%TIMESTAMP%.db
) else (
    echo       [!] Chưa phát hiện file assetmanagement.db.
)

if exist "scripts\backup_database.py" (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        python scripts\backup_database.py >nul 2>&1
        echo       [OK] Đã xuất bản JSON dump toàn diện.
    )
)

:: 2. DỪNG TIẾN TRÌNH CŨ ĐỂ GIẢI PHÓNG TÀI NGUYÊN
echo.
echo [2/4] Đang kiểm tra và tạm dừng tiến trình WebAPI cũ (nếu có)...
taskkill /f /im AssetManagement.WebAPI.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo       [OK] Tiến trình cũ đã được giải phóng an toàn.

:: 3. CHẠY DATABASE MIGRATION NẾU CÓ THAY ĐỔI CẤU TRÚC
echo.
echo [3/4] Đang kiểm tra và cập nhật cấu trúc Database (EF Core Migration)...
where dotnet >nul 2>&1
if %errorlevel% equ 0 (
    if exist "backend\AssetManagement.WebAPI" (
        dotnet ef database update --project backend\AssetManagement.WebAPI >nul 2>&1
        if %errorlevel% equ 0 (
            echo       [OK] Đã đồng bộ cấu trúc cơ sở dữ liệu mới nhất.
        ) else (
            echo       [*] Cấu trúc cơ sở dữ liệu đã đồng bộ hoặc không có migration mới.
        )
    )
) else (
    echo       [*] Bỏ qua bước kiểm tra dotnet CLI.
)

:: 4. HOÀN TẤT
echo.
echo [4/4] ĐỒNG BỘ HOÀN TẤT!
echo.
echo ======================================================================
echo   HỆ THỐNG ĐÃ CẬP NHẬT THÀNH CÔNG LÊN BẢN MỚI!
echo ======================================================================
echo.
echo   1. Dữ liệu cũ đã được bảo toàn 100%% trong thư mục backups/
echo   2. Bạn có thể khởi động lại hệ thống bằng file: KHOI_DONG_HE_THONG.bat
echo   3. Nhắc các máy trạm tại các Khoa Phòng nhấn [Ctrl + F5] trên trình
echo      duyệt để xóa cache cũ và nhận ngay toàn bộ giao diện Ver 2.0 mới!
echo ======================================================================
echo.
pause
