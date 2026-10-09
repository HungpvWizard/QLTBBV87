@echo off
chcp 65001 >nul
title AssetFlow - Khoi dong May Chu Noi Bo

echo ================================================================
echo   ASSETFLOW - HE THONG QUAN LY TAI SAN
echo   Dang khoi dong may chu noi bo...
echo ================================================================
echo.

:: --- L?y IP n?i b? ---
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set RAW_IP=%%a
    goto :FOUND_IP
)
:FOUND_IP
:: X?a kho?ng tr?ng ??u
set SERVER_IP=%RAW_IP: =%

echo [1/3] IP may chu noi bo: %SERVER_IP%
echo.

:: --- Build Frontend ---
echo [2/3] Dang build giao dien (Frontend)...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [LOI] Build frontend that bai! Kiem tra lai loi o tren.
    pause
    exit /b 1
)
echo [OK] Build frontend thanh cong!
echo.

:: --- Ch?y Backend ---
echo [3/3] Dang khoi dong may chu (Backend)...
cd /d "%~dp0backend\AssetManagement.WebAPI"
echo.
echo ================================================================
echo   May chu da san sang!
echo.
echo   May chu truy cap tai:   http://localhost:5000
echo   May tram truy cap tai:  http://%SERVER_IP%:5000
echo.
echo   Chia se dia chi nay voi cac may tram:
echo   ^>^> http://%SERVER_IP%:5000 ^<^<
echo.
echo   Nhan Ctrl+C de dung may chu.
echo ================================================================
echo.

dotnet run --no-build --configuration Release
if %errorlevel% neq 0 (
    echo.
    echo Thu chay lai voi cau hinh Debug...
    dotnet run
)

pause
