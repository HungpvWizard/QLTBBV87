# Phase 02: Backend API Upgrade
Status: ⏳ Pending
Dependencies: Phase 01

## Objective
Cung cấp API cho thao tác Bảo trì và hỗ trợ Bàn giao có chữ ký.

## Implementation Steps
1. [x] Cập nhật `POST /api/assets/transfer` để nhận và lưu thêm `SignatureData`.
2. [x] Xây dựng `MaintenanceTicketsController` (CRUD phiếu báo hỏng).
3. [x] (Tuỳ chọn) API `GET /api/assets/transfer/{id}/pdf` để backend tự sinh PDF (nếu không sinh từ Frontend). (Bỏ qua, sẽ xử lý PDF ở Frontend để dễ dàn trang).

---
Next Phase: Phase 03 - Frontend QR & Signatures
