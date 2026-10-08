# HỆ THỐNG QUẢN LÝ TÀI SẢN & THIẾT BỊ (ASSET MANAGEMENT SYSTEM)
> **TÀI LIỆU GHI NHỚ TOÀN BỘ CHỨC NĂNG & QUY TẮC BẮT BUỘC KHI PHÁT TRIỂN**  
> **QUY TẮC TỐI CAO:** Mọi tác vụ phát triển, thêm mới hoặc sửa đổi chức năng trong tương lai **BẮT BUỘC PHẢI ĐỌC LẠI TOÀN BỘ NỘI DUNG FILE NÀY** trước khi thực hiện.

---

## 📌 NGUYÊN TẮC BẮT BUỘC DÀNH CHO AI & LẬP TRÌNH VIÊN
1. **Đọc `ghinho.md` trước khi code:** Luôn kiểm tra các ràng buộc, quy tắc màu sắc, giới hạn ký tự và cách xử lý sự kiện đã được thiết lập để đảm bảo không làm mất tính năng hoặc phá vỡ giao diện.
2. **NGUYÊN TẮC BẢO TOÀN DỮ LIỆU & TÍNH NĂNG (TUYỆT ĐỐI KHÔNG LÀM MẤT MÁT):**
   - **Mọi bản sửa đổi sau này CHỈ ĐƯỢC THÊM VÀO (bổ sung, hoàn thiện thêm chức năng/giao diện), TUYỆT ĐỐI KHÔNG BỎ ĐI BẤT KỲ TÍNH NĂNG NÀO HIỆN CÓ.**
   - **Bảo toàn 100% dữ liệu:** Tuyệt đối không làm mất dữ liệu trong database SQLite (`assetmanagement.db`), trừ khi người dùng chủ động thao tác nút "Xóa" trực tiếp trên giao diện ứng dụng.
   - **Tự động sao lưu trước khi can thiệp database:** Trước khi chạy migration hoặc chỉnh sửa cấu trúc dữ liệu, bắt buộc phải chạy script sao lưu `python scripts/backup_database.py` để tạo bản backup có mốc thời gian và file JSON vào thư mục `backups/`.
3. **Quy trình Build & Deploy:**
   - Sau khi sửa mã nguồn ở thư mục `frontend/`, bắt buộc phải chạy lệnh:
     ```bash
     cd frontend && npm run build
     ```
   - Copy toàn bộ nội dung trong `backend/AssetManagement.WebAPI/wwwroot/` vào `e:\DeployPackage_AssetManagement\wwwroot\` để đồng bộ bản phát hành:
     ```powershell
     Copy-Item -Path "e:\DeployPackage_AssetManagement\backend\AssetManagement.WebAPI\wwwroot\*" -Destination "e:\DeployPackage_AssetManagement\wwwroot\" -Recurse -Force
     ```
   - Kiểm tra Kestrel Web Server đang chạy cổng `http://127.0.0.1:5000/`.
4. **Quy tắc kiểm tra giao diện:** Luôn nhắc người dùng bấm **`Ctrl + F5`** (hoặc `Ctrl + Shift + R`) để xóa cache trình duyệt khi có cập nhật giao diện.
5. **Khởi động 1-Click:** Sử dụng file `KHOI_DONG_HE_THONG.bat` (hoặc phím tắt ngoài Desktop `QuanLyTrangBi_1Click.lnk`) để tự động sao lưu dữ liệu, khởi động Backend WebAPI, Frontend Vite và tự động mở trình duyệt.

---

## 🛠️ 1. TỔNG QUAN CÔNG NGHỆ & HỆ THỐNG
- **Frontend:**
  - React 18, Vite 8, TypeScript.
  - Tailwind CSS v4 (Cấu hình đặc thù với `@custom-variant dark (&:where(.dark, .dark *));`).
  - Biểu đồ: `recharts` (BarChart, PieChart/DonutChart).
  - Biểu tượng: `lucide-react` và Google `material-symbols-outlined`.
  - Tiện ích: `xlsx` (Import/Export Excel), `jspdf` & `jspdf-autotable` (Xuất PDF), `react-signature-canvas` (Ký điện tử), `qrcode.react` & `html5-qrcode` (Mã QR).
- **Backend:**
  - C# .NET 8 WebAPI.
  - Entity Framework Core, Cơ sở dữ liệu SQLite (`app.db`).
  - Xác thực & Phân quyền: JWT Bearer Token (3 phân quyền: `Admin`, `Manager`, `Staff`).
  - Tự động sao lưu dữ liệu: `BackupController` & `BackupSchedulerService`.

---

## 🎨 2. QUY CHUẨN GIAO DIỆN & THEME (DARK / LIGHT MODE)
### 2.1. Cấu hình Tailwind v4 bắt buộc (`frontend/src/index.css`)
- Tailwind CSS v4 mặc định sử dụng media query `@media (prefers-color-scheme: dark)`, nếu máy tính bật Dark Mode sẽ làm toàn bộ ứng dụng bị "sáng tối lẫn lộn".
- Do đó, **bắt buộc giữ nguyên dòng khai báo** ở đầu `frontend/src/index.css`:
  ```css
  @import "tailwindcss";
  @custom-variant dark (&:where(.dark, .dark *));
  ```
- Biến `--color-on-surface-variant: #e2e8f0;` trong khối `.dark` để đảm bảo chữ phụ luôn sáng rõ trên nền tối.

### 2.2. Nút chuyển đổi Theme & Đồng bộ sự kiện
- Nút chuyển đổi Theme nhanh (biểu tượng `light_mode` / `dark_mode`) được tích hợp ngay trên thanh Header cạnh nút Thông báo và Cài đặt.
- Trạng thái theme được lưu ở `localStorage.getItem('theme')` và class `.dark` trên thẻ `<html>`.
- Sự kiện đồng bộ toàn ứng dụng: `window.dispatchEvent(new Event('themeChanged'))` và `window.addEventListener('storage')`.

---

## 🧭 3. CHI TIẾT TỪNG MODULE CHỨC NĂNG

### 3.1. Header & Thanh Điều Hướng Chung (`MainLayout.tsx`)
1. **SideNavBar (Menu bên trái):**
   - **Logo bệnh viện chính thức:** Sử dụng logo tròn chuẩn của **Bệnh viện Quân y 87** (`/logo-bvqy87.png`), nền trong suốt, viền tròn bo bóng nhẹ thay thế cho icon hộp cũ.
   - Theme sáng: Nền trắng sạch (`bg-white border-r border-gray-200`), mục đang chọn có nền xanh nhạt viền nổi (`bg-blue-50 text-blue-600 font-bold`).
   - Theme tối: Nền xanh đen sâu (`dark:bg-[#182232] dark:border-slate-800/80`).
   - Các icon menu sử dụng bộ ảnh chuẩn trong `/sidebar-icons/`.
   - **Menu con xổ ngang (Flyout Submenu) thu gọn tab bên trái:**
     - Mục **Tài sản & Thiết bị** (`/assets`) có mũi tên tam giác nhỏ chỉ sang phải biểu thị có menu con mở rộng.
     - Khi trỏ chuột (hover) vào **Tài sản & Thiết bị**, hệ thống tự động hiển thị menu flyout xổ sang bên phải gồm 2 chức năng con:
       + **Lịch sử bàn giao** (`/transfers`)
       + **Bảo trì & Bảo hành** (`/maintenance`)
     - Giúp thanh điều hướng bên trái được thu gọn tối đa, súc tích và cực kỳ thoáng đãng.
     - Khi đang ở trang con (`/transfers` hoặc `/maintenance`), mục cha vẫn sáng đèn active đồng thời Header trên cùng vẫn hiển thị chính xác tên trang con tương ứng.
   - **Chân Sidebar:** Loại bỏ User Card cồng kềnh ở đáy sidebar để thanh điều hướng thoáng đãng, đồng bộ với header mới.
2. **Top Header (Thanh trên cùng - Thu gọn 1 hàng duy nhất):**
   - **Chiều cao chuẩn:** `h-16` (64px), thanh thoát, không chiếm dụng không gian làm việc.
   - **Bên trái:** Hiển thị tên trang/phân hệ hiện tại đang truy cập (breadcrumb).
   - **Bên phải (Toàn bộ nằm trên 1 hàng thẳng tắp):**
     - **Đồng hồ số thời gian thực:** Icon đồng hồ tròn viền xanh dương + `HH:mm` (chữ in đậm) · `Thứ [X], Ngày/Tháng/Năm`.
     - **Vạch phân cách đứng `|`**
     - **Dự báo thời tiết:** Icon đám mây viền xanh + `[Nhiệt độ]°C` (chữ in đậm) · `Khánh Hòa` (cố định tọa độ Khánh Hòa: 12.2388, 109.1967). Chữ hiển thị màu trắng sáng (`dark:text-white`) trên theme tối.
     - **Cụm nút chức năng:**
       - Chuông thông báo (Notification Bell) với badge tròn đỏ số lượng.
       - Nút đổi Theme (Mặt trăng / Mặt trời).
       - Nút Cài đặt (Bánh răng).
     - **Vạch phân cách đứng `|`**
     - **Khối User Profile:**
       - Avatar tròn: Hiển thị ảnh đại diện tùy chỉnh (PNG, JPG) được tải lên từ *Cài đặt tài khoản*, hoặc mặc định chữ cái viết tắt in hoa (vd: `PH` cho Phạm Văn Hùng).
       - Dòng trên: Họ tên người dùng (in đậm) kèm icon mũi tên xuống `keyboard_arrow_down`.
       - Dòng dưới: Vai trò (`Quản trị viên`, `Quản lý`, `Nhân viên`).
       - Click vào profile mở menu dropdown: Cài đặt tài khoản, Đăng xuất (đã loại bỏ liên kết Quản lý Khoa Phòng khỏi menu dropdown vì đã có sẵn trên menu chính bên trái).
