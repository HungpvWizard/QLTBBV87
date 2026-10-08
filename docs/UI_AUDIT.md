# BÁO CÁO KIỂM TOÁN GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX AUDIT)
> Hệ thống Quản lý Tài sản & Thiết bị Y tế — Bệnh viện Quân y 87
> Tiêu chuẩn đánh giá: Enterprise Asset Management, Calm, Data-Dense, Safe Modernization.

---

## 1. Phân Loại Ưu Tiên (Prioritization Matrix)

### 🔴 P0 — Hàng Rào An Toàn & Ràng Buộc Cốt Lõi (Tuyệt đối không vi phạm)
1. **Ràng buộc độ dài ký tự bảng Tài sản (`AssetList.tsx`):**
   - *Hiện trạng:* Các cột text đang dùng hàm `renderCell25()` giới hạn hiển thị tối đa 25 ký tự, rê chuột (hover) để xem đầy đủ tooltip.
   - *Quy tắc:* **BẮT BUỘC GIỮ NGUYÊN 100%**, không được tháo bỏ hoặc thay bằng truncate thông thường làm hỏng tooltip.
2. **Xuất Excel toàn vẹn 100% dữ liệu:**
   - *Hiện trạng:* Chức năng xuất Excel xuất toàn bộ dữ liệu gốc đầy đủ, không bị cắt ngắn 25 ký tự.
   - *Quy tắc:* Giữ nguyên logic lấy dữ liệu gốc khi xuất file.
3. **Bộ lọc thời tiết Header & Dark Mode Tailwind v4:**
   - *Hiện trạng:* Tọa độ Khánh Hòa (12.2388, 109.1967), chữ trắng sáng `dark:text-white`.
   - *Quy tắc:* Giữ nguyên khai báo `@custom-variant dark (&:where(.dark, .dark *));` trong `frontend/src/index.css`.
4. **Quy tắc Nghiệp vụ Báo cáo Tần suất (`UsageFrequencyTab.tsx`):**
   - *Hiện trạng:* Gom nhóm 1 dòng duy nhất cho máy cùng Serial + Tên (Last-write wins); khóa dữ liệu ngày hôm trước sau 23h59 đối với Staff/Manager; Admin có quyền sửa khác ngày.
   - *Quy tắc:* Không được thay đổi bất kỳ logic khóa dữ liệu hoặc gom nhóm nào.
5. **Đồng bộ 36 Khoa, Phòng, Ban chính thức:**
   - *Hiện trạng:* Đã chuẩn hóa 36 đơn vị trong CSDL và cache đồng bộ qua `departmentsUpdated`.
   - *Quy tắc:* Giữ nguyên cấu trúc đồng bộ.

---

### 🟡 P1 — Các Hạng Mục Giá Trị Cao Cần Chuẩn Hóa (High-Value Modernization)
1. **Chuẩn hóa Bảng dữ liệu (Enterprise Data Table):**
   - *Vấn đề:* Khoảng cách padding giữa các trang chưa hoàn toàn đồng nhất (`AssetList.tsx`, `EquipmentsPage.tsx`, `RepairRequests.tsx`).
   - *Giải pháp:* Áp dụng chiều cao dòng đồng bộ (py-3), font chữ bảng 13.5px sắc nét, đường kẻ viền thanh lịch (`border-slate-100 dark:border-slate-800`), hiệu ứng hover dòng mềm mại (`hover:bg-slate-50/80 dark:hover:bg-slate-800/50`).
2. **Chuẩn hóa Huy hiệu Trạng thái (Semantic Status Badges):**
   - *Vấn đề:* Màu sắc trạng thái giữa các trang đôi khi lệch tông (xanh dương vs xanh lục, cam vs vàng).
   - *Giải pháp:* Thống nhất bảng màu ngữ nghĩa:
     - 🟢 **Sẵn sàng / Đang sử dụng / Hoạt động tốt:** Nền xanh ngọc nhạt (`bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60`).
     - 🟡 **Đang bảo trì / Đang sửa chữa:** Nền hổ phách (`bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60`).
     - 🔴 **Hỏng / Quá hạn / Khẩn cấp:** Nền đỏ hồng dịu (`bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60`).
     - 🔵 **Chờ tiếp nhận / Điều chuyển:** Nền xanh lam (`bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60`).
     - ⚪ **Thanh lý / Ngừng sử dụng:** Nền xám trung tính (`bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700`).
