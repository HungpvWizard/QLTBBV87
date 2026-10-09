# Specification: Hệ thống Quản lý Tài sản - Thiết bị - Văn phòng phẩm (MVP)

## 1. Executive Summary
Xây dựng một hệ thống quản lý tài sản lấy cảm hứng từ Snipe-IT và Shelf.nu, sử dụng React cho frontend hiện đại và ASP.NET Core cho backend theo kiến trúc Clean Architecture.

## 2. User Stories
- Là một Admin, tôi muốn thêm một thiết bị mới và dán QR Code cho nó.
- Là một Thủ kho, tôi muốn xuất/nhập văn phòng phẩm.
- Là một Nhân viên, tôi có thể xem các tài sản mình đang được giao.

## 3. Database Design (Core)
- **Users**: Id, Username, PasswordHash, RoleId
- **Roles**: Id, Name (Admin, Manager, Staff)
- **Departments**: Id, Name
- **Assets**: Id, Name, AssetTag (QR Code data), Serial, CategoryId, StatusId, UserId (AssignedTo)
- **Categories**: Id, Name, Type (Asset/Consumable)
- **AssetTransfers**: Id, AssetId, FromUserId, ToUserId, Date, Notes

## 4. API Contract (MVP)
- `POST /api/auth/login`
- `GET /api/assets`
- `POST /api/assets`
- `GET /api/assets/{id}`
- `PUT /api/assets/{id}`
- `DELETE /api/assets/{id}`
- `POST /api/assets/transfer`

## 5. Tech Stack
- Frontend: React + Vite + TailwindCSS
- Backend: ASP.NET Core 8 Web API
- Database: SQLite (giai đoạn MVP)
- Pattern: Clean Architecture, Repository Pattern, Dependency Injection.
