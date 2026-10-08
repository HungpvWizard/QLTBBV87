# QUY TẮC BẮT BUỘC CHO DỰ ÁN (PROJECT RULES)

## ⚠️ QUY TẮC TỐI CAO DÀNH CHO AI & LẬP TRÌNH VIÊN:
Trước khi bắt đầu thực hiện bất kỳ yêu cầu nào (thêm chức năng mới, chỉnh sửa giao diện, sửa lỗi, cập nhật cơ sở dữ liệu...), **BẮT BUỘC PHẢI ĐỌC TOÀN BỘ NỘI DUNG FILE `ghinho.md`** nằm tại thư mục gốc của dự án (`e:/DeployPackage_AssetManagement/ghinho.md`).

### Các nguyên tắc không được vi phạm:
1. **Đọc `ghinho.md` trước tiên:** Hiểu rõ toàn bộ cấu trúc hệ thống, các ràng buộc dữ liệu, quy tắc màu sắc và cách thức hoạt động của từng module.
2. **Ràng buộc độ dài ký tự:** Tất cả các cột text trong bảng chức năng *Tài sản & Thiết bị* (`AssetList.tsx`) không được vượt quá 25 ký tự (sử dụng hàm `renderCell25()`, rê chuột hover xem đầy đủ).
3. **Quy tắc xuất Excel:** Khi xuất Excel phải xuất đầy đủ 100% dữ liệu gốc, không được cắt ngắn 25 ký tự.
4. **Địa điểm thời tiết:** Cố định là **Khánh Hòa** (kinh độ: 109.1967, vĩ độ: 12.2388).
5. **Theme tối (Dark Mode):** Giữ nguyên khai báo `@custom-variant dark (&:where(.dark, .dark *));` trong `frontend/src/index.css`. Màu chữ ngày tháng và thời tiết trên Header phải là màu trắng sáng (`dark:text-white`).
6. **Build & Deploy chuẩn:** Luôn chạy `npm run build` trong thư mục `frontend/`, sau đó copy kết quả sang thư mục `backend/AssetManagement.WebAPI/wwwroot/` và `wwwroot/` của dự án.
7. **Bảo toàn dữ liệu & Tính năng:** Mọi bản sửa đổi sau này chỉ được thêm vào (bổ sung, hoàn thiện thêm chức năng/giao diện), tuyệt đối không bỏ đi bất kỳ chức năng hay dữ liệu nào hiện có, trừ khi người dùng chủ động thao tác xóa trên ứng dụng. Luôn tự động sao lưu `assetmanagement.db` sang thư mục `backups/`.
