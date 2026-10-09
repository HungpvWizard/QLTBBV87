# QLTB UI/UX SAFE UPGRADE PACK

## Mục đích
Gói rule + design system + workflow để Antigravity nâng cấp UI ứng dụng Quản lý trang bị mà ưu tiên tuyệt đối việc bảo toàn chức năng.

## Cách dùng
1. Backup/commit source hiện tại.
2. Giải nén gói này vào ROOT của project.
3. Cài upstream UI UX Pro Max cho Antigravity theo hướng dẫn chính thức của project (khuyến nghị dùng CLI hiện hành), hoặc để Antigravity dùng skill nếu đã có.
4. Mở Antigravity và dán toàn bộ nội dung `.agents/prompts/ANTIGRAVITY_MASTER_PROMPT.md`.
5. Yêu cầu Antigravity chỉ làm Phase 1–3 trước. Kiểm tra `FUNCTION_INVENTORY.md`, `UI_AUDIT.md`, `IMPLEMENTATION_PLAN.md`.
6. Sau khi baseline đúng, cho phép làm từng page.

## Lưu ý quan trọng
Gói này KHÔNG chứa bản sao upstream UI UX Pro Max. Nó tích hợp ở mức rule/workflow và yêu cầu Antigravity gọi skill upstream đã cài. Cách này tránh đóng gói bản skill có thể lỗi thời và giữ đúng cấu trúc cài đặt chính thức của upstream.

## Cấu trúc
- `.agents/rules/`: hàng rào an toàn
- `.agents/workflows/`: quy trình refactor
- `.agents/prompts/`: prompt tổng
- `design-system/quanlytrangbi/`: master + page overrides
- `docs/`: inventory/audit/test/report templates
