# KẾ HOẠCH TRIỂN KHAI NÂNG CẤP UI/UX AN TOÀN (IMPLEMENTATION PLAN)
> Nguyên tắc: Làm từng trang độc lập, kiểm tra build/test sau mỗi bước, bảo toàn 100% chức năng hiện hữu.
> Định dạng mỗi Task: Trang mục tiêu, Tệp tin sửa đổi, Baseline chức năng, Cải tiến UI dự kiến, Rủi ro tiềm ẩn, Kiểm thử, Điểm phục hồi (Rollback).

---

## Giai đoạn 1: Chuẩn Hóa Tokens Hệ Thống & Khung Vỏ (Phase 4–5) — [ĐÃ HOÀN TẤT ✅]
### Task 1.1: Design Tokens & Semantic Badges — [ĐÃ HOÀN TẤT ✅]
- **Tệp tin:** `frontend/src/index.css`, `frontend/src/components/Pagination.tsx`
- **Baseline chức năng:** Đảm bảo giữ nguyên khai báo `@custom-variant dark (&:where(.dark, .dark *));`, không làm hỏng theme tối.
- **Cải tiến UI:** Khai báo biến màu ngữ nghĩa Enterprise (Emerald, Amber, Rose, Sky, Slate), chuẩn hóa độ dày viền, bóng đổ mềm, thanh cuộn mượt mà `::-webkit-scrollbar` và helper classes `.card-enterprise`, `.focus-ring-medical`.
- **Rủi ro:** Xung đột CSS selector của Tailwind v4 -> Đã xử lý triệt để, build `tsc -b && vite build` 100% thành công.
- **Kiểm thử:** `npm run build` thành công (exit code 0), chuyển đổi Dark/Light mode trơn tru.
- **Rollback point:** Bản sao lưu `backups/backup_20260924_150141.db` & Git commit.

### Task 1.2: App Shell & Navigation — [ĐÃ HOÀN TẤT ✅]
- **Tệp tin:** `frontend/src/layouts/MainLayout.tsx`
- **Baseline chức năng:** Bảo toàn Menu 8 mục, Flyout Submenu của "Tài sản & Thiết bị", Đồng hồ thời gian thực, Thời tiết Khánh Hòa cố định, Chuông cảnh báo, Avatar profile, Footer h-11.
- **Cải tiến UI:** Flyout Submenu mượt mà với hiệu ứng blur và backdrop shadow cao cấp, vạch ngăn đứng thanh thoát, Header và Footer chuẩn phong cách Enterprise Medical.
- **Rủi ro:** Bị vỡ layout ở độ phân giải 1366x768 -> Đã kiểm tra responsive, hoạt động ổn định.
- **Kiểm thử:** Đã hover menu con, chuyển trang, build và đồng bộ sang `wwwroot/`.
- **Rollback point:** Bản sao lưu `MainLayout.tsx`.

---

## Giai đoạn 2: Từng Trang Nghiệp Vụ (Phase 6 Page-by-Page) — [ĐÃ HOÀN TẤT ✅]

### Task 2.1: Trang Đăng Nhập (`/login`) — [ĐÃ HOÀN TẤT ✅]
- **Tệp tin:** `frontend/src/pages/LoginPage.tsx`
- **Baseline chức năng:** Đăng nhập JWT, toggle xem mật khẩu, submit bằng Enter, báo lỗi toast.
- **Cải tiến UI:** Nền y tế trang nhã, card đăng nhập trung tâm chuyên nghiệp, nhãn trường rõ ràng, focus ring tinh tế.
- **Kiểm thử:** Đăng nhập thành công và đăng nhập sai mật khẩu.

### Task 2.2: Bảng Điều Khiển (`/dashboard`) — [ĐÃ HOÀN TẤT ✅]
- **Tệp tin:** `frontend/src/pages/Dashboard.tsx`
- **Baseline chức năng:** 4 thẻ thống kê số lượng máy, Biểu đồ tròn Donut trạng thái (có tổng ở tâm, chú giải dưới), Biểu đồ cột danh mục, bảng hoạt động gần đây.
- **Cải tiến UI:** Thẻ KPI số liệu sắc nét, nhãn đơn vị rõ ràng, màu sắc biểu đồ chuẩn ngữ nghĩa.
- **Kiểm thử:** Kiểm tra số liệu khớp 100% với danh mục 360 thiết bị.

