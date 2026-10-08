@echo off
chcp 65001 >nul
title HỆ THỐNG QUẢN LÝ TRANG BỊ & THIẾT BỊ Y TẾ - BỆNH VIỆN QUÂN Y 87
color 0B

echo.
echo  ======================================================================
echo    BỆNH VIỆN QUÂN Y 87 - PHÒNG TRANG BỊ KỸ THUẬT ^& CNTT
echo    HỆ THỐNG QUẢN LÝ TRANG BỊ ^& THIẾT BỊ Y TẾ (ASSETFLOW)
echo    KHỞI ĐỘNG 1-CLICK TỰ ĐỘNG: BACKEND + FRONTEND
echo  ======================================================================
echo.

cd /d "%~dp0"

:: 1. TỰ ĐỘNG SAO LƯU BẢO TOÀN DỮ LIỆU TRƯỚC KHI CHẠY
echo  [1/4] Đang kiểm tra và tự động sao lưu dữ liệu an toàn (Auto-Backup)...
if exist "scripts\backup_database.py" (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        python scripts\backup_database.py >nul 2>&1
        echo        [OK] Dữ liệu đã được tự động lưu trữ an toàn vào thư mục backups/
    ) else (
        echo        [!] Python chưa có trong PATH, đang sao lưu trực tiếp...
        if not exist "backups" mkdir backups
        copy /y "assetmanagement.db" "backups\auto_backup_on_launch.db" >nul 2>&1
        echo        [OK] Đã sao lưu assetmanagement.db sang backups/
    )
) else (
    if not exist "backups" mkdir backups
    copy /y "assetmanagement.db" "backups\auto_backup_on_launch.db" >nul 2>&1
)

:: 2. LẤY ĐỊA CHỈ IP MẠNG LAN CỦA MÁY CHỦ
set SERVER_IP=127.0.0.1
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set RAW_IP=%%a
    goto :FOUND_IP
)
:FOUND_IP
set SERVER_IP=%RAW_IP: =%

:: 3. KHỞI ĐỘNG BACKEND WEBAPI (.NET 8 - CỔNG 5000)
echo  [2/4] Đang kiểm tra và khởi động Backend WebAPI (.NET 8 - Cổng 5000)...
netstat -ano | findstr /r ":5000 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo        [OK] Backend WebAPI đang hoạt động sẵn sàng trên cổng 5000.
) else (
    echo        [*] Đang chạy tiến trình Backend WebAPI...
    if exist "AssetManagement.WebAPI.exe" (
        start "AssetFlow - Backend WebAPI (Port 5000)" /min cmd /c "cd /d \"%~dp0\" && AssetManagement.WebAPI.exe"
    ) else (
        start "AssetFlow - Backend WebAPI (Port 5000)" /min cmd /c "cd /d \"%~dp0backend\AssetManagement.WebAPI\" && dotnet run --configuration Release"
    )
    echo        [OK] Đã kích hoạt Backend WebAPI.
)

:: 4. KHỞI ĐỘNG FRONTEND (VITE DEV SERVER - CỔNG 5173)
echo  [3/4] Đang kiểm tra và khởi động Frontend (Vite - Cổng 5173)...
netstat -ano | findstr /r ":5173 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo        [OK] Frontend đang hoạt động sẵn sàng trên cổng 5173.
) else (
    echo        [*] Đang chạy tiến trình Frontend...
    start "AssetFlow - Frontend Vite (Port 5173)" /min cmd /c "cd /d \"%~dp0frontend\" && npm run dev"
    echo        [OK] Đã kích hoạt Frontend Vite Server.
)

:: 5. MỞ TRÌNH DUYỆT TỰ ĐỘNG
echo  [4/4] Đang mở trình duyệt web...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo  ======================================================================
echo    HỆ THỐNG ĐÃ SẴN SÀNG HOẠT ĐỘNG!
echo  ======================================================================
echo.
echo    - Máy chủ (Localhost):  http://localhost:5173  (hoặc http://localhost:5000)
echo    - Máy trạm nội bộ LAN:  http://%SERVER_IP%:5000
echo    - Tài liệu API Swagger: http://localhost:5000/swagger
echo    - Thư mục sao lưu:      %~dp0backups
echo.
echo    [LƯU Ý]: Giữ cửa sổ này hoặc thu nhỏ để hệ thống duy trì hoạt động.
echo    Nếu muốn dừng hệ thống, nhấn phím bất kỳ hoặc đóng cửa sổ này.
echo  ======================================================================
echo.
pause
