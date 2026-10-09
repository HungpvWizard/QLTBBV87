@echo off
chcp 65001 >nul
echo =====================================================================
echo  HỆ THỐNG QUẢN LÝ TRANG BỊ & THIẾT BỊ Y TẾ (ASSETFLOW) - BV QUÂN Y 87
echo  KHỞI ĐỘNG HỆ THỐNG BẰNG DOCKER COMPOSE + MICROSOFT SQL SERVER 2022
echo =====================================================================
echo.
echo [1/3] Đang kiểm tra dịch vụ Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo [LỖI] Docker Desktop chưa được bật! Vui lòng khởi động Docker Desktop trước.
    pause
    exit /b 1
)

echo [2/3] Đang khởi động SQL Server 2022 và AssetFlow Container...
docker compose up -d --build

echo.
echo [3/3] Trạng thái các container đang chạy:
docker compose ps

echo.
echo =====================================================================
echo  HỆ THỐNG ĐÃ SẴN SÀNG!
echo  - Địa chỉ truy cập Web: http://localhost:5000 (hoặc IP LAN máy chủ:5000)
echo  - Máy chủ CSDL SQL Server: localhost:1433
echo  - Tài khoản SQL Server sa: AssetFlow@BVQY87#2026
echo =====================================================================
pause