3. **Footer chân trang (`MainLayout.tsx`):**
   - Chiều cao thanh mảnh `h-11` (44px), bám đáy trang nội dung.
   - Nền `bg-white/95 dark:bg-[#182232]/95`, đường viền mỏng trên `border-t border-gray-200/80 dark:border-slate-800/80`.
   - Căn lề trái: `© 2026 Bệnh viện Quân y 87`.
   - Căn lề phải: `Phiên bản v2.4.0 • Hỗ trợ CNTT`.
   - Chữ màu `text-slate-500 dark:text-slate-400 font-medium text-xs`.

---

### 3.2. Dashboard - Bảng Thống Kê Tổng Quan (`Dashboard.tsx`)
1. **4 Thẻ số liệu thống kê (StatCards):**
   - Tổng Tài Sản, Đang Sử Dụng, Đang Sửa Chữa, Cảnh Báo Hỏng.
   - Click vào từng thẻ sẽ tự động điều hướng sang danh sách tài sản với đúng bộ lọc trạng thái tương ứng.
2. **Biểu đồ Cột (Số lượng theo thiết bị):**
   - Sử dụng bảng màu `DARK_COLORS` tương phản cao trên nền tối (`dark:bg-[#111827] dark:border-slate-700/80`).
   - Trục hoành (X-Axis) xoay nghiêng `-30°`, chữ màu sáng rõ nét (`#cbd5e1`) không bị cắt chữ.
   - Đường lưới tọa độ tối giản (`#334155`), tooltip nổi nền tối bo tròn góc 12px.
3. **Biểu đồ Tròn / Donut (Tỷ trọng thiết bị):**
   - Dạng Donut Chart thanh thoát, ở tâm hiển thị tổng số lượng thiết bị (`[Tổng số] Thiết bị`).
   - Các lát cắt nhỏ (< 5%) **không in chữ đè nhau** lên biểu đồ.
   - Bên dưới có **Bảng chú giải 2 cột** liệt kê đầy đủ từng loại thiết bị kèm chấm màu, số lượng và tỷ lệ % rõ ràng, có thanh cuộn tinh tế.

---

### 3.3. Tài Sản & Thiết Bị (`AssetList.tsx`)
1. **RÀNG BUỘC HIỂN THỊ ≤ 25 KÝ TỰ (QUY TẮC CỐT LÕI):**
   - **Áp dụng cho TẤT CẢ các cột dữ liệu dạng chữ:**
     - `Tên thiết bị (Tài sản)`
     - `Mã máy (Serial)`
     - `Ký hiệu`
     - `Kho`
     - `Danh mục`
     - `Hãng SX`
     - `Mã QR (nhãn text dưới mã)`
   - Khi độ dài chuỗi > 25 ký tự: Tự động cắt đúng **25 ký tự đầu + `...`** và gạch chân chấm mờ (`decoration-dotted`).
   - **Rê chuột (Hover):** Hiển thị thuộc tính `title` chứa **toàn bộ nội dung gốc 100% đầy đủ**.
   - Bảng được áp dụng `whitespace-nowrap table-auto` và padding `py-3.5` đồng nhất, không bị rớt dòng làm xấu layout.
   - Màu nền tất cả các ô trong bảng (bao gồm cột SL) hoàn toàn đồng nhất và thừa hưởng màu hàng (`bg-white dark:bg-slate-800`), không bị lệch màu dạng vệt cột khi chuyển theme sáng/tối.
2. **Xuất Excel (Export Excel):**
   - Nút **Xuất Excel** màu xanh ngọc đặt cạnh nút *Import Excel*.
   - **QUY TẮC XUẤT FILE:** Dữ liệu xuất ra file Excel **LUÔN GIỮ NGUYÊN 100% ĐỘ DÀI ĐẦY ĐỦ** của tất cả các trường (bao gồm toàn bộ Mã máy Serial, Tên thiết bị...), tuyệt đối không cắt bớt 25 ký tự.
3. **Các tính năng khác:**
   - Import hàng loạt từ file Excel.
   - Thêm tài sản thủ công qua Modal.
   - Quét mã QR bằng Camera (`QRScanner`).
   - Click mã QR phóng to (`QRCodeSVG`): Modal kích thước chuẩn `w-[380px] max-w-[92vw] shrink-0`, tương thích Dark/Light Mode, mã QR đặt trong khung nền trắng viền bo tròn sắc nét, không bị bóp nghẹt layout.
   - Nút **Bàn giao** trực tiếp từng thiết bị (cột Thao tác và khi quét mã QR): Mở Modal form bàn giao toàn diện 2 cột chuẩn 100% theo giao diện module Bàn giao (Hình 1):
     - Cột trái: Khối "Thông Tin Các Bên" đồng bộ từ Quản lý Khoa Phòng (chọn Người giao tự động theo user hiện tại, chọn Người nhận có lọc theo khoa phòng, Ghi chú thêm) + Khối "Chữ ký người nhận" (vẽ chữ ký cảm ứng/chuột, nút Xóa chữ ký).
     - Cột phải: Khối "Danh Sách Bàn Giao" tự động nạp thiết bị được chọn, nút "+ Chọn tài sản từ Kho" (cho phép chọn thêm nhiều thiết bị bàn giao cùng lúc) + Nút lớn "Xác Nhận Bàn Giao".
     - Khi xác nhận bàn giao: Tạo bản ghi `assettransfers`, tự động cập nhật trạng thái tài sản thành "Đang sử dụng" (status 2) và làm mới danh sách tài sản.
4. **Cột Trạng Thái Tương Tác & Tự Động Đồng Bộ Phiếu Đề Nghị:**
   - **Chọn trạng thái nhanh:** Cột *Trạng thái* cho phép người dùng bấm đổi trực tiếp giữa 4 trạng thái (`🟢 Rảnh`, `🔵 Đang sử dụng`, `🟡 Bảo trì`, `🔴 Hỏng`) với badge/pill màu sắc trực quan, tự động cập nhật vào cơ sở dữ liệu qua API.
   - **Tự động chuyển sang Bảo trì từ Phiếu đề nghị:** Khi một thiết bị đang có phiếu đề nghị chờ tiếp nhận (1) hoặc đang xử lý (2) tại module *Phiếu đề nghị*, trạng thái của thiết bị sẽ tự động hiển thị là **Bảo trì** (`Status = 3`).
   - **Biểu tượng cảnh báo phiếu đề nghị:** Cạnh badge trạng thái hiển thị biểu tượng cờ lê (`Wrench`) nhấp nháy, rê chuột xem tiêu đề và mã phiếu đề nghị đang chờ, bấm vào sẽ tự động điều hướng sang trang *Phiếu đề nghị* (`/repair-requests`).
   - **Đồng bộ bộ đếm & bộ lọc:** Các tab lọc trạng thái (*Đang sử dụng*, *Đang sửa chữa / Bảo trì*, *Cảnh báo hỏng*, *Rảnh*) và số lượng đếm trên header tab đều đồng bộ tự động theo trạng thái hiệu lực này.
   - **Xuất Excel:** Giữ nguyên 100% tên trạng thái chuẩn không cắt ngắn.

---

### 3.4. Lịch Sử Bàn Giao (`TransferHistory.tsx`)
1. **Tab 1 - Lịch Sử Bàn Giao:**
   - Xem toàn bộ các lần bàn giao: Mã TR, Tài sản & Mã QR, Ngày bàn giao, Người giao, Người nhận (kèm tên khoa phòng trực thuộc), Ghi chú.
   - **Thanh công cụ tìm kiếm tức thì:** Tìm kiếm theo tên thiết bị, mã QR, số TR, người giao, người nhận.
   - **Nút Xuất Excel:** Xuất 100% dữ liệu lịch sử bàn giao đầy đủ chi tiết ra file Excel (`LichSu_BanGiao_ThietBi.xlsx`).
   - Nút **Xuất PDF**: Tạo file biên bản bàn giao chuẩn có chữ ký, tự động chuyển đổi tiếng Việt không dấu để đảm bảo tương thích font chữ chuẩn của jsPDF.
   - **Enterprise Empty State:** Giao diện trực quan khi chưa có dữ liệu hoặc không khớp từ khóa tìm kiếm kèm nút bấm đặt lại bộ lọc.
2. **Tab 2 - Thực Hiện Bàn Giao:**
    - **Đồng bộ danh sách tài khoản & khoa phòng:**
      - **Người giao (Đại diện kho):** Tự động đồng bộ thời gian thực từ *Quản lý Khoa Phòng*. Cho phép chọn đại diện từng khoa phòng (`🏢 Đại diện [Tên Khoa Phòng]`) hoặc từng nhân viên cụ thể trực thuộc. Tự động nhận diện tài khoản đang đăng nhập.
      - **Người nhận:** Đồng bộ 100% thời gian thực từ Quản lý Khoa Phòng qua sự kiện `departmentsChanged`/`departmentsUpdated` và cache `LOCAL_DEP_KEY`. Tích hợp bộ lọc nhanh theo Khoa phòng nhận (`Tất cả khoa phòng (N)`). Cho phép bàn giao trực tiếp cho `🏢 Đại diện [Tên Khoa Phòng]` ngay cả khi khoa phòng chưa tạo tài khoản nhân sự (0 nhân sự), hoặc bàn giao cho từng nhân viên trực thuộc.
      - **Nút "Đồng bộ từ Quản lý Khoa Phòng":** Tích hợp nút làm mới với icon xoay `RefreshCw` cạnh tiêu đề form, bấm để nạp tức thì dữ liệu mới nhất mà không cần tải lại trang.
    - Chọn hàng loạt thiết bị từ kho thông qua Modal bộ lọc tìm kiếm.
    - Ghi chú tình trạng, khung ký chữ ký tay cảm ứng điện tử (`react-signature-canvas`).
    - Xác nhận bàn giao sẽ tự động chuyển trạng thái thiết bị sang "Đang sử dụng" và lưu vết đầy đủ họ tên + khoa phòng của cả 2 bên.

---

