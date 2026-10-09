# GHI NHỚ QUAN TRỌNG DÀNH CHO TRỢ LÝ AI (AI MEMORY)

**LƯU Ý DÀNH CHO AI:** BẮT BUỘC ĐỌC FILE NÀY TRƯỚC KHI THỰC HIỆN BẤT KỲ THAY ĐỔI NÀO TRÊN HỆ THỐNG ĐỂ TRÁNH MẤT TÍNH NĂNG HOẶC PHÁ VỠ LOGIC CŨ!

## 1. Kiến trúc hệ thống & Cách Build
- **Frontend:** React (Vite) nằm trong thư mục `frontend/`. 
  - Khi build (`npm run build`), file tĩnh sẽ tự động được ghi đè thẳng vào thư mục `backend/AssetManagement.WebAPI/wwwroot/`.
- **Backend:** .NET 8 WebAPI nằm trong thư mục `backend/AssetManagement.WebAPI/`.
  - Backend tự động serve các file frontend trong thư mục `wwwroot`.
- **Database:** SQLite (`assetmanagement.db`) nằm gọn trong thư mục backend.

## 2. Các logic/tính năng quan trọng ĐÃ THIẾT LẬP (KHÔNG ĐƯỢC XÓA HOẶC LÀM HỎNG):
### A. Biểu đồ Thống kê (Dashboard)
- Thuật toán gom nhóm bằng tên thiết bị siêu thông minh:
  - Gom các biến thể của Máy X-Quang (`x-quang`, `xquang`, `xq`...) vào **"Máy X-Quang"**.
  - Gom PCR, Real-time PCR vào **"Máy Real-time PCR"**.
  - Gom máy lọc thận, sinh hóa, huyết học, siêu âm, sốc tim, điện tim, nội soi... vào nhóm tương ứng.
  - **Fallback CỰC QUAN TRỌNG:** Nếu thiết bị không có trong danh sách ưu tiên nhưng có chứa chữ "máy" hoặc "may" ➡️ Gom vào **"Máy khác"**. Nếu không có chữ "máy" (ví dụ bàn mổ, ghế...) ➡️ Gom vào **"Trang bị vật dụng khác"**. Không được sửa phá vỡ logic này.

### B. Liên kết Tài sản (Asset) & Thiết bị (Equipment)
- Trang Quản lý Thiết bị (`EquipmentsPage.tsx`) có nút **"Thêm mới"** thông minh (Dropdown menu).
- Hỗ trợ thêm thủ công hoặc **"Chọn từ Tài sản"** (Mở Modal hiển thị danh sách từ `AssetList.tsx` với checkbox, nhấn xác nhận sẽ tự động POST vòng lặp sang `/equipments` và copy các trường dữ liệu tương ứng).

### C. Phân quyền (RBAC) trên Menu Sidebar
Nằm trong `MainLayout.tsx`. Navigation menu được filter dựa theo Role của người đăng nhập:
- **Người dùng (User):** Bị giới hạn chỉ thấy 5 chức năng (Dashboard, Tài sản & thiết bị, Lịch sử bàn giao, Bảo trì báo hỏng, Phiếu Đề nghị).
- **Quản lý (Manager):** Có quyền của User + Thấy "Kho & Danh mục" + "Quản lý Thiết bị".
- **Quản trị (Admin):** Full quyền, thấy mọi thứ + "Quản lý Tài khoản" + "Cấu hình".

## 3. Cảnh báo khi bảo trì
- Không được tự ý xóa hoặc thay đổi route `/api/assets` và `/api/equipments` vì chúng đã được nối thông với nhau.
- Giao diện sử dụng Tailwind CSS, tuân thủ chặt chẽ phong cách thiết kế hiện tại (Border-radius, Shadow, Typography).
- Bất kỳ update nào ở Frontend đều phải build lại bằng `npm run build` để backend có thể nhận được.
