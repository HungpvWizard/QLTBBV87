# WORKFLOW — SAFE UI/UX UPGRADE

## Phase 0 — Baseline & Backup
- Xác định branch/backup an toàn.
- Chạy app hiện tại, ghi route chính, screenshot nếu công cụ cho phép.
- Ghi build/test command hiện tại.

## Phase 1 — Source Discovery
- Phát hiện stack, router, state, UI library, CSS strategy, API layer, auth, test framework.
- Không sửa code.

## Phase 2 — Function Inventory
- Điền `docs/FUNCTION_INVENTORY.md` cho toàn app hoặc ít nhất page sắp sửa.
- Lập role/permission matrix nếu phát hiện phân quyền.

## Phase 3 — UI/UX Audit
- Dùng UI UX Pro Max nếu đã cài.
- Audit navigation, hierarchy, density, table, form, feedback, accessibility, responsive, consistency.
- Ghi `docs/UI_AUDIT.md`; phân loại P0/P1/P2 nhưng không xóa chức năng.

## Phase 4 — Design System
- Đọc `MASTER.md`.
- Nếu upstream UI UX Pro Max tạo design system mới, chỉ đề xuất merge; không `--force` ghi đè MASTER hiện hữu.
- Map token vào framework hiện tại.

## Phase 5 — Shared Components
- Chuẩn hóa button/input/select/badge/card/table/modal/toast theo cách ít rủi ro nhất.
- Regression test sau từng nhóm.

## Phase 6 — Page-by-page
Thứ tự khuyến nghị: login → shell/navigation → dashboard → equipment-list → equipment-detail → equipment-form → allocation → transfer → maintenance → inventory → reports → notifications → administration.
Mỗi page: BEFORE gate → refactor → build/test → AFTER gate → changelog.

## Phase 7 — Accessibility & Responsive
- Focus, labels, contrast, keyboard, modal, reduced motion.
- Desktop first; không làm vỡ mobile/tablet hiện hữu.

## Phase 8 — Regression
- Build/lint/test.
- Smoke test route/action/API/permission/workflow.
- So sánh FUNCTION_INVENTORY.

## Phase 9 — Final Report
- Liệt kê file thay đổi.
- Chức năng được bảo toàn.
- Cải tiến UI.
- Vấn đề chưa xử lý.
- Không tuyên bố hoàn thành nếu còn FAIL.