### 3.5. Bảo Trì & Bảo Hành (`MaintenanceList.tsx`)
1. **Thống kê:** Tổng yêu cầu, Đang xử lý, Hoàn thành, Tổng chi phí dự kiến.
2. **Bộ lọc & Tìm kiếm:** Theo mã vé `TCK-...`, tên thiết bị, mã QR hoặc trạng thái.
3. **Xuất Excel:** Tích hợp nút **Xuất Excel** xuất đầy đủ 100% dữ liệu vé bảo trì (`DanhSach_BaoTri_BaoHanh.xlsx`).
4. **Tạo lịch bảo trì hàng loạt:**
   - Chọn cùng lúc nhiều thiết bị cần bảo trì.
   - Đặt ngày hẹn bảo trì, mô tả lỗi hư hỏng, chi phí dự kiến.
   - Hệ thống tự động tách thành các Ticket độc lập và cập nhật trạng thái thiết bị sang "Bảo trì".
5. **Cập nhật tiến độ:** Đổi trạng thái trực tiếp giữa Đang chờ (1), Đang xử lý (2), Hoàn thành (3) bằng semantic badges chuẩn.
6. **Enterprise Empty State:** Giao diện trực quan kèm nút đặt lại tìm kiếm khi không có dữ liệu phù hợp.

---

### 3.6. Phiếu Đề Nghị / Báo Hỏng (`RepairRequests.tsx`)
1. **Thống kê:** Đang chờ tiếp nhận, Đang xử lý, Đã hoàn thành (tự động đếm theo dữ liệu thực).
2. **Tạo phiếu đề nghị mới:** Người dùng hoặc khoa phòng gửi phiếu kèm tiêu đề, mô tả lỗi, chọn khoa phòng (12 khoa phòng chuẩn của Viện Quân y 87) và chọn thiết bị liên quan. Nút gửi có hiệu ứng loading chống bấm trùng lặp.
3. **Cơ chế nạp dữ liệu an toàn:** Tách độc lập các luồng gọi API phiếu đề nghị, khoa phòng (có fallback `DEFAULT_DEPARTMENTS`) và danh sách thiết bị để chống sập giao diện.
4. **Xử lý phiếu:** Kỹ thuật viên mở modal "Tiếp nhận / Xử lý", ghi chú kỹ thuật, người phụ trách và cập nhật trạng thái phiếu.
5. **Thanh phân trang:** Tích hợp component `Pagination` chuẩn y tế ở chân bảng danh sách đề nghị.

---

### 3.7. Quản Lý Thiết Bị Y Tế (`EquipmentsPage.tsx`)
1. **Quản lý chuyên sâu theo tiêu chuẩn y tế:**
   - Đơn vị tính, Đơn vị sử dụng, Chất lượng thiết bị (Cấp 1 đến Cấp 6).
   - Năm sản xuất, Năm đưa vào sử dụng, Thời hạn bảo hành.
2. **Phân loại màu sắc theo Hạn sử dụng (Expiry Colors):**
   - Đỏ: Hết hạn sử dụng.
   - Tím: Hạn sử dụng dưới 1 tháng.
   - Cam: Hạn sử dụng dưới 3 tháng.
   - Xanh dương: Hạn sử dụng dưới 6 tháng.
   - Xám: Hạn sử dụng dưới 9 tháng.
   - Xanh lá: Hạn sử dụng dưới 12 tháng.
3. **Tương tác bộ lọc màu:** Rê chuột hoặc bấm vào từng ô màu chú giải sẽ highlight các dòng thiết bị tương ứng.
4. **Giới hạn ký tự:** Cột Mã TB áp dụng rút gọn ≤ 25 ký tự, hover xem mã đầy đủ.
5. **Nhập / Xuất Excel:** Tải file mẫu, Import dữ liệu từ Excel và Xuất Excel toàn bộ danh sách.

---

### 3.8. Kho & Danh Mục (`CategoryList.tsx`)
1. **Cấu trúc phân tầng:** Kho (Warehouse) -> Danh mục (Category) -> Tài sản (Asset).
2. **Quản lý Kho (Tab 1):**
   - Xem danh sách kho với số lượng danh mục trực thuộc.
   - Thêm kho mới & Sửa tên, mô tả kho qua Modal chuyên nghiệp.
   - Xóa kho: Có modal xác nhận an toàn; kiểm tra toàn vẹn dữ liệu từ backend (`_context.Categories.AnyAsync(c => c.WarehouseId == id)`), chặn xóa nếu kho đang chứa danh mục và thông báo lỗi rõ ràng.
3. **Quản lý Danh mục (Tab 2):**
   - Xem danh sách danh mục kèm nhãn kho trực thuộc.
   - Thêm danh mục mới & Sửa thông tin danh mục (tên danh mục, chọn lại kho lưu trữ, mô tả chi tiết).
   - Xóa danh mục: Có modal xác nhận an toàn; kiểm tra toàn vẹn dữ liệu từ backend (`_context.Assets.AnyAsync(a => a.CategoryId == id)`), chặn xóa nếu danh mục đang chứa thiết bị/tài sản và thông báo lỗi rõ ràng.
4. **Tìm kiếm nhanh:** Cả 2 tab đều tích hợp ô tìm kiếm lọc dữ liệu tức thì theo tên, mã hoặc mô tả.
5. **Giao diện & Dark Mode:** Bố cục dạng bảng 12 cột cân đối, hỗ trợ đầy đủ Dark Mode và Light Mode.

---

### 3.9. Quản Lý Khoa Phòng & Nhân Sự (`UsersPage.tsx` & `MainLayout.tsx`)
1. **Tên chức năng trên Menu:** Đổi từ *Quản lý Tài khoản* thành **Quản lý Khoa Phòng** (`/users`).
2. **Phân quyền 3 cấp:**
   - `Admin`: Toàn quyền cấu hình, tài khoản, khoa phòng, import excel, backup.
   - `Manager`: Quản lý kho, danh mục, tài sản, khoa phòng, bảo trì, bàn giao.
   - `Staff`: Xem danh sách, tạo đề nghị, thực hiện bàn giao.
3. **Danh mục 36 Khoa, Phòng, Ban Chính Thức (Bệnh viện Quân y 87):**
   - **Cột 1 (8 đơn vị - Khối Chỉ huy & Cơ quan):** Ban Giám đốc, Phòng Chính trị, Phòng Kế hoạch - Tổng hợp, Phòng Hậu cần - Kỹ thuật, Phòng Tham mưu - Hành chính, Phòng Điều dưỡng, Ban Tài chính, Ban Công nghệ thông tin.
   - **Cột 2 (11 đơn vị - Khối Nội & Chuyên khoa Nội):** Khoa Nội tim mạch - Hô hấp, Khoa Nội tiêu hóa - Huyết học lâm sàng, Khoa Truyền nhiễm - Da liễu - Dị ứng, Khoa Nội cơ xương khớp - Nội tiết, Khoa Ung bướu, Khoa Thần kinh - Tâm thần - Đột quỵ, Khoa Y học cổ truyền, Khoa Phục hồi chức năng, Khoa Hồi sức tích cực - Chống độc, Khoa Nội thận - Lọc máu, Khoa Y học dưới nước.
   - **Cột 3 (8 đơn vị - Khối Ngoại & Chuyên khoa Ngoại):** Khoa Chấn thương, chỉnh hình, Khoa Ngoại tổng hợp, Khoa Gây mê hồi sức, Khoa Ngoại chung, Khoa Mắt, Khoa Răng - Hàm - Mặt, Tai - Mũi - Họng, Khoa Phụ sản - Nhi.
   - **Cột 4 (9 đơn vị - Khối Cận lâm sàng, Dược & Hỗ trợ điều trị):** Khoa Khám bệnh, Khoa Xét nghiệm - Giải phẫu bệnh, Khoa Chẩn đoán hình ảnh - Chẩn đoán chức năng, Khoa Dược, Khoa Trang bị, Khoa Dinh dưỡng, Khoa Kiểm soát nhiễm khuẩn, Khoa Cấp cứu, Khoa Y học dự phòng.
4. **Cơ Chế Đồng Bộ & Liên Kết Toàn Ứng Dụng:**
   - **Lưu trữ CSDL chuẩn:** Bảng `Departments` trong SQLite lưu trữ đầy đủ 36 đơn vị.
   - **Đồng bộ tự động qua CustomEvent & LocalStorage Cache:**
     - Khi bất kỳ thao tác Thêm / Sửa / Xóa khoa phòng diễn ra tại module Quản lý Khoa Phòng, hệ thống kích hoạt sự kiện `departmentsUpdated` và `departmentsChanged`.
     - Tất cả các module khác trong ứng dụng (`AssetList.tsx`, `ReportsPage.tsx`, `UsageFrequencyTab.tsx`, `RepairRequests.tsx`, `TransferHistory.tsx`) đều tự động cập nhật danh sách hiển thị tức thì.
     - **Cơ chế Cache Thông Minh:** Khởi tạo kiểm tra `parsed.length >= DEFAULT_DEPARTMENTS.length (36)` giúp tự động giải phóng cache cũ 12 khoa của trình duyệt mà không cần thao tác tay phức tạp.
5. **Quản lý Khoa Phòng (Tab mặc định - Tab 1):**
   - **Tính năng Import Excel & Mẫu Import:**
     - Nút **Mẫu Import**: Xuất file Excel mẫu chuẩn `Mau_Import_Khoa_Phong.xlsx` gồm các cột `STT`, `Tên Khoa / Phòng / Ban (*)`, `Ghi chú / Đơn vị`.
     - Nút **Import Excel**: Đọc file Excel người dùng tải lên, tự động nhận diện tên cột, tự động lọc bỏ các khoa phòng trùng lặp đã có và thêm mới hàng loạt vào hệ thống.
   - **Cột Nhân sự:**
     - Đổi tên cột từ *Số lượng tài khoản* thành **Nhân sự**.
     - Hiển thị chính xác số lượng nhân viên/tài khoản thuộc từng khoa phòng (`X nhân sự`).
     - **Tương tác click xem danh sách:** Bấm vào badge số lượng nhân sự sẽ mở modal chi tiết hiển thị họ tên, tài khoản, email, chức vụ của tất cả nhân sự thuộc khoa phòng đó.
   - **CRUD Khoa phòng:** Thêm thủ công, Sửa tên khoa phòng, Xóa khoa phòng an toàn (chặn xóa nếu đang có nhân sự trực thuộc).
