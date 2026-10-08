@echo off
chcp 65001 >nul
title KIỂM TRA KẾT NỐI MÁY CHỦ MỚI: 192.170.182.16 (BV QUÂN Y 87)
color 0B

echo.
echo ======================================================================
echo   BỆNH VIỆN QUÂN Y 87 - PHÒNG TRANG BỊ KỸ THUẬT ^& CNTT
echo   KIỂM TRA THÔNG TUYẾN MÁY TRẠM ĐẾN MÁY CHỦ MỚI: 192.170.182.16
echo ======================================================================
echo.

set SERVER_IP=192.170.182.16
set SERVER_PORT=5000
set SERVER_URL=http://%SERVER_IP%:%SERVER_PORT%

echo [1/3] Đang ping kiểm tra kết nối mạng LAN đến máy chủ: %SERVER_IP% ...
ping -n 2 %SERVER_IP% >nul
if %errorlevel% equ 0 (
    echo       [OK] Kết nối mạng LAN đến %SERVER_IP% THÔNG SUỐT!
) else (
    echo       [CANH BAO] Không thể ping đến máy chủ %SERVER_IP%.
    echo       Vui lòng kiểm tra dây mạng LAN hoặc xem máy chủ mới đã bật chưa.
)

echo.
echo [2/3] Đang kiểm tra dịch vụ Quản lý Trang bị (Cổng %SERVER_PORT%) ...
powershell -Command "try { $r = Invoke-WebRequest -Uri '%SERVER_URL%/api/system/server-config' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    echo       [OK] Dịch vụ phần mềm đang hoạt động tốt trên cổng %SERVER_PORT%!
) else (
    echo       [!] Chưa kết nối được cổng %SERVER_PORT%. Vui lòng kiểm tra tường lửa hoặc bật KHOI_DONG_HE_THONG.bat trên máy chủ mới.
)

echo.
echo [3/3] Đang mở phần mềm trên trình duyệt máy trạm...
start %SERVER_URL%

echo.
echo ======================================================================
echo   ĐỊA CHỈ TRUY CẬP MỚI: %SERVER_URL%
echo ======================================================================
echo.
pause