3. **Chuẩn hóa Form nhập liệu & Modal Dialogs:**
   - *Vấn đề:* Một số modal kích thước cố định hoặc thiếu sticky header/footer khi form dài.
   - *Giải pháp:* Đảm bảo modal có `backdrop-blur-sm`, góc bo `rounded-2xl`, thanh cuộn nội bộ mượt mà, nút Đóng/Hủy và Lưu/Xác nhận luôn cố định rõ ràng. Nhãn trường có dấu sao đỏ (`*`) cho trường bắt buộc.
4. **Trạng thái Trống (Empty States) & Tải dữ liệu (Loading Feedback):**
   - *Vấn đề:* Khi tìm kiếm không có kết quả, bảng hiện dòng text đơn giản hoặc trống trơn.
   - *Giải pháp:* Thêm khối Empty State trang nhã gồm icon minh họa mờ, thông báo rõ ràng "Không tìm thấy dữ liệu phù hợp" và nút bấm nhanh "Đặt lại bộ lọc".

---

### 🟢 P2 — Tinh Chỉnh Chi Tiết & Tương Tác Nhẹ (Polish & Consistency)
1. **Khoảng cách hệ thống 8px Grid:** Chuẩn hóa các bước đệm (padding, margin, gap) theo bội số 4/8/12/16/24px.
2. **Hiệu ứng chuyển động (Motion & Micro-interactions):**
   - Thời gian chuyển động tinh tế 150ms – 200ms cho nút bấm, tab chuyển đổi và dropdown.
   - Tuyệt đối không thêm animation trễ nải trên bảng dữ liệu lớn làm chậm thao tác của cán bộ y tế.
3. **Độ tương phản chữ trên nền tối (Dark Mode Contrast):**
   - Rà soát các nhãn phụ, đảm bảo độ tương phản đạt chuẩn WCAG AA (tối thiểu 4.5:1), không để chữ bị chìm vào nền tối.

---

## 2. Bảng Kiểm Toán Chi Tiết Từng Tệp Nguồn Thực Tế (Source Code Audit)