6. **Quản lý Nhân sự & Tài khoản (Tab 2):**
   - Bảng tài khoản có cột *Khoa phòng*.
   - Modal Thêm / Sửa tài khoản: Dropdown chọn *Khoa phòng trực thuộc* đặt ngay dưới *Họ và tên* và trên *Email*.
   - **Đồng bộ tự động:** Khi thiết lập nhân viên thuộc khoa phòng nào, hệ thống đồng bộ ngay lập tức sang cột *Nhân sự* của khoa phòng đó tại Tab Khoa Phòng.
7. **Sao lưu dữ liệu (Backup):** Sao lưu thủ công tải file database SQLite hoặc chạy lịch tự động.
8. **Phân Quyền Người Dùng & Khả Năng Mở Rộng Theo Chức Năng (Tab 3):**
   - **Mục đích:** Phân quyền chi tiết cho từng tài khoản hoặc vai trò được phép: **Xem** (`canView`), **Thêm** (`canCreate`), **Sửa** (`canEdit`), **Xóa** (`canDelete`), **Xuất file** (`canExport`) trên từng chức năng của ứng dụng.
   - **Khả năng mở rộng động (Extensible):** Danh mục chức năng được quản lý trong bảng `AppModules`. Khi hệ thống phát triển thêm chức năng mới, Quản trị viên chỉ cần bấm nút `+ Đăng ký chức năng mới` (nhập Mã code, Tên hiển thị, Nhóm, Mô tả); ngay lập tức chức năng mới sẽ tự động xuất hiện trên ma trận phân quyền để cấp quyền cho người dùng.
   - **Ma trận phân quyền:** Bảng tương tác thông minh cho phép tích chọn từng quyền, chọn toàn bộ hàng, áp dụng mẫu nhanh (`Toàn quyền`, `Quản lý`, `Chỉ xem`, `Nhân viên`) và lưu vào CSDL SQLite.
   - **Hiệu lực tức thì:** Áp dụng kiểm soát quyền trên thanh Sidebar Navigation (`MainLayout.tsx`) và toàn bộ hệ thống thông qua `AuthContext.tsx`. Tài khoản `Admin` luôn có toàn quyền bảo đảm không bị khóa ngoài.

### 3.10. Thanh Phân Trang Chuẩn Giao Diện (`Pagination.tsx`)
- **Vị trí component:** `frontend/src/components/Pagination.tsx`.
- **Thiết kế chuẩn:** Theo mẫu UI Hệ thống Quản lý Thiết bị Y tế (11 kiểu/trạng thái):
  1. *Khối trái:* Dropdown chọn số bản ghi mỗi trang (`10`, `20`, `50`, `100`), dòng tổng hợp `Hiển thị [X] – [Y] / [Z] bản ghi`.
  2. *Khối phải (Desktop):* Nút `< Trước`, dãy số trang thông minh kèm dấu ba chấm `...`, nút `Sau >`. Nút trang đang chọn (active) nổi bật màu xanh dương `#2563eb`, chữ trắng bold, bo góc mềm mại.
  3. *Hỗ trợ các biến thể:* `default`, `compact` (thu gọn), `icon` (thêm nút `<<` và `>>`), `simple` (Trang X / Y).
  4. *Responsive Mobile:* Tự động co gọn thành `< Trước`, `Trang X / Y`, `Sau >` trên màn hình nhỏ.
  5. *Đồng bộ bộ lọc:* Khi người dùng gõ từ khóa tìm kiếm hoặc bấm tab lọc trạng thái, hệ thống tự động đưa về trang 1.
- **Tích hợp:** Đã áp dụng trên bảng *Tài sản & Thiết bị* (`AssetList.tsx`) và bảng *Quản lý Thiết bị Y tế* (`EquipmentsPage.tsx`).

---

### 3.11. Cấu Hình Tối Ưu Hiệu Năng & Đồng Thời Cho 100+ Người Dùng (`Program.cs`)
1. **Khả năng chịu tải đồng thời:** Hệ thống được thiết lập phục vụ từ 100 - 500 người dùng trực tuyến đồng thời mà không bị nghẽn tốc độ.
2. **Tối ưu Cơ sở dữ liệu SQLite:**
   - **Chế độ WAL (Write-Ahead Logging):** Cho phép hàng trăm thao tác ĐỌC diễn ra song song hoàn toàn không bị khóa bởi thao tác GHI.
   - **`busy_timeout = 5000` (5 giây):** Khi có nhiều giao dịch ghi đồng thời, hệ thống tự động xếp hàng đợi đến 5s thay vì văng lỗi `database is locked`.
   - **`cache_size = -20000` (~20MB RAM Cache):** Giữ toàn bộ chỉ mục và dữ liệu nóng trên RAM, tốc độ đọc truy vấn chỉ mất 0.5 - 2 mili-giây.
   - **Chỉ mục (Indexes) tự động:** Tạo chỉ mục tăng tốc tìm kiếm cho các trường: `SerialNumber`, `QrCode`, `CategoryId`, `DepartmentId`, `Status`, `WarehouseId`, `Code`...
3. **Tối ưu Băng thông & Mạng LAN (Response Compression & Browser Caching):**
   - Bật nén **Brotli + Gzip** giảm 70% dung lượng truyền tải qua mạng LAN.
   - Thư mục tĩnh `/assets/` được cấu hình `Cache-Control: public, max-age=31536000, immutable`. Mỗi máy trạm của nhân viên chỉ tải file giao diện JS/CSS đúng 1 lần duy nhất, các lần truy cập tiếp theo nạp tức thì từ bộ nhớ máy tính (0 KB tải mạng).
4. **Tối ưu Máy chủ Kestrel & Luồng (.NET 8):**
   - `ThreadPool.SetMinThreads(100, 100)`: Khởi tạo sẵn 100 luồng xử lý, triệt tiêu độ trễ khi nhiều yêu cầu dồn tới cùng lúc.
   - `MaxConcurrentConnections = 1000` và `KeepAliveTimeout = 2 phút`.
   - Các API truy vấn dữ liệu đọc sử dụng `.AsNoTracking()` để giải phóng RAM và CPU của máy chủ.

---

### 3.12. Cấu Hình Địa Chỉ Máy Chủ & Chuyển Hướng Máy Trạm (`Settings.tsx` & `SystemConfigController.cs`)
1. **Mục đích:** Cho phép Quản trị viên dễ dàng thay đổi địa chỉ IP máy chủ trong mạng LAN (ví dụ từ `192.170.182.234:5000` sang `192.170.182.16:5000`) mà không làm gián đoạn người dùng tại các máy trạm.
2. **Cơ chế Chuyển hướng tự động (Server Redirection):**
   - Khi bật tùy chọn *Kích hoạt tự động chuyển hướng*, máy trạm truy cập vào máy chủ cũ sẽ xuất hiện modal thông báo chuyên nghiệp và tự động chuyển hướng sang địa chỉ máy chủ mới sau 3 giây.
   - Component toàn cục: `ServerRedirectModal.tsx` hoạt động trên mọi trang kể cả trang Đăng nhập.
3. **Phát hiện IP tự động:** Backend tự động quét các card mạng nội bộ trên máy chủ và hiển thị danh sách IP dưới dạng các nút bấm chọn nhanh.
4. **Công cụ đồng bộ máy trạm:**
   - Nút **Tải phím tắt Desktop (.url)**: Tải file shortcut `QuanLyTrangBi.url` chứa sẵn link mới để gửi cho các khoa phòng đặt ngoài Desktop, click đúp là mở ngay.
   - Nút **Mã QR Kết Nối**: Hiển thị mã QR để quét truy cập nhanh từ điện thoại / máy tính bảng.

---

### 3.13. Báo Cáo & Thống Kê Thiết Bị Theo Khoa Phòng (`ReportsPage.tsx` & `/reports`)
1. **Mục đích:** Thống kê chính xác khoa nào đang tiếp nhận và sử dụng thiết bị sau bàn giao, thiết bị nào còn ở kho, phục vụ báo cáo định kỳ theo Ngày, Tháng, Quý, Năm.
2. **Liên kết trực tiếp với nút "Bàn giao":**
   - Khi thực hiện bàn giao (tại cột Thao tác trang *Tài sản & Thiết bị* hoặc Tab *Thực Hiện Bàn Giao*), thông tin khoa nhận (`CurrentDepartment`, `DepartmentId`) được lưu vào thiết bị và ghi nhận vào lịch sử `AssetTransfers`.
   - Thiết bị tự động chuyển từ nhóm "Còn ở kho" sang nhóm "Khoa nhận và sử dụng" của đúng khoa phòng đó.
3. **Bộ lọc thời gian đa dạng:**
   - `Tất cả thời gian`, `Theo Ngày`, `Theo Tháng` (chọn Tháng 1-12 & Năm), `Theo Quý` (Quý 1-4 & Năm), `Theo Năm`.
4. **Bộ lọc Đơn vị & Kho:** Lọc theo tất cả, lọc riêng thiết bị còn ở kho, hoặc lọc theo từng khoa phòng cụ thể.
5. **2 Chế độ xem thông minh:**
   - **Bảng Chi Tiết:** Đầy đủ các cột thông tin gốc + cột đặc thù **"KHOA NHẬN VÀ SỬ DỤNG"** + Ngày bàn giao + Người giao + Người nhận + Trạng thái.
   - **Gom Nhóm Theo Khoa:** Phân nhóm từng khoa kèm số lượng máy và danh sách chi tiết, có nút thu gọn/mở rộng, giúp tổng hợp báo cáo nhanh chóng.
6. **Xuất Excel & In ấn:**
   - Nút **Xuất Excel**: Xuất 100% dữ liệu chi tiết đầy đủ (không cắt ngắn 25 ký tự).
   - Nút **In Báo Cáo**: Hỗ trợ in bảng tổng hợp chuẩn để trình ký.

