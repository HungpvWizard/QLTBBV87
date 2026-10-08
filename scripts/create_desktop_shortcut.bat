@echo off
chcp 65001 >nul
echo Dang tao phim tat 1-Click ngoai man hinh Desktop...

powershell -NoProfile -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\QuanLyTrangBi_1Click.lnk'); $Shortcut.TargetPath = 'E:\DeployPackage_AssetManagement\KHOI_DONG_HE_THONG.bat'; $Shortcut.WorkingDirectory = 'E:\DeployPackage_AssetManagement'; $Shortcut.Description = 'Khoi dong He thong Quan ly Trang bi BV Quan y 87 (1-Click)'; $Shortcut.Save()"

echo [OK] Da tao thanh cong bieu tuong "QuanLyTrangBi_1Click" ngoai man hinh Desktop cua ban!
pause
