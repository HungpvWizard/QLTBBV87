# HƯỚNG DẪN TRIỂN KHAI MÁY CHỦ & KẾT NỐI MÁY TRẠM MẠNG LAN
> **HỆ THỐNG QUẢN LÝ TRANG BỊ & THIẾT BỊ Y TẾ (ASSETFLOW) - BỆNH VIỆN QUÂN Y 87**  
> **Địa chỉ IP máy chủ:** `192.170.182.197` | **Cổng:** `5000` | **Dải mạng LAN:** `192.170.182.0/24`

---

## 📌 1. KẾT QUẢ KIỂM TRA MÁY CHỦ HIỆN TẠI

| Thành phần | Trạng thái | Chi tiết kỹ thuật |
| :--- | :--- | :--- |
| **Hệ điều hành** | Windows 10 Pro (x64) | Build 19042, RAM 32 GB, CPU Intel I219-V Gigabit |
| **Địa chỉ IP LAN** | `192.170.182.197` | Subnet `255.255.255.0`, Gateway `192.170.182.1` |
| **Cổng dịch vụ WebAPI** | Cổng `5000` | Đang chạy Kestrel .NET 8 WebAPI, lắng nghe `http://0.0.0.0:5000` |
| **Tường lửa (Firewall)** | **ĐÃ MỞ SẴN** | Rule `RMS Backend 5000` cho phép Inbound TCP 5000 mọi Profile |
| **Môi trường .NET** | Đã cài đặt | .NET SDK `8.0.130` |
| **Môi trường Node.js** | Đã cài đặt | Node.js `v25.6.0`, npm `v11.x` |
| **Môi trường Python** | Đã cài đặt | Python `3.14.2` |
| **Công cụ Git** | **ĐÃ CÀI ĐẶT & KHỞI TẠO** | `git version 2.53.0.windows.2` |
| **Cơ sở dữ liệu SQL** | **ĐÃ SẴN SÀNG** | SQLite nhúng WAL Mode + Cache RAM 20MB, đã backup an toàn |
| **Công cụ Docker** | **ĐÃ TẠO PROFILE ĐẦY ĐỦ** | Đã tạo `Dockerfile`, `docker-compose.yml`, tiện ích cài đặt |

---

## 🚀 2. TRIỂN KHAI CHO CÁC MÁY TRẠM TRONG DẢI MẠNG LAN

Tất cả các máy tính trạm trong bệnh viện (thuộc cùng dải mạng nội bộ `192.170.182.x`) **hoàn toàn KHÔNG cần phải cài đặt bất kỳ phần mềm nào**, chỉ cần mở trình duyệt web (Google Chrome, Microsoft Edge, Cốc Cốc, Firefox).

### Cách 1: Sử dụng File phím tắt Desktop (Khuyến nghị cho các Khoa / Phòng)
1. Copy file **`QuanLyTrangBi_LAN.url`** (nằm tại thư mục gốc dự án) gửi sang màn hình Desktop của các máy trạm (qua Zalo nội bộ, USB hoặc thư mục chia sẻ mạng `\\192.170.182.197`).
2. Nhân viên tại các khoa phòng chỉ cần **Click đúp vào biểu tượng** là phần mềm tự động mở ngay trên trình duyệt với đầy đủ logo và giao diện chuẩn.

### Cách 2: Truy cập trực tiếp qua thanh địa chỉ Trình duyệt
Trên máy trạm, mở trình duyệt và gõ địa chỉ:
```
http://192.170.182.197:5000
```
*(Nếu đang ngồi trực tiếp tại máy chủ, có thể gõ `http://localhost:5000` hoặc `http://localhost:5173`).*

### Cách 3: Kiểm tra thông tuyến bằng file `KiemTraKetNoi_MayTram.bat`
Nếu máy trạm nào báo không mở được, copy file `KiemTraKetNoi_MayTram.bat` sang máy đó và chạy:
- Công cụ sẽ tự động ping kiểm tra thông mạng tới IP `192.170.182.197`.
- Kiểm tra cổng `5000` của máy chủ.
- Tự động bật trình duyệt web nếu kết nối thông suốt.

---

## 💾 3. CƠ SỞ DỮ LIỆU SQL & BẢO TOÀN DỮ LIỆU

1. **Cơ chế CSDL hiện tại (SQLite Siêu Tốc):**
   - File dữ liệu: `assetmanagement.db` tại thư mục gốc máy chủ.
   - Đã nạp đầy đủ **362 thiết bị**, **362 tài sản**, **36 khoa phòng**, **11 module chức năng**, **hệ thống phân quyền**, **báo cáo tần suất** và **26 chỉ số KPI**.
   - Cấu hình **WAL Mode** (Write-Ahead Logging) cho phép hàng trăm máy trạm đọc/ghi dữ liệu song song không bị xung đột.
   - Đã thiết lập script tự động sao lưu an toàn `python scripts/backup_database.py` vào thư mục `backups/`.
2. **Tùy chọn kết nối Microsoft SQL Server (Nếu có yêu cầu):**
   - Đã cấu hình sẵn container Microsoft SQL Server 2022 Express trong file `docker-compose.yml` (profile `mssql`).
   - Có thể bật bằng lệnh: `docker compose --profile mssql up -d`.

---

## 🐳 4. HƯỚNG DẪN CÀI ĐẶT & CHẠY DOCKER (KHI CẦN)

Trên máy chủ hiện tại chưa cài Docker Engine. Nếu Quản trị viên muốn đóng gói và chạy toàn bộ ứng dụng trong Docker container:

1. **Cài đặt Docker Desktop:**
   - Nhấp chuột phải vào file **`CAI_DAT_DOCKER_WINDOWS.bat`** -> Chọn **Run as Administrator**.
   - Hoặc tải trực tiếp file cài đặt chính thức từ:  
     `https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe`
   - Khởi động lại máy tính khi được yêu cầu để kích hoạt ảo hóa Hyper-V/WSL2.
2. **Khởi chạy hệ thống bằng Docker:**
   Mở terminal tại thư mục dự án và chạy:
   ```bash
   docker compose up -d --build
   ```
   Ứng dụng sẽ tự động được biên dịch đa tầng và phục vụ trên cổng `http://192.170.182.197:5000`.

---

## ⚙️ 5. QUẢN LÝ DỊCH VỤ TRÊN MÁY CHỦ

- **Khởi động 1-Click tự động:** Nhấp đúp vào **`KHOI_DONG_HE_THONG.bat`** trên máy chủ:
  - Tự động sao lưu dữ liệu.
  - Tự động kích hoạt Backend WebAPI cổng 5000.
  - Tự động kích hoạt Frontend Vite cổng 5173.
  - Tự động bật trình duyệt.
- **Tài khoản đăng nhập mặc định:**
  - `admin` (Quản trị viên)
  - `dmtuan` (Quản lý)
  - `ltanh` (Nhân viên, mật khẩu: `123456`)