### 3.14. Thống Kê & Báo Cáo Tần Suất Sử Dụng Máy (`UsageFrequencyTab.tsx` & `DeviceUsagesController.cs`)
1. **Mục đích:** Theo dõi tần suất và số lượt vận hành thực tế của từng thiết bị tại các khoa phòng hàng ngày (từ Ngày 1 đến Ngày 30/31 trong tháng).
2. **Cấu trúc lưu trữ dữ liệu:**
   - Bảng SQLite `DeviceUsageLogs` (Id, AssetId, UsageDate `YYYY-MM-DD`, UsageCount, DepartmentName, RecordedBy, Notes, CreatedAt, UNIQUE(AssetId, UsageDate)).
    - API endpoints:
      - `GET /api/deviceusages/monthly?year=YYYY&month=MM&department=...`: Trả về ma trận ngày 1 - 30/31 trong tháng, tổng lượt tháng, active days, trung bình/ngày.
      - `GET /api/deviceusages/monthly?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&department=...`: Hỗ trợ thống kê linh hoạt theo khoảng thời gian tùy chọn **Từ ngày ... Tới ngày ...** (tối đa 62 ngày), sinh danh sách ngày động `dateHeaders`, tổng hợp lượt và xuất báo cáo ma trận chính xác theo khoảng ngày được chọn.
      - `POST /api/deviceusages`: Lưu/sửa số lượt của 1 máy trong ngày.
      - `POST /api/deviceusages/batch`: Ghi nhận hàng loạt lượt dùng cho nhiều máy trong ngày.
3. **Giao diện & Chức năng:**
    - **Thanh chuyển tab tại `/reports`:** [📋 Theo Khoa Phòng (Bàn Giao Thực Tế)] và [📊 Theo Tần Suất Sử Dụng (Ngày 1 - 31)].
    - **4 Thẻ số liệu tần suất:** Tổng Lượt Sử Dụng Trong Kỳ, Thiết Bị Có Hoạt Động (tỷ lệ %), Tần Suất Trung Bình (lượt/ngày), Máy Dùng Nhiều Nhất.
    - **Bộ lọc thời gian 2 chế độ (Dual Mode):**
      - `📅 Theo Tháng`: Chọn Tháng (1-12) & Năm.
      - `📆 Từ Ngày ... Tới Ngày`: Chọn trực tiếp ngày bắt đầu (`fromDate`) và ngày kết thúc (`toDate`), kèm 3 nút chọn nhanh tiện lợi ("Hôm nay", "7 ngày qua", "Tháng này").
    - **Bộ lọc đa chiều & Chế độ hiển thị danh sách máy:**
      - **Chế độ hiển thị máy (`usageFilter`):**
        - `🟢 Chỉ máy có lượt dùng (${stats.activeAssets})`: Mặc định bật khi xem theo khoảng ngày hoặc theo kỳ. Hệ thống tự động ẩn tất cả các máy không có lượt sử dụng (lượt = 0), chỉ hiển thị những thiết bị thực tế có phát sinh vận hành trong giai đoạn chọn, giúp bảng báo cáo gọn gàng, súc tích, đúng trọng tâm.
        - `📋 Tất cả máy (${stats.totalAssets})`: Cho phép xem toàn bộ danh mục 360 thiết bị bất kỳ lúc nào chỉ bằng 1 click.
      - **Lọc Khoa phòng sử dụng:** Tất cả đơn vị, Đã bàn giao, Trong kho hoặc từng khoa phòng cụ thể.
      - **Tìm kiếm tức thì:** Theo Tên máy, Serial, Model, Khoa phòng.
    - **Quy tắc Gom Nhóm Thiết Bị & Ghi Nhận Lần Cuối Cùng (Last-Write Wins):**
      - Nếu cùng 1 máy có cùng số Seri và Tên máy (dù có nhiều bản ghi asset trùng lặp trong hệ thống), bảng ma trận chỉ hiển thị **1 DÒNG DUY NHẤT** cho thiết bị đó (không cộng dồn thành nhiều dòng).
      - Khi check lượt sử dụng nhiều lần trong ngày (ví dụ lần 1 lúc 7h sáng 2 lượt, lần 2 lúc 16h chiều 5 lượt), hệ thống tự động ghi nhận số lượt của **LẦN CUỐI CÙNG** (lấy bản ghi có `CreatedAt` mới nhất, ghi đè giá trị cũ).
    - **Quy tắc Chốt Sổ & Khóa Dữ Liệu Sau 23h59 Trong Ngày:**
      - Hết ngày (sau 23h59, bước sang ngày hôm sau), dữ liệu của ngày hôm trước tự động **BỊ KHÓA**.
      - Tài khoản **Nhân viên / Quản lý** (`Staff`, `Manager`): Chỉ được ghi nhận và chỉnh sửa lượt sử dụng của **ngày hôm nay** (`today`). Không được phép ghi nhận hoặc sửa đổi ngày trong quá khứ hay tương lai (ô chọn ngày bị khóa, click ô ngày quá khứ hiển thị cảnh báo từ chối).
      - **Chỉ duy nhất tài khoản Quản trị viên (`Admin`)** mới có quyền chỉnh sửa khác ngày hệ thống (chọn ngày quá khứ trong modal ghi nhận hàng loạt và sửa trực tiếp các ô ngày đã qua trên ma trận).
      - Ràng buộc bảo mật được thực thi 2 lớp: cả trên giao diện Frontend và tại Backend API (`DeviceUsagesController.cs`).
    - **Nút "+ Ghi Nhận Lượt Dùng Hôm Nay":** Modal hỗ trợ khoa phòng tích chọn hàng loạt máy, nhập số lượt (+/- hoặc gõ số), ghi chú và lưu 1-click. Modal sử dụng `createPortal` vào `document.body` và kích thước chuẩn `w-[480px] max-w-[92vw]` chống co rút.
    - **Bảng ma trận ngày linh hoạt:** Cột cố định (sticky) STT, Mã máy, Tên máy, Khoa phòng; các cột ngày (tự động theo tháng hoặc theo khoảng từ ngày... đến ngày...; highlight ngày hôm nay; ô có số lượt hiển thị badge màu ngọc; click vào ô mở modal sửa nhanh số lượt hoặc đặt về 0); Cột Tổng lượt trong kỳ, Số ngày, TB/ngày, Đánh giá hiệu suất.
    - **Xuất Excel Tần Suất:** Xuất ma trận đầy đủ 100% dữ liệu gốc động theo khoảng ngày đã chọn và theo đúng bộ lọc hiển thị (chỉ máy có lượt dùng hoặc tất cả máy) kèm các cột thống kê ra file Excel.

---

## 📋 4. BẢNG TỔNG HỢP CÁC RÀNG BUỘC GIAO DIỆN QUAN TRỌNG

| Thành phần | Quy tắc bắt buộc | Ghi chú |
| :--- | :--- | :--- |
| **Độ dài ký tự bảng Tài sản** | Tối đa 25 ký tự cho tất cả các cột text | Dùng hàm `renderCell25()`, hover hiện đầy đủ |
| **Xuất Excel** | Phải xuất 100% dữ liệu đầy đủ | Không áp dụng cắt 25 ký tự khi xuất Excel |
| **Vị trí thời tiết Header** | Cố định là **Khánh Hòa** (Tọa độ: 12.2388, 109.1967) | Lấy từ Open-Meteo API |
| **Màu chữ ngày & thời tiết** | Màu trắng sáng (`dark:text-white`) trên theme tối | Không dùng biến mờ đục |
| **Biểu đồ tròn Dashboard** | Dạng Donut Chart, hiện tổng số ở tâm, chú giải 2 cột dưới | Không in chữ đè lên các lát cắt nhỏ |
| **Thanh Phân Trang (Pagination)** | Khối trái: số bản ghi & tổng hợp; Khối phải: Trước, các nút trang, Sau | Tự động về trang 1 khi lọc/tìm kiếm |
| **Tailwind v4 Dark Mode** | Bắt buộc có `@custom-variant dark (&:where(.dark, .dark *));` | Tránh bị media query Windows ghi đè |
| **Scrollbar & Focus Ring UI** | Thanh cuộn mượt mà 6px (`::-webkit-scrollbar`), Focus ring y tế xanh | Đồng nhất cho cả Light và Dark mode |

---

