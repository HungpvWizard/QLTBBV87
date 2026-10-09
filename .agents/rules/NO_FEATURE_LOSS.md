# ABSOLUTE RULE — NO FEATURE LOSS

Đây là quy tắc ưu tiên cao nhất khi hiện đại hóa UI.

## CẤM
Antigravity KHÔNG được tự ý:
- Xóa/ẩn chức năng, nút, menu, tab, route hoặc thao tác hiện hữu.
- Đổi API endpoint, payload, query parameter, response mapping.
- Đổi schema database, migration hoặc dữ liệu.
- Đổi business rule, workflow, trạng thái hoặc điều kiện chuyển trạng thái.
- Đổi authentication/authorization/role/permission.
- Bỏ validation, confirmation, audit/logging, notification.
- Bỏ search/filter/sort/pagination/import/export/print/upload/download.
- Đổi tên field/model/DTO chỉ vì mục đích UI.
- Xóa code vì cho rằng “không dùng” nếu chưa chứng minh bằng dependency/reference analysis.
- Nâng major dependency hoặc thay framework để làm đẹp UI.

## BEFORE GATE
Trước khi sửa trang/component, tạo baseline trong `docs/FUNCTION_INVENTORY.md` gồm:
- Route + entry point
- Role/permission
- Fields + required/read-only/default
- Buttons/actions
- API/service calls + payload
- Search/filter/sort/pagination
- Status/workflow
- Validation + error handling
- Upload/download/import/export/print
- Notification/modal/confirmation
- Side effects và liên kết sang trang khác

Nếu chưa lập đủ baseline: STOP — không sửa UI.

## AFTER GATE
Sau khi sửa, đối chiếu từng mục BEFORE với AFTER. Mỗi mục phải là PASS. Nếu thiếu bất kỳ chức năng nào: dừng, phục hồi chức năng rồi mới tiếp tục.

## DATABASE/API SAFETY
UI refactor mặc định là presentation-only. Không chạy migration. Không sửa database. Không đổi contract backend. Nếu UI mới cần dữ liệu chưa có, ghi đề xuất vào `docs/UI_GAPS.md`, không tự triển khai backend.

## ROLLBACK
Mỗi phase phải có commit/backup riêng. Không gộp nhiều màn hình vào một thay đổi khó rollback.
