# 💡 BRIEF: Nâng cấp Quản lý Tài sản - Giai đoạn 2

**Ngày tạo:** 2026-07-03
**Brainstorm cùng:** Admin Hệ thống

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
Hệ thống MVP hiện tại đã có CRUD cơ bản cho tài sản, nhưng trong thực tế doanh nghiệp cần:
- Có giấy tờ pháp lý (Biên bản bàn giao) làm bằng chứng cho việc mượn/trả.
- Nhu cầu kiểm kê, check-in/check-out thiết bị siêu tốc bằng điện thoại thay vì gõ tay tìm kiếm.
- Tài sản sử dụng lâu ngày sẽ hỏng hóc, cần phải ghi nhận lại lịch sử sửa chữa và tính toán chi phí vòng đời của tài sản.

## 2. GIẢI PHÁP ĐỀ XUẤT
Mở rộng Database và xây dựng các luồng nghiệp vụ sâu hơn:
- Tích hợp thư viện tạo file PDF (ví dụ: iTextSharp / jsPDF) và lưu trữ chữ ký điện tử.
- Xây dựng module Quét QR trực tiếp trên web (sử dụng thư viện quét barcode HTML5) tương thích với camera điện thoại.
- Xây dựng module Bảo trì (Maintenance) và Báo hỏng (Ticket/Incident) có đính kèm luồng phê duyệt cơ bản.

## 3. TÍNH NĂNG (FEATURE LIST)

### 🚀 MVP Giai đoạn 2 (Bắt buộc có):
- [ ] Tính năng "Bàn giao": Chọn nhân viên -> Bàn giao -> Tự động sinh Biên bản PDF.
- [ ] Tính năng "Quét QR": Màn hình quét QR -> Tự động redirect về trang chi tiết của tài sản hoặc thao tác Check-in.
- [ ] Tính năng "Báo hỏng": Cho phép nhân viên báo hỏng thiết bị, Admin nhận thông báo và chuyển trạng thái sang "Đang sửa chữa".

### 🎁 Nice-to-have (Cân nhắc làm sau):
- [ ] Chữ ký số thật sự (tích hợp thiết bị chữ ký số hoặc eSign service), tạm thời sẽ dùng chữ ký điện tử vẽ trên Canvas (Signature Pad).
- [ ] Tính năng "Lịch bảo trì định kỳ": Gửi email nhắc nhở khi đến hạn bảo trì máy móc.

## 4. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** Trung bình - Khó (Do liên quan đến thao tác file PDF và quyền truy cập Camera thiết bị).
- **Rủi ro:** Module quét QR trên nền web có thể hoạt động không ổn định trên một số trình duyệt di động cũ, cần yêu cầu HTTPS.

## 5. BƯỚC TIẾP THEO
→ Chạy `/plan` để lên thiết kế chi tiết (Database schema mới, API mới) cho Giai đoạn 2.