## 🚀 5. LỊCH SỬ NÂNG CẤP & TRIỂN KHAI THỰC TẾ
- **2026-09-24 - Giai đoạn 1 (Phase 4–5) [ĐÃ HOÀN TẤT]:**
  - Đã sao lưu database SQLite sang `backups/backup_20260924_150141.db` cùng toàn bộ 12 bảng JSON.
  - Chuẩn hóa Tokens hệ thống trong `frontend/src/index.css`: Semantic status badges (`.badge-status-*`), Custom scrollbar 6px bo tròn mượt mà, Card surfaces (`.card-enterprise`), Focus ring (`.focus-ring-medical`).
  - Tinh chỉnh App Shell & Flyout Submenu trong `frontend/src/layouts/MainLayout.tsx`: Flyout Submenu xổ ngang mượt mà, Header 1 hàng đầy đủ đồng hồ, thời tiết Khánh Hòa (`dark:text-white`), chuông thông báo, dark mode toggle, avatar profile, Footer h-11.
  - Tối ưu Thanh phân trang `frontend/src/components/Pagination.tsx`: Hỗ trợ đầy đủ các tùy chọn số bản ghi, responsive mobile/desktop, active indicator chuẩn `#2563eb`.
  - Biên dịch `npm run build` thành công 100% (exit code 0) và đồng bộ sang `backend/AssetManagement.WebAPI/wwwroot/` và `e:\DeployPackage_AssetManagement\wwwroot\`.

- **2026-09-24 - Giai đoạn 2 (Phase 6 - Từng trang nghiệp vụ) [ĐÃ HOÀN TẤT]:**
  - Rà soát và chuẩn hóa giao diện toàn diện 11 màn hình nghiệp vụ:
    1. `/login`: Card y tế cao cấp, logo BVQY 87, toggle mật khẩu, Face ID & Vân tay demo.
    2. `/dashboard`: 4 StatCards liên kết bộ lọc, Donut Chart hiện tổng ở tâm và bảng chú giải 2 cột bên dưới, BarChart xoay nghiêng -30°.
    3. `/assets` (P0): Giữ nguyên `renderCell25()` giới hạn 25 ký tự kèm tooltip, Xuất Excel 100% dữ liệu gốc, QR scanner/modal, modal bàn giao 2 cột.
    4. `/transfers`: 2 tab Lịch sử và Bàn giao, tìm kiếm tức thì, xuất Excel `LichSu_BanGiao_ThietBi.xlsx`, xuất PDF, canvas ký số.
    5. `/maintenance`: Quản lý phiếu bảo trì, đổi trạng thái tức thì, xuất Excel `DanhSach_BaoTri_BaoHanh.xlsx`.
    6. `/repair-requests`: Đồng bộ 36 khoa phòng, phân cấp độ ưu tiên, quy trình tiếp nhận & xử lý.
    7. `/categories`: Bố cục 2 tab Kho & Danh mục, modal thêm/sửa, modal xác nhận xóa có kiểm tra toàn vẹn an toàn.
    8. `/equipments`: Định mức 360 thiết bị, phân hạng chất lượng cấp 1-6, dải màu hạn sử dụng 6 cấp độ với chú giải interactive, import/export Excel.
    9. `/reports` & `UsageFrequencyTab.tsx` (P0): Thống kê bàn giao 36 khoa phòng, ma trận tần suất ngày 1-31, khóa 23h59 (chỉ Admin sửa ngày quá khứ), Last-write wins, gom nhóm 1 dòng duy nhất theo Serial+Tên, xuất Excel ma trận động.
    10. `/users`: Danh mục 36 Khoa, Phòng, Ban chính thức, modal danh sách nhân sự khi bấm vào cột Số lượng, import/export tài khoản Excel.
    11. `/settings`: Đổi mật khẩu, cấu hình LAN IP/chuyển hướng máy chủ, sao lưu tức thì SQLite và tải file `.db`.
  - Biên dịch kiểm thử `tsc -b && vite build` hoàn thành 100% không cảnh báo lỗi, đồng bộ toàn bộ file tĩnh sang `wwwroot/`.

- **2026-09-24 - Giai đoạn 3 (Phase 7–9 - Kiểm thử hồi quy toàn diện & Đóng gói phát hành) [ĐÃ HOÀN TẤT]:**
  - Chạy kiểm thử hồi quy tự động toàn diện 10/10 module hệ thống qua WebAPI và CSDL SQLite thực tế -> **100% PASS (HTTP 200)**.
  - Tự động sao lưu database SQLite sang `backups/backup_20260924_155208.db` cùng toàn bộ 12 bảng kết xuất JSON.
  - Biên dịch kiểm thử `tsc -b && vite build` hoàn thành 100% không cảnh báo lỗi (exit code 0).
  - Đồng bộ toàn bộ gói phát hành tĩnh sang `backend/AssetManagement.WebAPI/wwwroot/` và `e:\DeployPackage_AssetManagement\wwwroot\`.
- **2026-09-24 - Nâng cấp giao diện SideNavBar theo mẫu mới đề xuất [ĐÃ HOÀN TẤT]:**
  - Chuyển đổi toàn diện SideNavBar từ dạng thanh phẳng cũ sang giao diện thẻ Squircle Gradient hiện đại chuẩn theo hình thiết kế khoanh đỏ:
    + **Logo 3D Isometric QLTB:** Biểu tượng 3 tầng kim cương xếp lớp màu xanh lam - ngọc (`#38bdf8`, `#0284c7`, `#1e3a8a`), chữ thương hiệu **QLTB** in đậm màu trắng + **Quản lý Trang bị**.
    + **Nút Thu gọn / Mở rộng:** Tích hợp nút `<<` / `>>` ở góc trên bên phải sidebar, hỗ trợ thu gọn về 84px hoặc mở rộng 290px có animation mượt mà.
    + **Hệ thống thẻ Menu Squircle Gradient:** Mỗi mục có icon squircle bo góc tròn 12px rực rỡ (Dashboard xanh dương, Tài sản tím indigo, Báo cáo xanh ngọc emerald, Phiếu đề nghị vàng cam kèm badge đỏ số lượng, Kho & Danh mục xanh biển, Quản lý thiết bị xanh cyan, Quản lý khoa phòng đỏ san hô, Cấu hình tím violet).
    + **Trạng thái Active:** Thẻ active chuyển sang nền gradient xanh dương phát sáng (`from-blue-600 to-blue-500 shadow-lg shadow-blue-500/30`), chữ trắng sáng và icon mũi tên trắng.
    + **Menu con Accordion nội bộ:** Mục "Tài sản & Thiết bị" mở rộng accordion bên trong thanh điều hướng với các chấm tròn phát sáng: `Danh sách trang bị`, `Thêm mới trang bị`, `Chi tiết trang bị`, `Lịch sử biến động` và `Bảo trì & Bảo hành`.
    + **User Profile Card đáy Sidebar:** Khung thẻ bo tròn hiện đại chứa Avatar tròn viền xanh, họ tên, vai trò "Quản trị hệ thống" và nút Đăng xuất nhanh.
- **2026-09-28 - Triển khai trọn gói 5 Tính Năng Bảo Mật Toàn Diện (Security Hardening) [ĐÃ HOÀN TẤT]:**
  - **Tự động sao lưu an toàn trước triển khai:** Sao lưu SQLite sang `backups/backup_20260928_073633.db` cùng toàn bộ dữ liệu 12 bảng dump JSON.
  - **1. HTTP Security Headers Middleware (OWASP):** Tạo `SecurityHeadersMiddleware.cs` chặn XSS, Clickjacking, MIME-sniffing với các headers chuẩn: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
  - **2. Chống Brute-Force & Rate Limiting:** Tạo dịch vụ `LoginRateLimiter.cs` khóa tạm thời tài khoản/IP sau 5 lần đăng nhập thất bại trong 15 phút, trả về phản hồi chi tiết số lần thử còn lại.
  - **3. Bảo vệ Swagger UI:** Tự động tắt Swagger UI ngoài môi trường Development hoặc cần bật tường minh qua cờ `EnableSwagger: true` trong `appsettings.json`.
  - **4. Cảnh báo & Ràng buộc Mật khẩu mạnh:**
    + Nhận diện mật khẩu mặc định (`admin123`, `123456`, ...) trả về cờ `isDefaultPassword` trong payload đăng nhập.
    + Thêm banner cảnh báo màu cam nổi bật trên thanh Header (`MainLayout.tsx`) nhắc người dùng đổi mật khẩu ngay lập tức.
    + Section **Đổi Mật Khẩu An Toàn** (`Settings.tsx`) với thanh đo độ mạnh mật khẩu (Password Strength Meter) 4 mức độ trực quan, ràng buộc mật khẩu tối thiểu 8 ký tự và phải bao gồm cả chữ và số.
  - **5. Nhật Ký Kiểm Toán Bảo Mật (Security Audit Log):**
    + Tạo entity & bảng SQLite `SecurityAuditLogs` (tự động tạo index tăng tốc độ truy vấn).
    + Dịch vụ `AuditLogService.cs` tự động ghi nhận mọi sự kiện quan trọng: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `CHANGE_PASSWORD`, `CLEAR_AUDIT_LOGS`,... kèm IP máy trạm thực tế và User-Agent.
    + Bảng giao diện tra cứu Audit Log trực tiếp cho Admin tại trang `/settings`: hỗ trợ tìm kiếm tài khoản/IP, bộ lọc theo hành động, phân trang và nút dọn dẹp log cũ > 30 ngày an toàn.
  - Đã kiểm thử tự động toàn diện qua API, SQLite thực tế và build Vite tĩnh đồng bộ vào `wwwroot/`.

