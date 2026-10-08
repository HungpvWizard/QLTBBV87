# BẢNG ĐỐI CHIẾU & KIỂM TRA BẢO TOÀN TÍNH NĂNG (BEFORE / AFTER FEATURE PARITY CHECKLIST)
> **Nguyên tắc tối cao:** 100% chức năng hiện hữu phải được bảo toàn, không giảm bớt bất kỳ luồng nghiệp vụ hay trường dữ liệu nào.

---

## 1. Tổng Hợp Đánh Giá Toàn Bộ Hệ Thống

| STT | Phân hệ / Trang | Route | Chức năng nghiệp vụ | Tính năng bảo toàn | Visual QA | Parity Status |
|:---:|:---|:---|:---:|:---:|:---:|:---:|
| 1 | **Đăng Nhập** | `/login` | 100% | 100% | Đạt chuẩn | **PASS** |
| 2 | **Bảng Điều Khiển (Dashboard)** | `/` | 100% | 100% | Đạt chuẩn | **PASS** |
| 3 | **Tài Sản & Thiết Bị (P0)** | `/assets` | 100% (renderCell25, Excel full) | 100% | Đạt chuẩn | **PASS** |
| 4 | **Lịch Sử Bàn Giao** | `/transfers` | 100% (Ký số, PDF, 36 khoa) | 100% | Đạt chuẩn | **PASS** |
| 5 | **Bảo Trì & Bảo Hành** | `/maintenance` | 100% (Ticket, đổi trạng thái) | 100% | Đạt chuẩn | **PASS** |
| 6 | **Phiếu Đề Nghị / Báo Hỏng** | `/repair-requests` | 100% (Phân quyền, tiếp nhận) | 100% | Đạt chuẩn | **PASS** |
| 7 | **Kho & Danh Mục** | `/categories` | 100% (Modal chặn xóa an toàn) | 100% | Đạt chuẩn | **PASS** |
| 8 | **Quản Lý Thiết Bị Y Tế** | `/equipments` | 100% (Hạn dùng màu, import/export) | 100% | Đạt chuẩn | **PASS** |
| 9 | **Báo Cáo & Tần Suất (P0)** | `/reports` | 100% (23h59 lock, last-write, gom nhóm) | 100% | Đạt chuẩn | **PASS** |
| 10 | **Quản Lý Khoa Phòng & Nhân Sự** | `/users` | 100% (36 đơn vị, import Excel mẫu) | 100% | Đạt chuẩn | **PASS** |
| 11 | **Cài Đặt & Sao Lưu** | `/settings` | 100% (Đổi pass, backup SQLite, LAN IP) | 100% | Đạt chuẩn | **PASS** |
| 12 | **Khung Vỏ Chung (Layout & Nav)** | Shared | 100% (Flyout Submenu, Thời tiết KH) | 100% | Đạt chuẩn | **PASS** |

---

## 2. Chi Tiết Kiểm Tra Từng Màn Hình

### 2.1. Khung Điều Hướng Chung (`MainLayout.tsx`)
- [x] Route unchanged / compatible
- [x] All buttons/actions retained: Logo BV Quân y 87, 8 menu items, Flyout Submenu cho "Tài sản & Thiết bị" (Lịch sử bàn giao + Bảo trì & Bảo hành)
- [x] Top header: Đồng hồ thời gian thực, Thời tiết Khánh Hòa (12.2388, 109.1967), Chuông thông báo, Đổi theme sáng/tối, Avatar profile
- [x] Chân trang (Footer): Bản quyền 2026 Bệnh viện Quân y 87
- [x] Build passes: `npm run build` thành công 100%
- [x] Visual QA complete: Flyout submenu hiển thị mượt mà, Dark mode tương phản tốt
- **Feature parity:** **PASS**

### 2.2. Bảng Điều Khiển (`Dashboard.tsx`)
- [x] Route unchanged / compatible: `/`
- [x] 4 StatCards liên kết bộ lọc `/assets`: Tổng TS, Đang dùng, Sửa chữa, Cảnh báo hỏng
- [x] Biểu đồ Donut: Tổng ở tâm, nhãn không đè nhau, bảng chú giải 2 cột dưới
- [x] Biểu đồ cột: Thống kê theo danh mục, nhãn xoay nghiêng -30 độ rõ nét
- [x] Visual QA complete: Bảng màu Enterprise tương phản cao
- **Feature parity:** **PASS**

### 2.3. Tài Sản & Thiết Bị (`AssetList.tsx`) — Hàng Rào P0
- [x] Route unchanged / compatible: `/assets`
- [x] **Ràng buộc P0:** Giới hạn text ≤ 25 ký tự (`renderCell25()`, hover hiện 100% chuỗi gốc)
- [x] **Ràng buộc P0:** Xuất Excel giữ 100% độ dài dữ liệu gốc (không cắt 25 ký tự)
- [x] Quét mã QR camera, Modal phóng to mã QR không tràn màn hình
- [x] Bàn giao trực tiếp từng máy với form ký chữ ký điện tử
- [x] Badge trạng thái semantic chuẩn y tế (Rảnh, Đang dùng, Bảo trì, Cảnh báo hỏng)
- [x] Icon cờ lê Wrench tự động nhấp nháy khi có phiếu đề nghị sửa chữa chờ xử lý
- [x] Phân trang `Pagination.tsx` đầy đủ 4 biến thể, tự động về trang 1 khi lọc
- **Feature parity:** **PASS**

