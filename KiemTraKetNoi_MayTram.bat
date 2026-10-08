@echo off
chcp 65001 >nul
title KIỂM TRA KẾT NỐI MÁY CHỦ BỆNH VIỆN QUÂN Y 87 (MÁY TRẠM LAN)
color 0A

echo.
echo ======================================================================
echo   BỆNH VIỆN QUÂN Y 87 - PHÒNG TRANG BỊ KỸ THUẬT ^& CNTT
echo   CÔNG CỤ KIỂM TRA KẾT NỐI MÁY TRẠM LAN ĐẾN MÁY CHỦ
echo ======================================================================
echo.

set SERVER_IP=192.170.182.197
set SERVER_PORT=5000
set SERVER_URL=http://%SERVER_IP%:%SERVER_PORT%

echo [1/3] Đang kiểm tra địa chỉ IP máy chủ: %SERVER_IP% ...
ping -n 2 %SERVER_IP% >nul
if %errorlevel% equ 0 (
    echo       [OK] Kết nối mạng LAN đến máy chủ %SERVER_IP% THÀNH CÔNG!
) else (
    echo       [CANH BAO] Không thể ping đến máy chủ %SERVER_IP%.
    echo       Vui lòng kiểm tra dây mạng LAN hoặc dải IP máy trạm (cùng dải 192.170.182.x).
)

echo.
echo [2/3] Đang kiểm tra dịch vụ Quản lý Trang bị (Cổng %SERVER_PORT%) ...
powershell -Command "try { $r = Invoke-WebRequest -Uri '%SERVER_URL%/api/system/server-config' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    echo       [OK] Dịch vụ phần mềm đang hoạt động tốt trên cổng %SERVER_PORT%!
) else (
    echo       [!] Chưa kết nối được cổng %SERVER_PORT%. Vui lòng kiểm tra máy chủ đã bật KHOI_DONG_HE_THONG.bat chưa.
)

echo.
echo [3/3] Đang mở phần mềm trên trình duyệt máy trạm...
start %SERVER_URL%

echo.
echo ======================================================================
echo   ĐỊA CHỈ TRUY CẬP TRỰC TIẾP: %SERVER_URL%
echo ======================================================================
echo.
pause
