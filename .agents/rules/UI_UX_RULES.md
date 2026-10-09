# UI/UX RULES — QUẢN LÝ TRANG BỊ

## Mục tiêu
Nâng cấp giao diện ứng dụng hiện hữu theo hướng Enterprise Asset Management: hiện đại, rõ ràng, nhanh, nhất quán, data-dense nhưng dễ đọc. UI/UX Pro Max là nguồn tư vấn thiết kế; source code hiện hữu là nguồn sự thật về chức năng.

## Quy tắc bắt buộc
1. Đọc `NO_FEATURE_LOSS.md` trước mọi thay đổi UI.
2. Tự phát hiện stack từ source; không giả định React/Tailwind hay framework khác.
3. Trước khi sửa một trang phải lập inventory: route, field, button/action, API call, validation, permission, workflow/status, export/import, search/filter/sort, notification và side effect.
4. Đọc `design-system/quanlytrangbi/MASTER.md`, sau đó đọc file tương ứng trong `pages/`; page override chỉ ghi đè Master ở phần được nêu rõ.
5. Nếu UI UX Pro Max đã được cài, phải dùng skill `ui-ux-pro-max` để audit/tra cứu pattern, accessibility, typography, color, table, form, dashboard và stack guidance. Không dùng output skill để tự ý thay business logic.
6. Ưu tiên component hiện có. Chỉ tạo component mới khi giảm lặp hoặc tăng consistency mà không phá API/component contract.
7. Không thay dependency lớn, router, state management, auth library, API client hoặc CSS framework nếu chưa có yêu cầu rõ ràng.
8. Không redesign toàn bộ trong một commit. Làm page-by-page, kiểm thử rồi mới tiếp tục.
9. Mọi action quan trọng phải có loading, success, error và disabled state phù hợp.
10. Không dùng màu là tín hiệu duy nhất; status phải có text/icon/badge.

## Nguyên tắc UX
- Desktop LAN là ưu tiên; vẫn responsive ở tablet/mobile.
- Sidebar ổn định; header gọn; breadcrumb khi sâu >1 cấp.
- Table: sticky header khi dài, search/filter/sort rõ, pagination, empty state, loading state, row action dễ hiểu.
- Form: label luôn nhìn thấy; lỗi đặt gần field; nhóm trường theo nghiệp vụ; cảnh báo trước destructive action.
- Dashboard: KPI có ý nghĩa nghiệp vụ, không trang trí; chart phải có legend/tooltip/đơn vị; ưu tiên khả năng đọc.
- Không animation gây chậm; motion 150–250ms cho tương tác nhỏ, tôn trọng reduced motion.
- Keyboard focus rõ; modal không bẫy người dùng; icon-only button phải có accessible label/tooltip.

## Definition of Done cho mỗi trang
- Feature parity = 100% so với baseline.
- Không mất route/action/field/API/permission/validation/workflow.
- Không có console error mới.
- Không có request API sai hoặc thừa nghiêm trọng.
- Kiểm thử desktop 1366x768 và 1920x1080; tablet/mobile nếu layout hỗ trợ.
- Cập nhật `docs/UI_CHANGELOG.md` và checklist trước/sau.
