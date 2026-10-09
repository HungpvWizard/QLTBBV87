# MASTER PROMPT — ANTIGRAVITY SAFE UI MODERNIZATION

Bạn đang làm việc trên một ứng dụng Quản lý trang bị ĐANG CÓ CHỨC NĂNG THỰC TẾ. Mục tiêu là nâng cấp UI/UX nhưng tuyệt đối không làm mất hoặc thay đổi chức năng hiện hữu.

## Lệnh bắt buộc
1. Đọc toàn bộ `.agents/rules/*.md`, `.agents/workflows/UI_UX_UPGRADE.md`, `design-system/quanlytrangbi/MASTER.md` và `docs/*.md` liên quan.
2. Nếu skill `ui-ux-pro-max` đã cài, đọc SKILL.md và dùng nó để audit/tra cứu UI/UX. Tự phát hiện stack từ source; không giả định.
3. KHÔNG CODE NGAY. Trước tiên thực hiện Source Discovery và tạo/cập nhật:
   - `docs/FUNCTION_INVENTORY.md`
   - `docs/UI_AUDIT.md`
   - `docs/IMPLEMENTATION_PLAN.md`
4. Với mỗi page, đọc `MASTER.md` + page override tương ứng.
5. Chỉ bắt đầu refactor khi baseline chức năng của page đã đầy đủ.
6. Presentation-only mặc định. Không sửa DB/API/business logic/auth/permission/workflow nếu không được yêu cầu rõ.
7. Làm từng page nhỏ. Sau mỗi page chạy build/test hiện có và đối chiếu BEFORE/AFTER.
8. Nếu phát hiện chức năng có nguy cơ mất: STOP, phục hồi, ghi nguyên nhân.
9. Không nâng major dependency hoặc thay framework chỉ để cải thiện giao diện.
10. Cuối cùng tạo `docs/UI_UPGRADE_REPORT.md` nêu: đã audit gì, file đã sửa, cải tiến, test, feature parity, vấn đề còn lại.

## Hướng thiết kế
Enterprise Asset/Equipment Management; chuyên nghiệp, sáng sủa, dữ liệu rõ, phù hợp môi trường nội bộ. Ưu tiên tốc độ thao tác, khả năng đọc bảng, tìm kiếm/lọc, trạng thái thiết bị, lịch sử và báo cáo. Tránh hiệu ứng phô trương, gradient/blur quá mức, card hóa mọi thứ hoặc animation nặng.

## Quy tắc quyết định
Nếu giữa “đẹp hơn” và “giữ nguyên nghiệp vụ” có xung đột → GIỮ NGUYÊN NGHIỆP VỤ.
Nếu không hiểu một control/field → KHÔNG XÓA.
Nếu page override xung đột Master → page override thắng chỉ trong page đó.
Nếu UI UX Pro Max xung đột chức năng hiện hữu → chức năng hiện hữu thắng.

Bắt đầu bằng PHASE 1–3 và trình bày audit/plan trước khi sửa code diện rộng.
