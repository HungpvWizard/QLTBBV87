@echo off
chcp 65001 >nul
title MỞ CỔNG FIREWALL MẠNG LAN - BV QUÂN Y 87
color 0A

echo.
echo ======================================================================
echo   BỆNH VIỆN QUÂN Y 87 - PHÒNG TRANG BỊ KỸ THUẬT ^& CNTT
echo   TỰ ĐỘNG CẤU HÌNH TƯỜNG LỬA (WINDOWS FIREWALL) CHO MẠNG LAN
echo   CỔNG KẾT NỐI: 5000 (HTTP - KESTREL SERVER)
echo ======================================================================
echo.

:: Kiểm tra quyền Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] CẢNH BÁO: Bạn cần bấm chuột phải vào file này và chọn:
    echo     "Run as administrator" (Chạy với quyền Quản trị viên).
    echo.
    pause
    exit /b 1
)

echo [*] Đang thêm quy tắc tường lửa (Inbound Rule) cho Cổng 5000...
netsh advfirewall firewall delete rule name="AssetFlow_WebAPI_Port_5000" >nul 2>&1
netsh advfirewall firewall add rule name="AssetFlow_WebAPI_Port_5000" dir=in action=allow protocol=TCP localport=5000 description="Cho phép các máy trạm mạng LAN truy cập Hệ thống Quản lý Trang bị BV Quân y 87"

if %errorlevel% equ 0 (
    echo.
    echo [OK] ĐÃ MỞ CỔNG 5000 THÀNH CÔNG TRÊN WINDOWS FIREWALL!
    echo.
    echo ----------------------------------------------------------------------
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
        set SERVER_IP=%%a
        goto :SHOW_IP
    )
    :SHOW_IP
    set SERVER_IP=%SERVER_IP: =%
    echo    Địa chỉ truy cập cho các MÁY TRẠM trong mạng LAN:
    echo.
    echo    >>>   http://%SERVER_IP%:5000   <<<
    echo.
    echo ----------------------------------------------------------------------
    echo Bạn có thể dán địa chỉ trên vào trình duyệt Chrome/Edge của các máy
    echo tính tại các Khoa, Phòng để truy cập sử dụng ngay lập tức!
) else (
    echo.
    echo [!] Có lỗi xảy ra khi cấu hình tường lửa. Vui lòng kiểm tra quyền Administrator.
)

echo.
pause
