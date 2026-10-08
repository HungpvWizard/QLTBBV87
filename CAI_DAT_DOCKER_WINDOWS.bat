@echo off
chcp 65001 >nul
title CÀI ĐẶT DOCKER DESKTOP CHO WINDOWS 10 - BV QUÂN Y 87
color 0B

echo.
echo ======================================================================
echo   BỆNH VIỆN QUÂN Y 87 - PHÒNG TRANG BỊ KỸ THUẬT ^& CNTT
echo   TIỆN ÍCH HỖ TRỢ CÀI ĐẶT DOCKER DESKTOP TRÊN MÁY CHỦ WINDOWS 10
echo ======================================================================
echo.

:: Kiểm tra quyền Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [CẢNH BÁO] Vui lòng nhấp chuột phải vào file này và chọn:
    echo            "RUN AS ADMINISTRATOR" (CHẠY VỚI QUYỀN QUẢN TRỊ VIÊN)
    echo.
    pause
    exit /b 1
)

echo [1/3] Đang kiểm tra Chocolatey trên máy chủ...
where choco >nul 2>&1
if %errorlevel% equ 0 (
    echo       [OK] Đã tìm thấy Chocolatey. Đang tiến hành cài đặt Docker Desktop...
    choco install docker-desktop -y
    echo.
    echo       [OK] Quá trình cài đặt Docker Desktop qua Chocolatey đã hoàn tất.
) else (
    echo       [!] Chưa phát hiện Chocolatey. Đang mở trình duyệt tải trực tiếp Docker Desktop Installer...
    start https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
)

echo.
echo [2/3] Lưu ý cấu hình Windows:
echo       - Đảm bảo tính năng Hyper-V hoặc WSL 2 (Windows Subsystem for Linux) đã được bật.
echo       - Nếu máy yêu cầu Restart, vui lòng Khởi động lại máy tính để hoàn tất cài đặt.
echo.
echo [3/3] Sau khi cài đặt và khởi động Docker Desktop:
echo       Bạn có thể chạy ứng dụng bằng lệnh:
echo           docker compose up -d --build
echo.
echo ======================================================================
echo   HOÀN TẤT BƯỚC CÀI ĐẶT DOCKER DESKTOP!
echo ======================================================================
echo.
pause