### 2.4. Lịch Sử Bàn Giao (`TransferHistory.tsx`)
- [x] Route unchanged / compatible: `/transfers`
- [x] Tab 1 Lịch sử: Bảng phân trang, nút Xuất PDF tiếng Việt chuẩn font
- [x] Tab 2 Thực hiện bàn giao: Đồng bộ 36 khoa phòng, chọn đại diện khoa hoặc nhân sự
- [x] Nút "Đồng bộ từ Quản lý Khoa Phòng", canvas chữ ký điện tử và nút xóa chữ ký
- [x] Empty state Enterprise với icon và hướng dẫn thao tác
- **Feature parity:** **PASS**

### 2.5. Bảo Trì & Bảo Hành (`MaintenanceList.tsx`)
- [x] Route unchanged / compatible: `/maintenance`
- [x] 4 Thẻ KPI: Tổng yêu cầu, Đang xử lý, Hoàn thành, Tổng chi phí dự kiến
- [x] Modal lập lịch bảo trì hàng loạt, tách Ticket độc lập
- [x] Cập nhật tiến độ ticket với dropdown semantic badges chuẩn Enterprise
- [x] Tự động đồng bộ trạng thái thiết bị sang Bảo trì
- **Feature parity:** **PASS**

### 2.6. Phiếu Đề Nghị / Báo Hỏng (`RepairRequests.tsx`)
- [x] Route unchanged / compatible: `/repair-requests`
- [x] Thống kê đếm thực tế: Đang chờ tiếp nhận, Đang xử lý, Đã hoàn thành
- [x] Tạo phiếu đề nghị sự cố, chọn thiết bị và khoa phòng
- [x] Xử lý phiếu: Tiếp nhận, cập nhật kỹ thuật viên, chuyển trạng thái
- [x] Semantic badges mức độ ưu tiên & trạng thái phiếu
- **Feature parity:** **PASS**

### 2.7. Kho & Danh Mục (`CategoryList.tsx`)
- [x] Route unchanged / compatible: `/categories`
- [x] 2 Tab phân cấp: Quản lý Kho & Quản lý Danh mục
- [x] Modal Thêm / Sửa kho và danh mục
- [x] Hộp thoại xác nhận xóa an toàn: Kiểm tra ràng buộc backend (chặn xóa nếu còn liên kết)
- [x] Empty state Enterprise cho cả 2 tab
- **Feature parity:** **PASS**

### 2.8. Quản Lý Thiết Bị Y Tế (`EquipmentsPage.tsx`)
- [x] Route unchanged / compatible: `/equipments`
- [x] Bảng hồ sơ định mức kỹ thuật 360 thiết bị y tế
- [x] Cắt rút gọn cột mã thiết bị ≤ 25 ký tự, hover xem mã đầy đủ
- [x] 6 Mức màu hạn sử dụng (Đỏ, Tím, Cam, Xanh dương, Xám, Xanh lá), bộ lọc tương tác
- [x] Tải file mẫu, Import Excel, Xuất Excel toàn bộ
- [x] Empty state Enterprise và phân trang Pagination chuẩn y tế
- **Feature parity:** **PASS**

### 2.9. Báo Cáo & Thống Kê Tần Suất (`ReportsPage.tsx` & `UsageFrequencyTab.tsx`) — Hàng Rào P0
- [x] Route unchanged / compatible: `/reports`
- [x] Tab 1: Báo cáo bàn giao thực tế theo 36 khoa phòng, bộ lọc Ngày/Tháng/Quý/Năm
- [x] Tab 2: Ma trận tần suất sử dụng ngày 1-31, 4 thẻ thống kê
- [x] **Ràng buộc P0:** Dual mode thời gian (Theo tháng & Từ ngày ... đến ngày ...)
- [x] **Ràng buộc P0:** Bộ lọc "Chỉ máy có lượt dùng" và "Tất cả máy"
- [x] **Ràng buộc P0:** Gom nhóm máy cùng Serial + Tên chỉ hiện 1 dòng duy nhất
- [x] **Ràng buộc P0:** Ghi nhận lần cuối cùng trong ngày (Last-write wins)
- [x] **Ràng buộc P0:** Khóa dữ liệu ngày hôm trước sau 23h59 (Staff/Manager chỉ ghi hôm nay, Admin được sửa ngày quá khứ)
- [x] **Ràng buộc P0:** Xuất Excel ma trận động đầy đủ 100% dữ liệu gốc
- **Feature parity:** **PASS**

### 2.10. Quản Lý Khoa Phòng & Nhân Sự (`UsersPage.tsx`)
- [x] Route unchanged / compatible: `/users`
- [x] Tên module: "Quản lý Khoa Phòng"
- [x] 36 Khoa, Phòng, Ban chính thức của BV Quân y 87 (4 cột khối đơn vị)
- [x] Cột "Nhân sự" hiển thị số lượng và click mở modal chi tiết danh sách tài khoản
- [x] Tải file mẫu `Mau_Import_Khoa_Phong.xlsx` và Import hàng loạt từ Excel
- [x] Cơ chế cache thông minh giải phóng cache 12 khoa cũ tự động
- [x] Tab 2 Quản lý tài khoản: 3 cấp quyền Admin, Manager, Staff
- **Feature parity:** **PASS**

### 2.11. Cài Đặt & Sao Lưu (`Settings.tsx`)
- [x] Route unchanged / compatible: `/settings`
- [x] Thông tin cá nhân, cập nhật ảnh đại diện avatar
- [x] Đổi mật khẩu tài khoản an toàn
- [x] Chuyển hướng máy chủ (Server Redirection): cấu hình IP LAN, tạo shortcut `.url`, mã QR
- [x] Quản lý sao lưu SQLite: Nút "Sao lưu ngay", tải file `.db`, xóa backup, lịch sao lưu tự động
- **Feature parity:** **PASS**

