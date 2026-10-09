# UI REFACTOR SAFETY

1. Khảo sát trước, code sau.
2. Không format/rewrite file không liên quan.
3. Giữ nguyên public props/interfaces/component contracts khi có thể.
4. Với component dùng nhiều nơi, tìm tất cả usages trước khi sửa.
5. Không đổi route path.
6. Không hard-code dữ liệu thật vào UI.
7. Không đưa secret/connection string/token vào frontend.
8. Không làm mất khả năng dùng bàn phím.
9. Không thay table bằng card nếu làm giảm khả năng so sánh dữ liệu.
10. Không thêm animation nặng vào màn hình nghiệp vụ.
11. Khi không chắc chức năng dùng để làm gì: giữ nguyên và ghi TODO/QUESTION; không xóa.
12. Khi test thất bại: sửa hoặc rollback, không bỏ test để “pass”.