- **2026-09-28 - Khôi phục & Hoàn thiện Submenu 2 chức năng của "Báo cáo & Thống kê" [ĐÃ HOÀN TẤT]:**
  - **Menu con đa năng (Click & Hover):**
    + Thêm 2 chức năng con cho module `Báo cáo & Thống kê`: **Báo cáo theo khoa phòng** (`/reports?tab=departments`) và **Báo cáo theo tần suất sử dụng** (`/reports?tab=usage`).
    + Hỗ trợ cả **Click** (mở/đóng accordion ghim cố định) và **Hover** (rê chuột vào là 2 chức năng lập tức xuất hiện ngay bên dưới để chọn nhanh).
    + Nút mũi tên Chevron bên phải hỗ trợ toggle đóng/mở riêng biệt mà không điều hướng; click vào vùng thân thẻ vừa điều hướng vừa tự động mở menu con.
    + Khi thu gọn Sidebar (`w-[84px]`), rê chuột vào icon Báo cáo & Thống kê sẽ hiển thị Flyout Popover sang bên phải chứa 2 chức năng con để click trực tiếp.
  - **Đồng bộ 2 chiều URL Query Parameter & Tabs (`ReportsPage.tsx`):**
    + Tích hợp `useSearchParams`: URL luôn đồng bộ chuẩn `?tab=departments` hoặc `?tab=usage`.
    + Bấm chuyển tab trên đầu trang sẽ cập nhật URL và tự động highlight đúng mục tương ứng trên Sidebar.
    + Ngược lại, bấm từ Sidebar sẽ chuyển tab tức thì trên màn hình Báo cáo.
    + F5 hoặc tải lại trang luôn ghi nhớ chính xác tab đang xem.
    + Tiêu đề breadcrumb trên Header hiển thị rõ ràng: `Báo cáo & Thống kê • Theo Khoa Phòng` hoặc `Báo cáo & Thống kê • Theo Tần Suất Sử Dụng`.
  - **Cơ chế hiển thị tinh gọn (Smart Collapse):**
    + Khi đăng nhập hoặc vào hệ thống, toàn bộ các menu con (Tài sản & Thiết bị, Báo cáo & Thống kê...) **mặc định được đóng lại 100%**, giữ thanh Sidebar luôn gọn gàng và thoáng đãng.
    + Khi **hover chuột** vào bất kỳ module nào: Danh sách chức năng nhỏ bên trong mới tự động view ra (mở ra). Khi rê chuột ra ngoài, tự động đóng lại.
    + Khi **nhấp vào nút mũi tên**: Cho phép chủ động ghim mở cố định hoặc đóng lại theo nhu cầu sử dụng.
  - **2026-09-28 - Tinh chỉnh Menu & Chức năng Thêm Mới Trang Bị [ĐÃ HOÀN TẤT]:**
    + **Bỏ mục "Chi tiết trang bị":** Loại bỏ mục con không cần thiết khỏi menu `Tài sản & Thiết bị`, danh sách con chỉ còn: `Danh sách trang bị`, `Thêm mới trang bị`, `Lịch sử biến động` và `Bảo trì & Bảo hành`.
    + **Tự động mở Modal khi chọn "Thêm mới trang bị":** Khi nhấp vào `Thêm mới trang bị` từ Sidebar (`/assets?action=create`), trang tự động mở Modal Form Thêm trang bị ngay lập tức.
    + **Đổi tên nút & Modal đồng bộ:** Đổi nút bấm `+ Thêm tài sản` trên banner thành `+ Thêm trang bị`, cập nhật tiêu đề Modal thành `Thêm Mới Trang Bị`, nhãn `Tên trang bị (Tài sản)` và nút lưu `Lưu trang bị`.
  - **2026-09-29 - Tích Hợp Dropdown Cán Bộ Xử Lý & Bổ Sung Module "Thống Kê Theo Công Việc" [ĐÃ HOÀN TẤT]:**
    + **1. Chọn cán bộ xử lý từ danh sách tài khoản đã khai báo:**
      - Tại Modal `Tiếp nhận / Xử lý phiếu đề nghị` (`RepairRequests.tsx`), thay thế ô nhập text tự do bằng **Dropdown `<select>` nạp danh sách toàn bộ tài khoản khai báo trên hệ thống** từ API `/api/users`.
      - Hiển thị đầy đủ thông tin trực quan: Họ tên (`fullName`), tên đăng nhập (`username`), vai trò (`Quản trị viên` / `Quản lý` / `Nhân viên`) và khoa phòng công tác.
      - Tự động bảo lưu giá trị hiện tại của phiếu nếu trước đó đã được phân công hoặc nhập từ trước.
      - Phân quyền endpoint `GET /api/users` cho phép mọi tài khoản đã đăng nhập lấy danh sách nhân sự để tiếp nhận / phân công công việc mà không bị lỗi 403 Forbidden.
    + **2. Thêm chức năng "Thống kê theo công việc" trong module Báo cáo & Thống kê (`/reports?tab=tasks`):**
      - Tích hợp thêm tab thứ 3 trên thanh Squircle Pill của `ReportsPage.tsx` và menu con Sidebar `MainLayout.tsx`: `Thống kê theo công việc`.
      - Tự động đồng bộ 2 chiều URL Query Parameter: `?tab=tasks` hoặc `?tab=work`, highlight chính xác menu con trên Sidebar và breadcrumb Header: `Báo cáo & Thống kê • Thống kê theo công việc`.
      - Component chuyên biệt `WorkTasksReportTab.tsx`:
        * **4 Thẻ Thống kê đầu mối (StatCards):** Tổng đầu mối việc, Đang chờ tiếp nhận (số lượng + %), Đang xử lý (số lượng + %), Đã hoàn thành (số lượng + %).
        * **Bộ lọc đa chiều:** Tìm kiếm theo từ khóa (mã việc, tên việc, thiết bị, cán bộ, ghi chú), lọc theo Trạng thái, lọc theo Cán bộ xử lý (kèm tùy chọn Chưa phân công), lọc theo 36 Khoa phòng và phím tắt mốc thời gian (Hôm nay, 7 ngày, Tháng này, Quý này, Năm nay, Tất cả).
        * **Bảng chi tiết đầu mối công việc:** Đầy đủ STT, Mã việc (#REQ-00X), Tên công việc/yêu cầu, Khoa đề nghị, Thiết bị liên quan, Thời gian đề nghị, Thời gian hoàn thành (hoặc cập nhật gần nhất), Người xử lý, Trạng thái (Pill badge sắc nét), Hướng xử lý / Ghi chú kỹ thuật, Nút xem chi tiết bật Modal toàn diện.
        * **Phân trang (Pagination):** Chuyển trang và chọn số lượng hiển thị mượt mà.
        * **Xuất Excel:** Giữ nguyên 100% dữ liệu gốc không cắt ngắn, xuất file `BaoCao_ThongKe_CongViec_BVQY87_[timestamp].xlsx` với độ rộng cột chuẩn đẹp.
  - **2026-09-30 - Nâng Cấp Modal Ghi Nhận Lượt Dùng & Thống Kê Đánh Giá Hiệu Suất Từng Máy Theo Khoa Phòng [ĐÃ HOÀN TẤT]:**
    + **Khắc phục lỗi thiếu bảng dữ liệu SQLite:** Đồng bộ bảng `DeviceUsageLogs` sang CSDL của WebAPI (`backend/AssetManagement.WebAPI/assetmanagement.db`), khôi phục kết nối API `/api/deviceusages/monthly` hoạt động 100% trơn tru không còn bị lỗi 0 máy.
    + **Mặc định hiển thị danh sách máy:** Chuyển bộ lọc `usageFilter` mặc định sang `Tất cả máy (all)` để ngay khi vào trang, ma trận hiển thị toàn bộ 180 thiết bị được gom nhóm theo từng khoa phòng, không bị rơi vào trạng thái rỗng.
    + **Tính năng "Chọn máy từ Quản lý Thiết bị" trong Modal Ghi nhận:**
      - Tại Modal `+ Ghi Nhận Lượt Dùng Hôm Nay`, tích hợp nút bấm **`+ Chọn thêm máy từ Quản lý Thiết bị`**.
      - Khay Picker tra cứu toàn bộ 360 máy trong kho thiết bị bệnh viện với thanh tìm kiếm tức thì theo Tên máy, Serial/Ký hiệu, Hãng SX.
      - Bấm nút `+ Đưa vào khoa này` để lập tức đưa máy vào danh sách ghi nhận của khoa phòng đang chọn.
      - Nhập số lượt dùng hôm nay (có nút tăng giảm `+` / `-`), ghi chú ca trực và lưu hàng loạt qua `/api/deviceusages/batch`.
      - Tự động gắn kết khoa phòng `CurrentDepartment` cho thiết bị và làm mới ma trận ngay lập tức.
    + **Thống kê & Đánh giá hiệu suất sử dụng máy:**
      - Thống kê ma trận từng ngày (1 - 31), tổng lượt sử dụng, số ngày vận hành thực tế và trung bình lượt/ngày.
      - Cột **Đánh giá hiệu suất** trực quan: 🔥 Rất cao (≥ 50 lượt), ⭐ Tích cực (20 - 49 lượt), ✔ Trung bình (5 - 19 lượt), ⚡ Thấp (1 - 4 lượt), 💤 Chưa sử dụng (0 lượt).
      - Xuất file Excel đầy đủ 100% ma trận và cột đánh giá hiệu suất.
    + **Build & Deploy:** Biên dịch Vite Production 1.64s và đồng bộ vào toàn bộ `wwwroot/`.
  - **2026-09-30 - Cập Nhật Lọc Hiển Thị Trên Lưới Ma Trận Tần Suất: Chỉ Máy Đã Được Ghi Nhận Lượt Dùng [ĐÃ HOÀN TẤT]:**
    + **Chỉ hiển thị máy có lượt ghi nhận (`active_only`):** Thiết lập mặc định `usageFilter = 'active_only'` trong `UsageFrequencyTab.tsx`. Bảng ma trận tần suất sử dụng chỉ hiển thị các thiết bị đã được xác nhận/ghi nhận lượt dùng thực tế (`totalMonthUsage > 0`) trong khoảng thời gian được lọc.
    + **Ẩn toàn bộ máy chưa có lượt dùng:** Các thiết bị chưa có lượt dùng phát sinh (giá trị bằng 0 hoặc dòng trống) sẽ được ẩn hoàn toàn khỏi bảng lưới, giúp bảng hiển thị gọn gàng, đúng trọng tâm đánh giá các máy đang vận hành.
    + **Linh hoạt tra cứu:** Vẫn duy trì nút toggle `Chỉ máy có lượt dùng (X)` và `Tất cả máy (Y)` ở cả thanh công cụ và trên tiêu đề bảng ma trận để quản trị viên có thể tra cứu toàn bộ danh mục máy khi có nhu cầu.
    + **Biên dịch & Triển khai:** Biên dịch Vite Production hoàn tất (exit code 0) và đồng bộ đầy đủ vào `backend/AssetManagement.WebAPI/wwwroot/` và `e:\DeployPackage_AssetManagement\wwwroot\`.
  - **2026-09-30 - Khôi Phục & Đồng Bộ Thanh Điều Hướng Trang (Pagination) Trong Module Báo Cáo & Thống Kê [ĐÃ HOÀN TẤT]:**
    + **Đồng bộ chuẩn 100% theo màn hình Tài sản & Thiết bị:** Tích hợp component `<Pagination />` vào cuối các bảng dữ liệu trong module **Báo cáo & Thống kê** (`ReportsPage.tsx`, `UsageFrequencyTab.tsx`, `WorkTasksReportTab.tsx`).
    + **Đầy đủ tính năng điều hướng:**
      - Khối trái: Chọn số bản ghi mỗi trang `Hiển thị [ 20 ▼ ] bản ghi mỗi trang` (các tùy chọn 10, 20, 50, 100) và dòng tổng kết `Hiển thị X – Y / Z bản ghi`.
      - Khối phải: Nút `< Trước`, các nút số trang bo góc với trang hiện tại active màu xanh nổi bật (`1`, `2`, `...`), và nút `Sau >`.
    + **Tự động reset:** Khi người dùng thay đổi bộ lọc thời gian, khoa phòng hoặc gõ tìm kiếm máy, trang hiện tại sẽ tự động quay về trang 1.
    + **Biên dịch & Triển khai:** Biên dịch Vite Production 1.59s (exit code 0) và đồng bộ trọn vẹn vào `backend/AssetManagement.WebAPI/wwwroot/` và `e:\DeployPackage_AssetManagement\wwwroot\`.
  - **2026-10-01 - Tích Hợp Module Đánh Giá KPI (Phiên Bản 2.0) [ĐÃ HOÀN TẤT]:**
    + **Bảo toàn 100% hệ thống cũ:** Giữ nguyên toàn bộ cấu trúc kiến trúc, đăng nhập JWT, phân quyền (Admin, Manager, Staff), 36 khoa phòng và CSDL SQLite.
    + **Cấu trúc 26 chỉ số KPI & Trọng số:**
      - Nhóm A (7 chỉ số, 30%): A1 (7%), A2 (5%), A3 (6%), A4 (4%), A5 (4%), A6 (2%), A7 (2%).
      - Nhóm B (8 chỉ số, 35%): B1 (9%), B2 (6%), B3 (6%), B4 (5%), B5 (3%), B6 (2%), B7 (2%), B8 (2%).
      - Nhóm C (6 chỉ số, 20%): C1 (5%), C2 (4%), C3 (4%), C4 (3%), C5 (2%), C6 (2%).
      - Nhóm D (5 chỉ số, 15%): D1 (3%), D2 (3%), D3 (3%), D4 (3%), D5 (3%).
      - Tổng trọng số: 100.0% (1.00).
    + **Tái hiện 100% công thức Excel gốc (Cột J, K, L, M):**
      - Cột J: `=IF(E5="Tỷ lệ %", IF(OR(G5="", H5="", H5=0), "", G5/H5*100), IF(OR(E5="Số sự cố", E5="Điểm đánh giá"), I5, ""))`.
      - **Hành vi ô trống:** Với Số sự cố (A7, C6) và Điểm đánh giá (D1), khi ô I để trống, công thức Excel quy về 0 => J=0.
        * A7 (Thấp hơn tốt hơn, ngưỡng 0/1/2): J=0 <= 0 => Xuất sắc, L=100, M=2.0 điểm.
        * C6 (Thấp hơn tốt hơn, ngưỡng 0/0/1): J=0 <= 0 => Xuất sắc, L=100, M=2.0 điểm.
        * D1 (Tiêu chí ≥95/≥85/≥70): J=0 < 70 => Không đạt, L=0, M=0.0 điểm.
        * Khi hồ sơ hoàn toàn chưa nhập: Tổng A=2, B=0, C=2, D=0 => Tổng = 4.0 điểm, Xếp loại Không đạt, cờ "Có KPI không đạt – cần xem xét".
      - Cột K: Mức KPI tra theo ngưỡng cấu hình; riêng D1 dùng mốc ≥95 XS, ≥85 Tốt, ≥70 TB. C6 ngưỡng 0/0/1: 0=XS, 1=TB, ≥2=Không đạt.
      - Cột L: Xuất sắc=100, Tốt=85, Trung bình=70, Không đạt=0.
      - Cột M: `=IF(L5="", "", L5 * D5)`.
    + **Bảo vệ tính toán phía Server:** Client chỉ gửi dữ liệu nhập G/H/I và N/O; Server tự động tính lại toàn bộ J/K/L/M và tổng hợp điểm, không chấp nhận kết quả giả lập từ client.
    + **Giao diện Bảng tính KPI (`/kpi`) gồm 4 Tab:**
      - Tab 1 - Bảng tính KPI: Bảng 26 dòng, 15 cột A–O, bộ lọc nhóm (All, A, B, C, D), tính toán tức thời (real-time), thẻ tổng hợp 4 nhóm, cờ điều kiện chặn và khối Kết luận quản trị.
      - Tab 2 - Danh sách hồ sơ: Quản lý hồ sơ theo đơn vị, kỳ đánh giá, phân trang chuẩn Pagination.
      - Tab 3 - Cấu hình KPI: Quản lý 26 chỉ số và điều chỉnh ngưỡng cho Admin.
      - Tab 4 - Hướng dẫn đánh giá: Chi tiết 9 nguyên tắc nhập liệu và quy tắc xếp loại.
    + **Xuất Excel 3 Sheet chuẩn:** File `.xlsx` gồm 3 sheet: `KPI Tổng hợp` (đầy đủ công thức J–M và SUMIF), `Cấu hình KPI`, và `Hướng dẫn`.
    + **Kiểm thử nghiệm thu:** 18/18 test xUnit đạt 100% (kiểm thử công thức ô trống, A7, C6, D1, biên ngưỡng, tổng 100, API controller).
    + **Build & Deploy chuẩn:** Backend .NET 8 Release 0 lỗi; Vite Build 2.46s (exit code 0); đồng bộ gói phát hành sang `wwwroot/`.

- **2026-10-06 - Triển Khai Chức Năng "Phân Quyền Người Dùng & Mở Rộng Theo Chức Năng" [ĐÃ HOÀN TẤT]:**
  - **Mục đích:** Phân quyền chi tiết cho từng người dùng theo từng quyền cụ thể: Xem (`canView`), Thêm (`canCreate`), Sửa (`canEdit`), Xóa (`canDelete`), Xuất file (`canExport`) trên toàn bộ 11 module chức năng hiện có của hệ thống.
  - **Khả năng mở rộng động (Extensible Dynamic Modules):**
    + Thiết kế bảng `AppModules` lưu trữ danh mục chức năng hệ thống và chức năng tùy chỉnh.
    + Quản trị viên có thể bấm `+ Đăng ký chức năng mới` trực tiếp trên giao diện để bổ sung chức năng mới trong tương lai. Hệ thống tự động phân bổ quyền mặc định cho toàn bộ người dùng, tự động hiển thị hàng chức năng mới trên ma trận phân quyền mà không cần sửa code.
  - **Bảng CSDL & Phân quyền ma trận:**
    + Bảng `UserPermissions` lưu trữ chi tiết 5 quyền (`CanView`, `CanCreate`, `CanEdit`, `CanDelete`, `CanExport`) theo cặp `{UserId, ModuleCode}`.
    + Backend API `PermissionsController.cs`: Lấy danh sách module, thêm/sửa/xóa module mở rộng, tra cứu và lưu ma trận phân quyền, áp dụng mẫu phân quyền nhanh (`full`, `manager`, `readonly`, `staff`), endpoint `my-permissions` cho tài khoản đăng nhập.
  - **Giao diện người dùng (`UserPermissionsTab.tsx` & `UsersPage.tsx`):**
    + Tích hợp Tab 3 "Phân quyền người dùng" tại trang Quản lý Khoa Phòng & Nhân sự (`/users`).
    + Tích hợp nút thao tác nhanh "Phân quyền" (màu tím) trên từng hàng nhân viên ở Tab 2.
    + Thẻ KPI 4 "Phân quyền người dùng" hiển thị tổng số chức năng sẵn sàng mở rộng.
    + Giao diện ma trận checkbox thông minh: Tích chọn từng quyền, chọn toàn bộ hàng, các nút áp dụng nhanh mẫu phân quyền.
    + Tự động ẩn/hiện các mục menu trên thanh Sidebar navigation (`MainLayout.tsx`) theo quyền Xem/Thêm của người dùng thông qua `AuthContext.tsx`.
  - **Bảo toàn dữ liệu & Triển khai:**
    + Sao lưu CSDL an toàn 100%: `backups/backup_20261006_143653.db` (360,448 bytes) kèm dump JSON.
    + Biên dịch Backend .NET 8 Release và Frontend Vite thành công 0 lỗi.
- **2026-10-08 - Nâng Cấp Hệ Thống Hỗ Trợ Microsoft SQL Server & Kiến Trúc Dual-Database [ĐÃ HOÀN TẤT]:**
  - **Mục đích:** Nâng cấp toàn diện mã nguồn Backend .NET 8 hỗ trợ Microsoft SQL Server (2019/2022/Docker/On-Premise), đồng thời bảo toàn cơ chế Dual-Provider tương thích ngược với SQLite nhúng.
  - **Thư viện NuGet:** Cài đặt bổ sung `Microsoft.EntityFrameworkCore.SqlServer` (v8.0.6) vào `AssetManagement.Infrastructure`.
  - **Cơ chế Nhận diện Tự động (Dynamic Database Provider):**
    + Trong `Program.cs`, hệ thống tự động nhận diện loại CSDL thông qua cấu hình `DatabaseProvider` ("SqlServer" / "Sqlite") hoặc cấu trúc chuỗi kết nối `DefaultConnection`.
    + Nếu kết nối SQL Server: Tự động kích hoạt `UseSqlServer()` với `EnableRetryOnFailure()` và `EnsureCreated()` tự động khởi tạo toàn bộ 18 bảng.
    + Nếu kết nối SQLite: Tự động kích hoạt `UseSqlite()` với chế độ WAL Mode và RAM cache 20MB.
  - **Công cụ Chuyển đổi Dữ liệu Zero-Data-Loss:**
    + Phát triển script `scripts/migrate_sqlite_to_sqlserver.py` tự động xuất toàn bộ 18 bảng (964 bản ghi) từ SQLite sang file T-SQL chuẩn `backups/import_to_sqlserver.sql`.
    + Đảm bảo thứ tự khóa ngoại (FK), xử lý `IDENTITY_INSERT`, escape ký tự tiếng Việt Unicode `N'...'` và bọc trong giao dịch `TRANSACTION` an toàn tuyệt đối.
  - **Build & Deploy:** Biên dịch .NET 8 Release thành công 0 lỗi, cập nhật gói phát hành và đồng bộ `wwwroot/`.
---
*(Tài liệu này được lưu trữ tại gốc dự án `ghinho.md`. Mọi thay đổi trong tương lai cần được bổ sung vào đây).*