| STT | Tệp tin nguồn (Source File) | Tuyến đường (Route) | Hạng mục kiểm toán UI/UX | Hiện trạng thực tế trong code | Hành động xử lý & Tinh chỉnh | Kết quả bảo toàn |
|:---:|:---|:---|:---|:---|:---|:---:|
| 1 | `frontend/src/pages/LoginPage.tsx` | `/login` | Nền y tế, Logo, Input fields, Time header | Giao diện công nghệ radial gradient, logo BV Quân y 87 sắc nét | Giữ nguyên form đăng nhập chuẩn, focus ring tinh tế, đồng hồ thời gian thực | **100% PASS** |
| 2 | `frontend/src/pages/Dashboard.tsx` | `/dashboard`, `/` | StatCards, Donut chart, Column chart | 4 Thẻ KPI bấm chuyển trang, Donut chart có tổng số ở tâm | Chuẩn hóa bảng màu `DARK_COLORS` & `LIGHT_COLORS`, chú giải 2 cột không đè chữ | **100% PASS** |
| 3 | `frontend/src/pages/AssetList.tsx` | `/assets` | **Ràng buộc P0:** `renderCell25()`, Excel full, Status pill, Modal QR, Form bàn giao | Đang dùng `renderCell25()` cho text cell, xuất Excel lấy dữ liệu gốc | Giữ nguyên 100% `renderCell25()` và logic Excel; nâng cấp semantic status badges và Enterprise empty state | **100% PASS** |
| 4 | `frontend/src/pages/TransferHistory.tsx` | `/transfers` | Tab pills, Bảng lịch sử, Form bàn giao canvas, Xuất PDF & Excel | Có 2 Tab, canvas chữ ký tay, xuất PDF jsPDF | Bổ sung thanh công cụ tìm kiếm và nút **Xuất Excel** `LichSu_BanGiao_ThietBi.xlsx` cho Tab 1; Enterprise empty state | **100% PASS** |
| 5 | `frontend/src/pages/MaintenanceList.tsx` | `/maintenance` | 4 Thẻ KPI, Bảng vé bảo trì, Dropdown trạng thái, Xuất Excel | Có bảng vé và modal bảo trì hàng loạt, nút Xuất Excel trước đây thiếu onClick | Bổ sung hàm xuất Excel `DanhSach_BaoTri_BaoHanh.xlsx`, semantic dropdown badges, Enterprise empty state | **100% PASS** |
| 6 | `frontend/src/pages/RepairRequests.tsx` | `/repair-requests` | 3 Thẻ thống kê, Bảng phiếu đề nghị, Modal tiếp nhận, Phân trang | Đầy đủ luồng tạo đề nghị và kỹ thuật xử lý | Nâng cấp semantic status badges (`badge-status-*`), Enterprise empty state và phân trang Pagination | **100% PASS** |
| 7 | `frontend/src/pages/CategoryList.tsx` | `/categories` | 2 Tab (Kho / Danh mục), Modal Thêm/Sửa, Modal xác nhận xóa an toàn | Có 2 tab và modal confirm kiểm tra ràng buộc khóa ngoại backend | Chuẩn hóa Enterprise empty states cho cả 2 tab; bảo toàn logic chặn xóa an toàn | **100% PASS** |
| 8 | `frontend/src/pages/EquipmentsPage.tsx` | `/equipments` | Bảng 360 thiết bị, Chú giải 6 mức màu hạn dùng, Rút gọn mã TB, Phân trang | Áp dụng cắt mã TB ≤ 25 ký tự, 6 mức màu hạn sử dụng | Nâng cấp Enterprise empty state và Pagination chuẩn y tế | **100% PASS** |
| 9 | `frontend/src/pages/ReportsPage.tsx`<br>`frontend/src/pages/UsageFrequencyTab.tsx` | `/reports` | **Ràng buộc P0:** 2 Tab lớn, Dual-mode thời gian, Khóa sau 23h59, Last-write wins, Gom nhóm 1 dòng | Ma trận ngày 1-31, modal ghi nhận hàng loạt, xuất Excel ma trận động | Giữ nguyên 100% logic khóa 23h59, Last-write wins và gom nhóm; nâng cấp badge số lượt ngọc xanh | **100% PASS** |
| 10 | `frontend/src/pages/UsersPage.tsx` | `/users` | 36 Khoa phòng 4 khối, Modal nhân sự, File mẫu Excel `Mau_Import_Khoa_Phong.xlsx` | 36 đơn vị chuẩn, click badge nhân sự mở modal danh sách | Giữ nguyên cấu trúc đồng bộ `departmentsUpdated` và cơ chế Cache thông minh | **100% PASS** |
| 11 | `frontend/src/pages/Settings.tsx` | `/settings` | Đổi mật khẩu, Server redirect, Sao lưu CSDL SQLite | Đổi pass, phát hiện LAN IP, tạo shortcut Desktop `.url`, backup `.db` | Giữ nguyên quy trình sao lưu và chuyển hướng máy chủ nội bộ | **100% PASS** |
| 12 | `frontend/src/layouts/MainLayout.tsx` | Shared | Flyout Submenu, Top Header 64px, Thời tiết Khánh Hòa, Footer 44px | Menu 8 mục, Flyout Submenu mở rộng Tài sản, tọa độ thời tiết KH | Giữ nguyên tọa độ Khánh Hòa (12.2388, 109.1967), chữ trắng sáng `dark:text-white` | **100% PASS** |