### Task 2.3: Tài Sản & Thiết Bị (`/assets`) — Trang Trọng Tâm P0 — [ĐÃ HOÀN TẤT ✅]
- **Tệp tin:** `frontend/src/pages/AssetList.tsx`
- **Baseline chức năng & Hàng rào P0:**
  1. **BẮT BUỘC giữ nguyên `renderCell25()`** giới hạn 25 ký tự trên bảng và tooltip khi rê chuột.
  2. **BẮT BUỘC giữ nguyên logic xuất Excel 100% dữ liệu gốc** không cắt ngắn.
  3. Giữ nguyên modal thêm/sửa, xem mã QR, bàn giao ký điện tử, bộ lọc khoa phòng 36 đơn vị.
- **Cải tiến UI:** Bảng dữ liệu Enterprise hiện đại, phân cách dòng nhẹ nhàng, badge trạng thái màu chuẩn y tế, modal form có sticky header/footer.
- **Kiểm thử:** Rê chuột test tooltip 25 ký tự; Bấm xuất Excel mở file kiểm tra dữ liệu đầy đủ 100%; Kiểm tra lọc theo 36 khoa phòng.

### Task 2.4: Lịch Sử Bàn Giao (`/transfers`) — [ĐÃ HOÀN TẤT ✅]
- **Tệp tin:** `frontend/src/pages/TransferHistory.tsx`
- **Baseline chức năng:** 2 Tab Lịch sử và Bàn giao mới, canvas ký chữ ký điện tử, xuất PDF biên bản, xuất Excel.
- **Cải tiến UI:** Tab pill hiện đại, khung ký tên điện tử sắc nét có nút xóa chữ ký rõ ràng, bảng lịch sử cân đối.
- **Kiểm thử:** Ký thử trên canvas và xuất file PDF.

### Task 2.5: Bảo Trì & Bảo Hành (`/maintenance`) — [ĐÃ HOÀN TẤT ✅]
- **Tệp tin:** `frontend/src/pages/MaintenanceList.tsx`
- **Baseline chức năng:** Danh sách phiếu bảo trì, lọc trạng thái, modal tạo/sửa/hoàn thành phiếu, cập nhật trạng thái máy.
- **Cải tiến UI:** Nhãn tiến độ trực quan, modal nhập chi phí và ngày tháng gọn gàng.
- **Kiểm thử:** Tạo phiếu bảo trì và kiểm tra trạng thái thiết bị tương ứng.

### Task 2.6: Phiếu Đề Nghị Sửa Chữa (`/repair-requests`) — [ĐÃ HOÀN TẤT ✅]
- **Tệp tin:** `frontend/src/pages/RepairRequests.tsx`
- **Baseline chức năng:** Danh sách đề nghị, phân quyền khoa phòng tạo và kỹ thuật tiếp nhận, chuông báo quá hạn.
- **Cải tiến UI:** Huy hiệu mức độ ưu tiên (Khẩn cấp / Bình thường / Thấp), form tạo đề nghị có mô tả sự cố rõ ràng.
- **Kiểm thử:** Tạo đề nghị mới từ tài khoản Staff và tiếp nhận bằng Admin.

### Task 2.7: Kho & Danh Mục (`/categories`) — [ĐÃ HOÀN TẤT ✅]
- **Tệp tin:** `frontend/src/pages/CategoryList.tsx`
- **Baseline chức năng:** Quản lý kho, quản lý danh mục, kiểm tra toàn vẹn CSDL trước khi xóa (chặn xóa nếu có liên kết).
- **Cải tiến UI:** Bố cục thẻ hoặc bảng 2 tab phân minh, hộp thoại xác nhận xóa an toàn.
- **Kiểm thử:** Thử xóa kho có chứa danh mục để kiểm tra thông báo chặn an toàn.

