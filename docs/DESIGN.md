# 🎨 DESIGN: Quản lý Tài sản - Thiết bị - Văn phòng phẩm

Ngày tạo: 2026-07-03
Dựa trên: [asset-management_spec.md](file:///g:/PM%20QUAN%20LY%20TAI%20SAN%20THIET%20BI/docs/specs/asset-management_spec.md)

---

## 1. Cách Lưu Thông Tin (Database Schema)

Hệ thống sử dụng các bảng chính sau (sẽ được map qua Entity Framework Core):

- **Users**: Lưu thông tin người dùng (Id, Username, PasswordHash, RoleId, DepartmentId)
- **Roles**: Phân quyền (Id, Name - Admin, Manager, Staff)
- **Departments**: Phòng ban (Id, Name)
- **Categories**: Loại danh mục (Id, Name, Type - Asset/Consumable)
- **Assets**: Bảng tài sản chính (Id, Name, AssetTag, Serial, CategoryId, StatusId, AssignedUserId, PurchaseDate, Price)
- **AssetTransfers**: Lịch sử luân chuyển/bàn giao (Id, AssetId, FromUserId, ToUserId, TransferDate, Notes)

*Sơ đồ quan hệ:*
- 1 Department -> N Users
- 1 Category -> N Assets
- 1 Asset -> N AssetTransfers
- 1 User -> N Assets (tài sản đang giữ)

## 2. Danh Sách Màn Hình

| # | Tên | Mục đích |
|---|-----|----------|
| 1 | Login | Đăng nhập hệ thống (JWT) |
| 2 | Dashboard | Tổng quan số lượng tài sản, tài sản đang rảnh, tài sản hỏng |
| 3 | Asset List | Hiển thị bảng danh sách tài sản, tìm kiếm, lọc |
| 4 | Add/Edit Asset | Form nhập/sửa thông tin tài sản |
| 5 | Category List | Quản lý danh mục, kho, trạng thái |
| 6 | Asset Transfer | Màn hình chọn nhân viên để bàn giao tài sản |

## 3. Luồng Hoạt Động (User Flow)

### 3.1 Flow Nhập Tài Sản Mới
1. Admin vào màn hình Asset List.
2. Bấm "Thêm Mới".
3. Điền thông tin: Tên, Phân loại, Serial, Ngày mua...
4. Bấm Lưu -> Backend tạo QR code (AssetTag).
5. Quay lại Asset List và in QR code dán lên tài sản.

### 3.2 Flow Bàn Giao Tài Sản
1. Admin quét QR hoặc chọn tài sản từ list.
2. Bấm "Bàn Giao".
3. Chọn người nhận (User) từ Dropdown.
4. Bấm Xác nhận.
5. Backend cập nhật `AssignedUserId` và ghi log vào `AssetTransfers`.

## 4. Checklist Kiểm Tra & Test Cases

### Tính năng: Thêm Tài Sản
- [ ] Mở form nhanh, không lỗi.
- [ ] Nhập thiếu trường bắt buộc (Tên, Loại) -> Báo lỗi validation.
- [ ] Bấm Lưu thành công -> Bảng Assets được cập nhật.
- [ ] AssetTag được tự động sinh ra và duy nhất (Unique).

### Tính năng: Bàn Giao
- [ ] Tài sản đang trạng thái "Đang sửa chữa" -> Không cho phép bàn giao.
- [ ] Bàn giao thành công -> Trạng thái đổi thành "Đang sử dụng".
- [ ] Lịch sử (AssetTransfers) lưu lại chính xác ngày giờ và người thực hiện.

---
*Tạo bởi AWF - Design Phase*
