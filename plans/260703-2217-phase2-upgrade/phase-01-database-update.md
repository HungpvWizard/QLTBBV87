# Phase 01: Database Update
Status: ⏳ Pending
Dependencies: None

## Objective
Mở rộng Database Schema hiện tại để hỗ trợ Bảo trì và Lưu trữ Chữ ký.

## Implementation Steps
1. [x] Cập nhật Entity `AssetTransfer` để thêm trường `SignatureData` (Base64 chuỗi ảnh chữ ký) và `DocumentUrl` (đường dẫn file PDF nếu lưu).
2. [x] Tạo Entity mới `MaintenanceTicket` (Id, AssetId, UserId, IssueDescription, Status, Cost, ScheduledDate, CompletedDate).
3. [x] Cập nhật `ApplicationDbContext`.
4. [x] Tạo và chạy EF Core Migration (`AddPhase2Tables`).

---
Next Phase: Phase 02 - Backend API Upgrade
