# 📘 HƯỚNG DẪN CHI TIẾT: CHUYỂN ĐỔI MÁY CHỦ, HỆ ĐIỀU HÀNH & TRIỂN KHAI DOCKER + SQL SERVER
> **HỆ THỐNG QUẢN LÝ TRANG BỊ & THIẾT BỊ Y TẾ - BỆNH VIỆN QUÂN Y 87**  
> *Tài liệu kỹ thuật dành cho Quản trị viên hệ thống & Kỹ sư CNTT*  
> *Ngày ban hành: Tháng 09/2026*

---

## 📑 MỤC LỤC
1. [Phần 1: Chuyển sang máy chủ mới (Windows Server / Windows 10/11)](#phan-1)
2. [Phần 2: Chuyển đổi sang Hệ điều hành Linux (Ubuntu Server / Debian)](#phan-2)
3. [Phần 3: Chuyển đổi Cơ sở dữ liệu từ SQLite sang Microsoft SQL Server](#phan-3)
4. [Phần 4: Đóng gói và Triển khai với Docker & Docker Compose](#phan-4)
5. [Phần 5: Checklist kiểm thử & Vận hành chính thức (Go-Live)](#phan-5)
6. [Phần 6: Quy trình Nâng cấp & Cập nhật Phiên bản mới (Ver 2.0) An Toàn trên Máy Chủ](#phan-6)

---

<a name="phan-1"></a>
## 🖥️ PHẦN 1: CHUYỂN SANG MÁY CHỦ MỚI (WINDOWS SERVER)

Quy trình này áp dụng khi bạn chuyển toàn bộ hệ thống đang chạy từ máy tính hiện tại sang một máy chủ vật lý hoặc máy chủ ảo (VM) khác chạy **Windows Server (2016/2019/2022)** hoặc **Windows 10/11 Pro**.

### Bước 1.1: Sao lưu toàn diện dữ liệu trên máy cũ
1. Mở PowerShell hoặc CMD tại thư mục dự án trên máy cũ:
   ```powershell
   python scripts/backup_database.py
   ```
2. Thao tác này sẽ tạo ra 2 thành phần quan trọng trong thư mục `backups/`:
   - File cơ sở dữ liệu SQLite: `backup_YYYYMMDD_HHMMSS.db`
   - File kết xuất JSON toàn bộ bảng: `full_database_dump_YYYYMMDD_HHMMSS.json` (chứa toàn bộ 360 thiết bị, 360 tài sản, 36 khoa phòng...)
3. Nén toàn bộ thư mục `DeployPackage_AssetManagement` thành file `.zip` (hoặc copy qua mạng LAN/ổ cứng di động).

### Bước 1.2: Chuẩn bị môi trường trên máy chủ mới
Trên máy chủ mới, tải và cài đặt các thành phần nền tảng:
1. **.NET 8.0 Hosting Bundle (hoặc .NET 8 SDK):**
   - Tải từ trang chủ Microsoft: [.NET 8.0 Runtime](https://dotnet.microsoft.com/download/dotnet/8.0)
   - Chọn mục: **ASP.NET Core Runtime 8.0.x - Hosting Bundle** (đã bao gồm Kestrel và hỗ trợ IIS nếu cần).
2. **Node.js (LTS v20+ hoặc v22+):**
   - Chỉ bắt buộc nếu bạn muốn trực tiếp biên dịch mã nguồn Frontend (`npm run build`). Nếu bạn đã copy thư mục `wwwroot` đã build sẵn thì không bắt buộc cài Node.js trên máy chủ vận hành.
3. **Python 3.x (Tùy chọn):**
   - Để tiếp tục sử dụng các script sao lưu tự động `backup_database.py`.

### Bước 1.3: Giải nén và khôi phục cơ sở dữ liệu
1. Giải nén gói mã nguồn vào thư mục mong muốn trên máy chủ mới (ví dụ: `D:\AssetManagement` hoặc `C:\DeployPackage_AssetManagement`).
2. Kiểm tra xem file `assetmanagement.db` đã có trong thư mục gốc của backend chưa. Nếu chưa có, copy file backup mới nhất đổi tên thành `assetmanagement.db`.

### Bước 1.4: Mở tường lửa (Windows Firewall) & Cấu hình IP tĩnh
1. **Cấu hình IP tĩnh cho máy chủ mới:**
   - Vào `Control Panel` $\rightarrow$ `Network and Sharing Center` $\rightarrow$ `Change adapter settings`.
   - Chuột phải vào card mạng LAN $\rightarrow$ `Properties` $\rightarrow$ `Internet Protocol Version 4 (TCP/IPv4)`.
   - Đặt IP tĩnh cố định theo dải mạng Bệnh viện (ví dụ: `192.170.182.197` hoặc `192.168.1.200`).
2. **Mở cổng 5000 trên Windows Firewall:**
   - Chuột phải vào file `MO_PORT_FIREWALL_LAN.bat` $\rightarrow$ Chọn **"Run as administrator"**.
   - Hoặc chạy lệnh PowerShell (Run as Admin):
     ```powershell
     New-NetFirewallRule -DisplayName "AssetFlow_Port_5000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5000
     ```

### Bước 1.5: Thiết lập tự động khởi động cùng Windows (Chạy như một Windows Service)
Để phần mềm tự động bật khi máy chủ khởi động lại mà không cần người dùng đăng nhập:
1. Tải công cụ **NSSM (Non-Sucking Service Manager)**: [nssm.cc](https://nssm.cc/download)
2. Mở CMD quyền Administrator và chạy:
   ```cmd
   nssm install AssetFlowService "D:\AssetManagement\AssetManagement.WebAPI.exe"
   nssm set AssetFlowService AppDirectory "D:\AssetManagement"
   nssm set AssetFlowService Start SERVICE_AUTO_START
   nssm start AssetFlowService
   ```
*(Hệ thống sẽ chạy ngầm vĩnh viễn và tự động khởi động lại nếu có sự cố).*

---

<a name="phan-2"></a>
## 🐧 PHẦN 2: CHUYỂN ĐỔI SANG HỆ ĐIỀU HÀNH LINUX (UBUNTU SERVER / DEBIAN)

Linux là hệ điều hành máy chủ lý tưởng về độ ổn định, tiết kiệm tài nguyên và bảo mật.

### Bước 2.1: Cài đặt .NET 8 trên Ubuntu Server
Đăng nhập SSH vào máy chủ Ubuntu và thực hiện:
```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt ASP.NET Core Runtime 8.0
sudo apt install -y dotnet-sdk-8.0 aspnetcore-runtime-8.0

# Kiểm tra cài đặt thành công
dotnet --info
```

### Bước 2.2: Sao chép mã nguồn và thiết lập phân quyền
1. Copy thư mục dự án lên máy chủ Linux (ví dụ đường dẫn: `/var/www/assetmanagement`).
2. Cấp quyền truy cập cho thư mục chứa file SQLite và thư mục wwwroot:
   ```bash
   sudo chown -R www-data:www-data /var/www/assetmanagement
   sudo chmod -R 755 /var/www/assetmanagement
   # Riêng file sqlite cần quyền ghi:
   sudo chmod 664 /var/www/assetmanagement/assetmanagement.db
   ```

### Bước 2.3: Tạo dịch vụ Systemd tự khởi động
Tạo file cấu hình dịch vụ `/etc/systemd/system/assetflow.service`:
```bash
sudo nano /etc/systemd/system/assetflow.service
```
Dán nội dung sau vào:
```ini
[Unit]
Description=AssetFlow - He thong Quan ly Trang bi Y te BVQY87
After=network.target

[Service]
WorkingDirectory=/var/www/assetmanagement
ExecStart=/usr/bin/dotnet /var/www/assetmanagement/AssetManagement.WebAPI.dll
Restart=always
# Khởi động lại sau 10 giây nếu dịch vụ bị crash
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=assetflow-webapi
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
```

Kích hoạt và khởi chạy dịch vụ:
```bash
sudo systemctl daemon-reload
sudo systemctl enable assetflow.service
sudo systemctl start assetflow.service
sudo systemctl status assetflow.service
```

### Bước 2.4: Mở Firewall Linux (UFW)
```bash
sudo ufw allow 5000/tcp
sudo ufw reload
```

---

<a name="phan-3"></a>
## 🗄️ PHẦN 3: CHUYỂN ĐỔI DATABASE TỪ SQLITE SANG MICROSOFT SQL SERVER

Khi hệ thống mở rộng lên hàng nghìn thiết bị và hàng trăm người dùng truy cập ghi dữ liệu cùng lúc, việc nâng cấp lên **Microsoft SQL Server (2019/2022)** là giải pháp tối ưu.

### Bước 3.1: Cập nhật thư viện NuGet trong Backend
Mở file `backend/AssetManagement.Infrastructure/AssetManagement.Infrastructure.csproj` và `backend/AssetManagement.WebAPI/AssetManagement.WebAPI.csproj`:
- **Gỡ bỏ hoặc thay thế:** `Microsoft.EntityFrameworkCore.Sqlite`
- **Cài đặt gói:** `Microsoft.EntityFrameworkCore.SqlServer` (phiên bản 8.0.x)

```powershell
cd backend/AssetManagement.Infrastructure
dotnet add package Microsoft.EntityFrameworkCore.SqlServer --version 8.0.11

cd ../AssetManagement.WebAPI
dotnet add package Microsoft.EntityFrameworkCore.SqlServer --version 8.0.11
```

### Bước 3.2: Cấu hình Connection String trong `appsettings.json`
Thay đổi chuỗi kết nối trong `backend/AssetManagement.WebAPI/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=192.168.1.10,1433;Database=AssetManagementDB;User Id=sa;Password=MatKhauBaoMat@2026;TrustServerCertificate=True;MultipleActiveResultSets=True;"
  }
}
```

### Bước 3.3: Điều chỉnh mã nguồn khởi động (`Program.cs`)
Mở file `backend/AssetManagement.WebAPI/Program.cs`:
1. Sửa đăng ký DbContext:
   ```csharp
   // Thay: options.UseSqlite(...)
   // Bằng:
   builder.Services.AddDbContext<ApplicationDbContext>(options =>
       options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
           sqlOptions => sqlOptions.EnableRetryOnFailure(
               maxRetryCount: 5,
               maxRetryDelay: TimeSpan.FromSeconds(30),
               errorNumbersToAdd: null)));
   ```
2. **Loại bỏ các lệnh PRAGMA đặc thù của SQLite:**
   Trong `Program.cs`, tìm đoạn:
   ```csharp
   // XÓA HOẶC COMMENT ĐOẠN PRAGMA SQLITE DƯỚI ĐÂY KHI CHUYỂN SANG SQL SERVER:
   // PRAGMA journal_mode = WAL;
   // PRAGMA synchronous = NORMAL;
   // PRAGMA busy_timeout = 5000;
   // PRAGMA cache_size = -20000;
   // PRAGMA temp_store = MEMORY;
   ```
   *(SQL Server tự động quản lý transaction log, locking và memory cache chuyên nghiệp, không cần các lệnh PRAGMA này).*

### Bước 3.4: Chạy Migration để tạo cấu trúc bảng trên SQL Server
```powershell
cd backend/AssetManagement.WebAPI
dotnet ef database update
```
Lệnh này sẽ tự động kết nối đến SQL Server và khởi tạo toàn bộ 12 bảng dữ liệu cùng các khóa ngoại và Index tương ứng.

### Bước 3.5: Di chuyển toàn bộ dữ liệu cũ (Data Migration) sang SQL Server
Vì bạn đã có file `full_database_dump_YYYYMMDD_HHMMSS.json` từ script backup:
1. Bạn có thể sử dụng script Python `scripts/restore_from_json.py` hoặc công cụ **SQL Server Management Studio (SSMS)**:
   - Dùng tính năng **Tasks $\rightarrow$ Import Data** trong SSMS.
   - Hoặc cài tiện ích chuyển đổi trực tiếp: `sqlite3 to mssql` / `DBeaver` / `Navicat Premium` để chuyển trực tiếp bảng và dữ liệu từ `assetmanagement.db` sang `AssetManagementDB` trên SQL Server chỉ với 1 cú click chuột.
2. Thứ tự import bảng để không bị lỗi ràng buộc khóa ngoại (Foreign Key):
   1. `Roles`
   2. `Departments`
   3. `Users`
   4. `Warehouses`
   5. `Categories`
   6. `Equipments`
   7. `Assets`
   8. `AssetTransfers`
   9. `RepairRequests`
   10. `MaintenanceTickets`
   11. `DeviceUsageLogs`

---

<a name="phan-4"></a>
## 🐳 PHẦN 4: ĐÓNG GÓI VÀ TRIỂN KHAI VỚI DOCKER & DOCKER COMPOSE

Sử dụng Docker giúp bạn triển khai ứng dụng chỉ bằng **1 lệnh duy nhất** trên bất kỳ máy chủ nào (Windows, Linux, macOS) mà không cần cài đặt .NET, Node.js hay SQL Server thủ công.

### Bước 4.1: Tạo file `Dockerfile` cho ứng dụng
Tại thư mục gốc của dự án, tạo file có tên `Dockerfile`:

```dockerfile
# ==============================================================
# GIAI ĐOẠN 1: Build Frontend React Vite
# ==============================================================
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# ==============================================================
# GIAI ĐOẠN 2: Build Backend .NET 8 WebAPI
# ==============================================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-backend
WORKDIR /src
COPY ["backend/AssetManagement.Domain/AssetManagement.Domain.csproj", "backend/AssetManagement.Domain/"]
COPY ["backend/AssetManagement.Infrastructure/AssetManagement.Infrastructure.csproj", "backend/AssetManagement.Infrastructure/"]
COPY ["backend/AssetManagement.WebAPI/AssetManagement.WebAPI.csproj", "backend/AssetManagement.WebAPI/"]
RUN dotnet restore "backend/AssetManagement.WebAPI/AssetManagement.WebAPI.csproj"

COPY backend/ ./backend/
WORKDIR "/src/backend/AssetManagement.WebAPI"
RUN dotnet publish "AssetManagement.WebAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ==============================================================
# GIAI ĐOẠN 3: Runtime Image hoàn chỉnh (Kết hợp Backend + Frontend)
# ==============================================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 5000
ENV ASPNETCORE_URLS=http://0.0.0.0:5000
ENV ASPNETCORE_ENVIRONMENT=Production

# Copy kết quả build backend
COPY --from=build-backend /app/publish .

# Copy kết quả build frontend vào thư mục wwwroot để Kestrel phục vụ trực tiếp
COPY --from=build-frontend /app/backend/AssetManagement.WebAPI/wwwroot ./wwwroot

# Tạo thư mục lưu trữ backups và uploads
RUN mkdir -p /app/backups /app/uploads

ENTRYPOINT ["dotnet", "AssetManagement.WebAPI.dll"]
```

### Bước 4.2: Tạo file `docker-compose.yml` (Bao gồm WebApp + SQL Server 2022)
Tại thư mục gốc dự án, tạo file `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # -------------------------------------------------------------
  # Dịch vụ 1: Hệ quản trị CSDL Microsoft SQL Server 2022
  # -------------------------------------------------------------
  mssql_server:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: assetflow_sqlserver
    restart: always
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=AssetFlow@BVQY87#2026Secure
      - MSSQL_PID=Express
    ports:
      - "1433:1433"
    volumes:
      - sqlserver_data:/var/opt/mssql
    networks:
      - assetflow_network

  # -------------------------------------------------------------
  # Dịch vụ 2: Ứng dụng Quản lý Trang bị (WebAPI + React Frontend)
  # -------------------------------------------------------------
  assetflow_app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: assetflow_webapp
    restart: always
    depends_on:
      - mssql_server
    ports:
      - "5000:5000"
    environment:
      - ConnectionStrings__DefaultConnection=Server=mssql_server,1433;Database=AssetManagementDB;User Id=sa;Password=AssetFlow@BVQY87#2026Secure;TrustServerCertificate=True;MultipleActiveResultSets=True;
      - JwtSettings__SecretKey=AssetFlow@LAN#SecretKey2026!VeryLongAndSecure
      - JwtSettings__Issuer=AssetFlowServer
      - JwtSettings__Audience=AssetFlowClients
      - Kestrel__Endpoints__Http__Url=http://0.0.0.0:5000
    volumes:
      - app_backups:/app/backups
      - app_uploads:/app/uploads
    networks:
      - assetflow_network

# ---------------------------------------------------------------
# Volumes lưu trữ dữ liệu bền vững (Không bị mất khi tắt container)
# ---------------------------------------------------------------
volumes:
  sqlserver_data:
    driver: local
  app_backups:
    driver: local
  app_uploads:
    driver: local

networks:
  assetflow_network:
    driver: bridge
```

### Bước 4.3: Các lệnh vận hành Docker
Trên máy chủ (đã cài đặt **Docker Desktop** hoặc **Docker Engine + Docker Compose**):

1. **Khởi động và build toàn bộ hệ thống:**
   ```bash
   docker compose up -d --build
   ```
2. **Xem nhật ký hoạt động (Logs):**
   ```bash
   docker compose logs -f assetflow_app
   ```
3. **Dừng hệ thống an toàn:**
   ```bash
   docker compose down
   ```
4. **Khởi động lại:**
   ```bash
   docker compose start
   ```

Toàn bộ ứng dụng sẽ tự động chạy tại cổng `5000`, tự động liên kết với SQL Server container và duy trì dữ liệu bền vững trong Docker Volumes.

---

<a name="phan-5"></a>
## ✅ PHẦN 5: CHECKLIST KIỂM THỬ TRƯỚC KHI GO-LIVE MÁY CHỦ MỚI

Trước khi bàn giao địa chỉ mới cho toàn bộ các khoa phòng sử dụng, Quản trị viên cần kiểm tra lần lượt các mục sau:

- [ ] **1. Kiểm tra IP & Mạng LAN:**
  - Máy chủ đã đặt IP tĩnh chưa?
  - Cổng 5000 đã được mở trên Firewall chưa?
  - Dùng lệnh `ping <IP_MAY_CHU>` từ máy trạm kiểm tra thông mạng.
- [ ] **2. Kiểm tra Kết nối Trình duyệt:**
  - Truy cập `http://<IP_MAY_CHU>:5000` từ máy trạm có hiện giao diện đầy đủ không?
  - Nhấn `Ctrl + F5` để xác nhận tải đầy đủ CSS và giao diện Squircle Gradient.
- [ ] **3. Kiểm tra Tính toàn vẹn Dữ liệu:**
  - Vào mục **Tài sản & Thiết bị** (`/assets`): Kiểm tra danh sách có đủ số lượng tài sản không.
  - Vào mục **Khoa phòng** (`/users`): Kiểm tra đủ 36 Khoa Phòng chuẩn của Bệnh viện Quân y 87 chưa.
- [ ] **4. Kiểm tra Các tính năng Nghiệp vụ Cốt lõi:**
  - Thử tạo 1 phiếu bàn giao có ký điện tử.
  - Thử bấm **Xuất Excel** và kiểm tra file Excel có đầy đủ 100% cột và không bị cắt ngắn 25 ký tự.
  - Thử tạo 1 phiếu đề nghị sửa chữa / báo hỏng.
- [ ] **5. Kiểm tra Sao lưu Dự phòng Tự động:**
  - Vào mục **Cài đặt Hệ thống** (`/settings`) $\rightarrow$ Bấm nút **"Sao lưu dữ liệu ngay"** xem có tạo thành công file backup mới trong thư mục `backups/` không.
  - Thiết lập lịch sao lưu tự động hàng ngày ra ổ cứng ngoài hoặc máy chủ backup thứ cấp.

---

<a name="phan-6"></a>
## 🔄 PHẦN 6: QUY TRÌNH NÂNG CẤP & CẬP NHẬT PHIÊN BẢN MỚI (VER 2.0) TRÊN MÁY CHỦ ĐANG HOẠT ĐỘNG

Khi bạn đã phát triển xong phiên bản mới (**Ver 2.0**) trên môi trường thử nghiệm (thêm chức năng mới, nâng cấp giao diện, sửa lỗi...) và muốn triển khai lên máy chủ thực tế đang vận hành, hãy tuân thủ nghiêm ngặt **Quy trình 6 bước Zero-Data-Loss** dưới đây:

### ⚠️ NGUYÊN TẮC BẤT DI BẤT DỊCH TRƯỚC KHI UPDATE:
> 1. **TUYỆT ĐỐI KHÔNG COPY ĐÈ FILE DATABASE:** Không được copy đè file `assetmanagement.db` từ máy dev sang máy chủ, vì sẽ làm mất toàn bộ các phát sinh mới của các khoa phòng đang dùng!  
> 2. **LUÔN BACKUP TRƯỚC KHI CAN THIỆP:** Phải tạo snapshot database và cấu hình trước khi đụng vào code chạy.  
> 3. **THỰC HIỆN VÀO GIỜ THẤP ĐIỂM:** Nên thực hiện vào đầu giờ sáng sớm hoặc cuối ngày làm việc để tránh gián đoạn các khoa phòng.

---

### 📦 KỊCH BẢN A: NÂNG CẤP TRÊN MÁY CHỦ WINDOWS (Chạy Kestrel / Windows Service)

#### Bước 6.1: Sao lưu toàn diện Cơ sở dữ liệu và Cấu hình máy chủ
Tại máy chủ đang chạy, mở PowerShell chạy lệnh sao lưu:
```powershell
python scripts/backup_database.py
```
Hoặc copy nhanh file database ra vị trí an toàn:
```powershell
Copy-Item "assetmanagement.db" "backups/pre_update_ver2_backup.db"
Copy-Item "backend/AssetManagement.WebAPI/appsettings.json" "backups/appsettings_backup.json"
```

#### Bước 6.2: Tạm dừng dịch vụ đang chạy
- Nếu chạy qua cửa sổ `KHOI_DONG_HE_THONG.bat`: Đóng cửa sổ lệnh.
- Nếu chạy qua Windows Service (NSSM):
  ```cmd
  nssm stop AssetFlowService
  ```
- Hoặc tắt tiến trình WebAPI bằng PowerShell:
  ```powershell
  Stop-Process -Name "AssetManagement.WebAPI" -Force -ErrorAction SilentlyContinue
  ```

#### Bước 6.3: Cập nhật mã nguồn & Bản Build mới (Ver 2.0)
Tùy vào phạm vi thay đổi của Ver 2.0:
1. **Trường hợp 1: Chỉ nâng cấp Giao diện (Frontend) / Thêm màn hình mới:**
   - Trên máy dev, build Frontend:
     ```bash
     cd frontend && npm run build
     ```
   - Chỉ copy toàn bộ thư mục `backend/AssetManagement.WebAPI/wwwroot/` và `wwwroot/` mới sang máy chủ.
   - Thao tác này an toàn 100%, không ảnh hưởng đến bất kỳ dòng dữ liệu nào trong database!
2. **Trường hợp 2: Nâng cấp cả Backend C# (Thêm API, thêm logic nghiệp vụ):**
   - Biên dịch bản Release trên máy dev:
     ```bash
     dotnet publish backend/AssetManagement.WebAPI/AssetManagement.WebAPI.csproj -c Release -o ./publish_ver2
     ```
   - Copy toàn bộ nội dung trong thư mục `publish_ver2` sang thư mục máy chủ, **NGOẠI TRỪ 2 FILE SAU (KHÔNG ĐƯỢC ĐÈ):**
     - ❌ `assetmanagement.db` (Giữ nguyên dữ liệu thật của bệnh viện).
     - ❌ `appsettings.json` (Giữ nguyên cấu hình IP, chuỗi kết nối và JWT của máy chủ).

#### Bước 6.4: Cập nhật cấu trúc Database (Nếu Ver 2 có thêm bảng hoặc cột mới)
Nếu phiên bản Ver 2.0 có thêm bảng dữ liệu mới hoặc thêm trường thuộc tính mới trong Entity Framework Core:
```powershell
cd backend/AssetManagement.WebAPI
dotnet ef database update
```
*EF Core sẽ tự động phân tích và chỉ bổ sung thêm các cột/bảng mới, bảo toàn nguyên vẹn 100% dữ liệu các bảng cũ!*

#### Bước 6.5: Khởi động lại hệ thống
- Khởi động lại Windows Service:
  ```cmd
  nssm start AssetFlowService
  ```
- Hoặc nhấp đúp vào `KHOI_DONG_HE_THONG.bat`.

#### Bước 6.6: Nhắc người dùng tải lại giao diện
Gửi thông báo tới các khoa phòng nhấn tổ hợp phím **`Ctrl + F5`** (hoặc `Ctrl + Shift + R`) trên trình duyệt để trình duyệt xóa cache bản cũ và nhận ngay toàn bộ giao diện Ver 2.0 mới nhất.

---

### 🐳 KỊCH BẢN B: NÂNG CẤP KHI CHẠY BẰNG DOCKER (Downtime chỉ 5 giây)

Nếu hệ thống đang chạy bằng Docker Compose:

1. **Bước 1 - Sao lưu dữ liệu database:**
   ```bash
   # Nếu dùng SQL Server container:
   docker exec -t assetflow_sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "AssetFlow@BVQY87#2026Secure" -Q "BACKUP DATABASE [AssetManagementDB] TO DISK = N'/var/opt/mssql/backup_ver1.bak' WITH NOFORMAT, NOINIT, SKIP, NOREWIND, NOUNLOAD, STATS = 10"
   ```
2. **Bước 2 - Kéo hoặc Build image Ver 2.0:**
   ```bash
   # Copy code mới vào thư mục dự án trên server, sau đó chạy:
   docker compose build assetflow_app
   ```
3. **Bước 3 - Khởi động lại container với image mới:**
   ```bash
   docker compose up -d --no-deps assetflow_app
   ```
   *Docker sẽ dừng container app cũ và khởi chạy container Ver 2 mới trong 3-5 giây. Dữ liệu trong Volume SQL Server (`sqlserver_data`) hoàn toàn được giữ nguyên vẹn 100%!*

---

### ⏪ KẾ HOẠCH HOÀN TÁC KHẨN CẤP (ROLLBACK TRONG 60 GIÂY)
Nếu bản Ver 2.0 sau khi triển khai gặp lỗi bất ngờ không lường trước:
1. Dừng ứng dụng: `nssm stop AssetFlowService` (hoặc `docker compose down`).
2. Khôi phục lại file database: Copy file `backups/pre_update_ver2_backup.db` đè lại thành `assetmanagement.db`.
3. Khôi phục lại mã nguồn bản Ver 1 từ bản sao lưu trước đó.
4. Bật lại dịch vụ: Hệ thống quay trở lại hoạt động bình thường ngay lập tức!

---
*Tài liệu được biên soạn đồng bộ với kiến trúc hệ thống Quản lý Trang bị & Thiết bị y tế - Bệnh viện Quân y 87 (Tháng 09/2026).*
