# ASSETFLOW - HỆ THỐNG QUẢN LÝ TÀI SẢN DOANH NGHIỆP
**Tài liệu Ghi nhớ Ngữ cảnh & Cấu trúc Dự án (Tự động cập nhật)**

## 1. Tổng quan Công nghệ
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide React (Icons), React Router v6.
- **Backend:** C# .NET 8 WebAPI, Entity Framework Core.
- **Database:** SQLite (`app.db`).
- **Thư viện mở rộng:**
  - `jspdf`, `jspdf-autotable`: Xuất file Biên bản PDF (Đã xử lý convert Tiếng Việt không dấu để chống lỗi font).
  - `html5-qrcode`: Quét mã QR bằng Camera.
  - `qrcode.react`: Tạo mã QR cho từng thiết bị.
  - `react-signature-canvas`: Ký tên điện tử khi bàn giao.
  - `xlsx`: Import/Export file Excel tài sản.

## 2. Cấu trúc Chức năng Cốt lõi (Modules)

### 2.1. Quản lý Tài sản (Asset List)
- **Hiển thị:** Bảng danh sách chi tiết (Mã QR, Tên, Kho, Danh mục, Trạng thái, Số lượng, Hãng SX...). Giao diện bảng được thiết kế đậm, rõ nét.
- **Tính năng:**
  - Import hàng loạt từ file Excel (Tự động tạo Kho và Danh mục nếu chưa có).
  - Thêm tài sản thủ công qua Form.
  - Quét mã QR tài sản để tự động mở form bàn giao.
  - Xem chi tiết/Phóng to mã QR tài sản.
  - Bàn giao thiết bị trực tiếp từ danh sách.

### 2.2. Quản lý Bàn giao (Transfer History)
- **Luồng bàn giao:** Chọn thiết bị -> Nhập thông tin Người giao, Người nhận, Ghi chú -> Ký tên xác nhận -> Lưu DB.
- **Tính năng:**
  - Lịch sử bàn giao chi tiết, tách biệt rõ ràng cột Người giao / Người nhận.
  - Xuất Biên bản Bàn giao PDF (Hỗ trợ định dạng bảng chuẩn, tự động lược bỏ dấu Tiếng Việt để tương thích tốt với chuẩn jsPDF).
  - Khôi phục/Thu hồi thiết bị.

### 2.3. Bảo trì & Sửa chữa (Maintenance)
- **Luồng báo hỏng:** Chọn nhiều thiết bị cùng lúc (Bulk Select) -> Chọn ngày hẹn bảo trì, nhập mô tả, chi phí -> Hệ thống tự động tách thành các Ticket riêng lẻ.
- **Tính năng:**
  - Giao diện dạng lưới theo dõi các yêu cầu bảo trì (Đang chờ, Đang sửa, Hoàn thành).
  - Chuông thông báo (Notification Bell) ở Layout: Tự động quét (5 phút/lần hoặc khi load) để cảnh báo số lượng các thiết bị ĐẾN HẠN BẢO TRÌ (Ngày hẹn <= Hiện tại). Bấm vào chuông thả xuống danh sách chi tiết.

### 2.4. Quản lý Kho & Danh mục (Categories)
- Thiết lập hệ thống Kho (Warehouse) -> Chứa các Danh mục (Category) -> Chứa các Thiết bị (Asset).

## 3. Kiến trúc Database (Entity Framework)
- `Users`: Quản lý người dùng.
- `Warehouses`: Quản lý kho.
- `Categories`: Danh mục tài sản (Foreign Key: `WarehouseId`).
- `Assets`: Tài sản chi tiết (Foreign Key: `CategoryId`).
- `AssetTransfers`: Lịch sử bàn giao (Foreign Key: `AssetId`, `FromUserId`, `ToUserId`).
- `MaintenanceTickets`: Yêu cầu bảo trì (Foreign Key: `AssetId`, `ReportedByUserId` (Nullable)).

## 4. Nhật ký Cập nhật Gần nhất
- *[05/09/2026]*: Thêm hệ thống đăng nhập JWT (Login Page, AuthContext, ProtectedRoute). Phân quyền 3 lớp: Admin/Manager/Staff.
- *[05/09/2026]*: Thêm trang Quản lý Tài khoản (UsersPage) — Admin/Manager xem, Admin CRUD.
- *[05/09/2026]*: Thêm BackupController + BackupSchedulerService (backup thủ công + tự động theo lịch).
- *[05/09/2026]*: Cấu hình máy chủ LAN — Backend serve luôn frontend, listen 0.0.0.0:5000.
- *[04/07/2026]*: Triển khai tính năng tạo Lịch bảo trì hàng loạt cho nhiều thiết bị (Lỗi Nullable `ReportedByUserId` trên EF Core đã được xử lý bằng Migration).
- *[04/07/2026]*: Thêm tính năng Chuông thông báo số lượng thiết bị tới hạn bảo trì (Bấm vào hiển thị Popover).
- *[04/07/2026]*: Fix lỗi Font chữ khi xuất file PDF bàn giao (Convert sang Tiếng Việt không dấu).
- *[04/07/2026]*: Bổ sung logic hiển thị thông tin Người giao / Người nhận độc lập trong bảng Lịch sử bàn giao.
- *[04/07/2026]*: Cải thiện UI Bảng Tài sản (Tiêu đề in đậm chữ, rõ nét).

---
*(Ghi chú: File này sẽ được AI Antigravity tự động cập nhật mỗi khi phát triển thêm module hoặc sửa đổi kiến trúc).*