### Task 2.8: Quản Lý Thiết BPy Y Tế (`/equipments`) — [ĐÃ HOÀN TẤT ✅]
- **Tệp tin:** `frontend/src/pages/EquipmentsPage.tsx`
- **Baseline chức năng:** Bảng hồ sơ định mức kỹ thuật 360 thiết bị y tế, lọc phân loại, Import/Export Excel.
- **Cải tiến UI:** Bảng thông số kỹ thuật mật độ cao dễ tra cứu, phân trang chuẩn.
- **Kiểm thử:** Tra cứu máy theo số hiệu và kiểm tra phân trang.

### Task 2.9: Báo Cáo & Thống Kê (`/reports` & `UsageFrequencyTab.tsx`) — Trang Trọng Tâm P0 — [ĐÃ HOÀN TẤT ✅]
- **Tệp tin:** `frontend/src/pages/ReportsPage.tsx`, `frontend/src/pages/UsageFrequencyTab.tsx`
- **Baseline chức năng & Hàng rào P0:**
  1. Tab 1: Thống kê bàn giao thực tế theo 36 khoa phòng.
  2. Tab 2: Ma trận tần suất sử dụng ngày 1-31.
  3. Quy tắc khóa dữ liệu ngày hôm trước sau 23h59 (Staff/Manager chỉ ghi nhận hôm nay, Admin được sửa ngày quá khứ).
  4. Quy tắc Last-write wins: Check nhiều lần ghi nhận lần cuối cùng, cùng Serial + Tên chỉ hiện 1 dòng duy nhất.
  5. Dual mode lọc thời gian và xuất Excel động.
- **Cải tiến UI:** Ma trận ngày hiển thị badge số lượt ngọc xanh sang trọng, highlight cột ngày hôm nay, nút "+ Ghi nhận lượt dùng" nổi bật, bảng số liệu dễ nhìn.
- **Kiểm thử:** Đăng nhập Staff kiểm tra ngày quá khứ bị khóa; đăng nhập Admin kiểm tra quyền sửa; xuất Excel ma trận.

### Task 2.10: Quản Lý Khoa Phòng & Nhân Sự (`/users`) — [ĐÃ HOÀN TẤT ✅]
- **Tệp tin:** `frontend/src/pages/UsersPage.tsx`
- **Baseline chức năng:** Quản lý 36 Khoa, Phòng, Ban chính thức, Import Excel mẫu, Modal danh sách nhân viên khi click vào số lượng nhân sự, Quản lý tài khoản và phân quyền.
- **Cải tiến UI:** Badge nhân sự có thể click rõ ràng, danh sách 36 đơn vị trình bày khoa học, modal tài khoản trực quan.
- **Kiểm thử:** Click vào cột Nhân sự xem modal; thêm/sửa thử 1 khoa phòng và kiểm tra đồng bộ.

### Task 2.11: Cài Đặt & Sao Lưu (`/settings`) — [ĐÃ HOÀN TẤT ✅]
- **Tệp tin:** `frontend/src/pages/Settings.tsx`
- **Baseline chức năng:** Đổi mật khẩu cá nhân, Nút sao lưu ngay SQLite, Danh sách file backup để tải về.
- **Cải tiến UI:** Form đổi mật khẩu bảo mật, danh sách bản backup hiển thị dung lượng và ngày giờ rõ ràng.
- **Kiểm thử:** Bấm nút "Sao lưu ngay" và tải thử file `.db`.


---

## Giai đoạn 3: Kiểm Thử Toàn Diện & Đóng Gói (Phase 7–9) — [ĐÃ HOÀN TẤT ✅]
1. **Kiểm tra hồi quy tự động (Automated Regression Test):** Đã kiểm thử 10/10 module hệ thống qua API backend và database SQLite thực tế, kết quả 100% PASS (HTTP 200).
2. **Biên dịch chuẩn:** Chạy `tsc -b && vite build` hoàn thành 100% không lỗi (exit code 0).
3. **Triển khai chuẩn:** Tự động sao lưu database SQLite sang `backups/backup_20260924_155208.db`, đồng bộ bản build production sang cả 2 thư mục `backend/AssetManagement.WebAPI/wwwroot/` và `wwwroot/`.
4. **Báo cáo hoàn tất:** Đã đồng bộ chi tiết tại `docs/BEFORE_AFTER_CHECKLIST.md`, `docs/UI_UPGRADE_REPORT.md` và `ghinho.md`.


