# KPI.md — Tích hợp bảng tính KPI vào phần mềm Quản lý trang bị và tài sản

Phiên bản 2.0 — 01/10/2026. Bản này thay thế bản trước: sử dụng đúng công thức Excel gốc do người dùng xác nhận; không thêm điều kiện để ô I trống làm J trống.

## 1. Prompt nhiệm vụ dành cho Antigravity

Hãy khảo sát source ứng dụng Quản lý trang bị và tài sản hiện có, sau đó bổ sung module “Đánh giá KPI” theo tài liệu này. Đây là module tích hợp trong ứng dụng, dùng chung đăng nhập, phân quyền, danh mục đơn vị, giao diện và cơ sở dữ liệu hiện có. Không tạo ứng dụng riêng, không thay stack, không xóa hoặc làm mất bất kỳ chức năng cũ nào.

Yêu cầu trọng tâm: tái hiện bảng KPI trong ba hình và công thức người dùng đã cung cấp. Các cột J, K, L, M chỉ dùng công thức và không cho người dùng sửa kết quả. Người dùng nhập số liệu G, H, I đúng hướng dẫn; các trường mô tả/cấu hình còn lại được quản lý theo chức năng của từng trường. Không tự động đổi logic ô trống, cách quy đổi điểm, trọng số hoặc ngưỡng.

Tài liệu là đặc tả triển khai; chưa có source để xác nhận schema, stack hay bộ quyền thực tế. Phải kiểm tra repository trước khi chọn cấu trúc code. Áp dụng quy trình bảo toàn chức năng và kiểm thử tích hợp của ứng dụng bệnh viện.

## 2. Nguồn và nguyên tắc ưu tiên

Nguồn: `kpi_system_spec.md`, ba ảnh bảng tổng hợp/cấu hình/hướng dẫn và công thức J–M được người dùng xác nhận trực tiếp. Nếu bản trước khác, áp dụng bản 2.0 này. Không áp dụng đề xuất sửa công thức J thành `IF(I5="","",I5)`.

Bảng tổng hợp trong ảnh có 15 cột A–O, gồm N “Ghi chú/Minh chứng” và O “Ngoại lệ” riêng. Ảnh cấu hình chỉ thể hiện phần B3–D5; danh mục đầy đủ lấy từ file nguồn. Không tự suy ra thêm quy định KPI quản trị chưa được cung cấp.

## 3. Cấu trúc bảng và quyền nhập

| Cột | Nội dung | Cách sử dụng |
|---|---|---|
| A | Mã KPI | Danh mục A1–D5, cấu hình sẵn |
| B | Tên KPI | Theo danh mục |
| C | Nhóm | A/B/C/D |
| D | Trọng số | Theo danh mục, lưu dạng 7%=0.07 |
| E | Đơn vị | Tỷ lệ %, Số sự cố, Điểm đánh giá |
| F | Chiều đánh giá | Cao hơn tốt hơn, Thấp hơn tốt hơn, Theo bộ tiêu chí |
| G | Tử số | Người dùng nhập cho KPI Tỷ lệ % |
| H | Mẫu số | Người dùng nhập cho KPI Tỷ lệ % |
| I | Giá trị đo | Người dùng nhập cho Số sự cố và D1 |
| J | Kết quả (%) / Giá trị đo | Công thức, không cho nhập/sửa trực tiếp |
| K | Mức KPI | Công thức, không cho nhập/sửa trực tiếp |
| L | Điểm KPI | Công thức, không cho nhập/sửa trực tiếp |
| M | Điểm quy đổi | Công thức, không cho nhập/sửa trực tiếp |
| N | Ghi chú/Minh chứng | Nhập thông tin bổ trợ/đính kèm theo quyền |
| O | Ngoại lệ | Nhập giải trình; không tự làm thay đổi công thức |

“Chỉ nhập số liệu G–I” theo hướng dẫn không có nghĩa người nhập được thay tùy ý danh mục A–F. A–F được nạp từ cấu hình; người có quyền cấu hình có thể quản lý trên trang cấu hình, không thay ngay trong bảng đánh giá. N/O là thông tin bổ trợ theo bố cục ảnh.

Mỗi bảng gắn với đơn vị/Khoa, kỳ đánh giá tháng/quý/năm, ngày bắt đầu/kết thúc, người lập và phiên bản cấu hình. Đây là KPI đơn vị theo nguồn, không tự chuyển thành KPI cá nhân.

## 4. Danh mục 26 KPI

A: 7 chỉ số, 30%; B: 8 chỉ số, 35%; C: 6 chỉ số, 20%; D: 5 chỉ số, 15%. Tổng 100%. Ngưỡng tỷ lệ dùng số trên thang 0–100: 99% lưu 99; 0.1% lưu 0.1. Trọng số dùng số thập phân 0–1.

| Mã KPI | Tên chỉ số KPI | Nhóm | Trọng số | Đơn vị tính | Chiều đánh giá | Ngưỡng Xuất sắc | Ngưỡng Tốt | Ngưỡng Trung bình |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **A1** | Tỷ lệ đáp ứng nhu cầu hóa chất, VTYT | A | 7% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 99% | ≥ 97% | ≥ 95% |
| **A2** | Tỷ lệ cung ứng đúng thời hạn | A | 5% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 99% | ≥ 97% | ≥ 95% |
| **A3** | Hoàn thành đấu thầu, mua sắm đúng tiến độ | A | 6% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 98% | ≥ 95% | ≥ 90% |
| **A4** | Hồ sơ không phải tổ chức lại do lỗi chủ quan | A | 4% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 99% | ≥ 97% | ≥ 95% |
| **A5** | Kiểm soát tồn kho hóa chất, VTYT | A | 4% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 98% | ≥ 95% | ≥ 90% |
| **A6** | Giá trị hàng hết hạn/không sử dụng được | A | 2% | Tỷ lệ % | Thấp hơn tốt hơn | ≤ 0.1% | ≤ 0.3% | ≤ 0.5% |
| **A7** | Sự cố thiếu hóa chất, VTYT ảnh hưởng chuyên môn | A | 2% | Số sự cố | Thấp hơn tốt hơn | ≤ 0 sự cố | ≤ 1 sự cố | ≤ 2 sự cố |
| **B1** | Tỷ lệ TTBYT sẵn sàng phục vụ | B | 9% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 98% | ≥ 96% | ≥ 93% |
| **B2** | Bảo trì, bảo dưỡng đúng kế hoạch | B | 6% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 99% | ≥ 97% | ≥ 95% |
| **B3** | Kiểm định/hiệu chuẩn đúng hạn | B | 6% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 100% | ≥ 98% | ≥ 95% |
| **B4** | Xử lý sự cố trong thời gian cam kết | B | 5% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 98% | ≥ 95% | ≥ 90% |
| **B5** | Thiết bị hư hỏng được khôi phục đúng hạn | B | 3% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 98% | ≥ 95% | ≥ 90% |
| **B6** | Hồ sơ quản lý TTBYT đầy đủ | B | 2% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 100% | ≥ 98% | ≥ 95% |
| **B7** | Thiết bị mua mới đưa vào sử dụng đúng tiến độ | B | 2% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 98% | ≥ 95% | ≥ 90% |
| **B8** | Thiết bị ngừng hoạt động kéo dài | B | 2% | Tỷ lệ % | Thấp hơn tốt hơn | ≤ 0.5% | ≤ 1.0% | ≤ 2.0% |
| **C1** | Tiêu chí/nội dung chất lượng thuộc phạm vi Khoa đạt yêu cầu | C | 5% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 98% | ≥ 95% | ≥ 90% |
| **C2** | Khuyến cáo được khắc phục đúng hạn | C | 4% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 98% | ≥ 95% | ≥ 90% |
| **C3** | Sự cố TTBYT được xử lý và phân tích nguyên nhân | C | 4% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 100% | ≥ 98% | ≥ 95% |
| **C4** | Hoàn thành kế hoạch cải tiến chất lượng | C | 3% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 95% | ≥ 90% | ≥ 80% |
| **C5** | Tuân thủ quy trình quản lý TTBYT | C | 2% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 98% | ≥ 95% | ≥ 90% |
| **C6** | Sự cố nghiêm trọng do lỗi quản lý thuộc trách nhiệm Khoa | C | 2% | Số sự cố | Thấp hơn tốt hơn | ≤ 0 sự cố | ≤ 0 sự cố | ≤ 1 sự cố |
| **D1** | Kiểm soát chi phí mua sắm | D | 3% | Điểm đánh giá | Theo bộ tiêu chí | Chấm điểm 0-100 theo tiêu chí phê duyệt |
| **D2** | Giá trị tồn kho trong ngưỡng kiểm soát | D | 3% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 95% | ≥ 90% | ≥ 80% |
| **D3** | Tiết kiệm chi phí từ giải pháp quản lý hợp lý | D | 3% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 5% | ≥ 3% | ≥ 1% |
| **D4** | Hiệu quả khai thác, sử dụng TTBYT | D | 3% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 95% | ≥ 90% | ≥ 80% |
| **D5** | Kiểm soát chi phí sửa chữa, bảo trì | D | 3% | Tỷ lệ % | Cao hơn tốt hơn | ≥ 98% | ≥ 95% | ≥ 90% |

## 5. Công thức gốc bắt buộc cho J, K, L, M

Các công thức dưới dùng hàng 5 làm ví dụ. Khi áp dụng hàng khác, thay tham chiếu dòng tương ứng; vùng cấu hình `$A$2:$D$27` là 26 KPI, tra chính xác bằng mã. Nếu bố cục xuất Excel đổi vị trí, điều chỉnh vùng tham chiếu nhưng giữ nguyên logic.

### 5.1. Cột J

```excel
=IF(E5="Tỷ lệ %", IF(OR(G5="", H5="", H5=0), "", G5/H5*100), IF(OR(E5="Số sự cố", E5="Điểm đánh giá"), I5, ""))
```

### 5.2. Cột K

```excel
=IF(J5="", "", 
  IF(A5="D1", 
    IF(J5>=95, "Xuất sắc", IF(J5>=85, "Tốt", IF(J5>=70, "Trung bình", "Không đạt"))), 
    IF(F5="Cao hơn tốt hơn", 
      IF(J5>=VLOOKUP(A5, 'Cấu hình KPI'!$A$2:$D$27, 2, FALSE), "Xuất sắc", 
        IF(J5>=VLOOKUP(A5, 'Cấu hình KPI'!$A$2:$D$27, 3, FALSE), "Tốt", 
          IF(J5>=VLOOKUP(A5, 'Cấu hình KPI'!$A$2:$D$27, 4, FALSE), "Trung bình", "Không đạt")
        )
      ), 
      IF(J5<=VLOOKUP(A5, 'Cấu hình KPI'!$A$2:$D$27, 2, FALSE), "Xuất sắc", 
        IF(J5<=VLOOKUP(A5, 'Cấu hình KPI'!$A$2:$D$27, 3, FALSE), "Tốt", 
          IF(J5<=VLOOKUP(A5, 'Cấu hình KPI'!$A$2:$D$27, 4, FALSE), "Trung bình", "Không đạt")
        )
      )
    )
  )
)
```

### 5.3. Cột L

```excel
=IF(K5="", "", IF(K5="Xuất sắc", 100, IF(K5="Tốt", 85, IF(K5="Trung bình", 70, 0))))
```

### 5.4. Cột M

```excel
=IF(L5="", "", L5 * D5)
```

### 5.5. Diễn giải chính xác

- J: nếu E là Tỷ lệ %, thiếu G/H hoặc H=0 thì trả chuỗi rỗng; còn lại G/H×100. Nếu E là Số sự cố hoặc Điểm đánh giá thì lấy I trực tiếp; ô I thực sự trống được Excel quy về 0 trong tham chiếu này. Trường hợp khác trả rỗng.
- K: J rỗng thì rỗng. D1 dùng mốc ≥95 Xuất sắc, ≥85 Tốt, ≥70 Trung bình, còn lại Không đạt. Các mã khác tra ba ngưỡng theo mã; nếu F là “Cao hơn tốt hơn” thì so ≥, nhánh còn lại của công thức gốc so ≤. Kiểm tra danh mục hợp lệ để tránh sai tên F đi nhầm nhánh.
- L: Xuất sắc=100, Tốt=85, Trung bình=70, Không đạt=0; K rỗng thì rỗng.
- M: L rỗng thì rỗng; còn lại L×D. Công thức chính xác là `=IF(L5="","",L5*D5)`; không có dấu nhân sau ngoặc đóng cuối.
- D1 nhập điểm 0–100 nhưng M lấy điểm QUY ĐỔI L nhân trọng số, không lấy I nhân trọng số. Ví dụ D1=96 ⇒ L=100 ⇒ M=3.
- C6 ngưỡng 0/0/1: xét Xuất sắc trước nên 0=Xuất sắc, 1=Trung bình, 2 trở lên=Không đạt. Không tự sửa ngưỡng Tốt bằng 0.

### 5.6. Quy tắc ô trống do người dùng xác nhận

Giữ hành vi công thức gốc, dù người dùng chưa nhập I:

| Dòng | I trống | J | K | L | M |
|---|---|---|---|---|---|
| A7 | Lấy tham chiếu ô trống | 0 | Xuất sắc | 100 | 2 |
| C6 | Lấy tham chiếu ô trống | 0 | Xuất sắc | 100 | 2 |
| D1 | Lấy tham chiếu ô trống | 0 | Không đạt | 0 | 0 |

KPI tỷ lệ thiếu G/H vẫn để J–M rỗng. Vì vậy bảng hoàn toàn chưa nhập số liệu vẫn có tổng A=2, B=0, C=2, D=0, tổng=4 và xếp loại theo điểm Không đạt, đúng ảnh. Không thêm cơ chế để thiếu 26 dòng thì bỏ xếp loại theo điểm hoặc tự phân bổ lại trọng số. Có thể hiển thị số ô đã nhập để hỗ trợ người dùng nhưng không được thay kết quả công thức.

Trong web/backend phải phân biệt input null với số 0 cho lưu trữ và audit, nhưng khi tính J cho Số sự cố/Điểm đánh giá phải chuyển input null thành 0 đúng công thức. Không ghi số 0 ngược vào ô I đang trống. Chuỗi rỗng của công thức không được nhầm với số 0 trong kiểm tra J/K/L. Dùng enum/trạng thái cho kết quả rỗng để tái hiện đúng.

### 5.7. Tổng hợp kết quả

```excel
Điểm nhóm A: =SUMIF(C5:C30,"A",M5:M30)
Điểm nhóm B: =SUMIF(C5:C30,"B",M5:M30)
Điểm nhóm C: =SUMIF(C5:C30,"C",M5:M30)
Điểm nhóm D: =SUMIF(C5:C30,"D",M5:M30)
Điểm tổng hợp: =SUM(M5:M30)
```

SUM bỏ qua kết quả rỗng. Xếp loại theo điểm: ≥95 Xuất sắc; ≥85 và <95 Tốt; ≥70 và <85 Trung bình; <70 Không đạt. Điểm tối đa nhóm A/B/C/D là 30/35/20/15, tổng 100. Không làm tròn kết quả trước so ngưỡng; hiển thị hai số thập phân, số sự cố có thể hiển thị số nguyên. Dùng decimal hoặc phép tính chính xác phía server theo stack thực tế.

### 5.8. Điều kiện chặn và kết luận quản trị

Khối dưới bảng gồm: điểm nhóm A/B/C/D; điểm tổng hợp; xếp loại theo điểm; điều kiện chặn; xếp loại cuối cùng.

Nguồn nêu: sự cố nghiêm trọng do lỗi quản lý thuộc trách nhiệm Khoa, vi phạm pháp lý/quy định bệnh viện, thiết bị hết hạn kiểm định/hiệu chuẩn vẫn sử dụng. Nếu có KPI Không đạt, hiển thị “Có KPI không đạt – cần xem xét” như hình; đây là cờ xem xét, không tự thay điểm J–M.

Chưa có công thức hoặc quy định đầy đủ về việc hạ bao nhiêu bậc/buộc Không đạt khi có điều kiện chặn. Tách xếp loại theo điểm và kết luận quản trị; giữ đúng kết quả theo điểm kể cả dữ liệu thiếu. Nếu điểm đã Không đạt thì kết luận cuối Không đạt như mẫu; nếu mức điểm cao hơn và có điều kiện cần xem xét, hiển thị trạng thái xem xét, yêu cầu quy định/ý kiến người có thẩm quyền trước kết luận cuối. Không tự bịa hình phạt. Lưu quyết định, lý do, minh chứng, người quyết định và quy định áp dụng. Khi không có điều kiện chặn đã được xác minh, kết luận cuối theo xếp loại điểm.

## 6. Hướng dẫn nhập liệu phải có trong ứng dụng

1. Nhập số liệu thực tế tại G–I; không sửa J–M vì đây là công thức.
2. KPI Tỷ lệ %: nhập Tử số ở G, Mẫu số ở H; J tự tính phần trăm.
3. KPI Số sự cố: nhập số sự cố ở I; J lấy giá trị này, I trống cho J=0 theo công thức gốc.
4. D1: nhập điểm 0–100 ở I theo bộ tiêu chí kiểm soát chi phí mua sắm do bệnh viện phê duyệt.
5. K tự xác định Xuất sắc/Tốt/Trung bình/Không đạt theo ngưỡng cấu hình, riêng D1 theo mốc công thức.
6. L quy đổi 100/85/70/0; M=L×trọng số; tổng tối đa 100.
7. Xếp loại tổng: ≥95 Xuất sắc; 85–<95 Tốt; 70–<85 Trung bình; <70 Không đạt.
8. Điều kiện chặn phải được đánh giá theo Quy định KPI; bảng tính không thay thế kết luận quản trị.
9. Lưu hồ sơ theo tháng/quý để truy xuất và kiểm toán nội bộ.

Không bắt buộc nhập đủ tất cả dòng mới được lưu nháp/tính điểm. Kiểm tra đầu vào là số hợp lệ, không âm; sự cố là số nguyên, D1 từ 0–100. H=0 được phép lưu theo công thức và J rỗng, không gây chia cho 0. Không tự sửa tỷ lệ >100% hoặc giới hạn tử số nếu chưa có định nghĩa nghiệp vụ xác nhận; có thể cảnh báo để kiểm tra. Chuỗi không hợp lệ phải báo lỗi, không đổi thành 0.

## 7. Giao diện tích hợp

Bổ sung mục “Đánh giá KPI” trong navigation hiện có, gồm Bảng tính KPI, Cấu hình KPI, Hướng dẫn và danh sách hồ sơ theo kỳ/đơn vị. Giữ style của ứng dụng, tiếng Việt và khả năng dùng mạng LAN theo kiến trúc đang có.

Bảng tính đủ 26 dòng/15 cột, lọc nhóm, header cố định, cuộn ngang, cố định mã/tên khi cần. G/H/I là ô nhập tương ứng loại KPI, J–M chỉ đọc có tooltip công thức. N/O ghi bổ trợ. Có lưu nháp, xem lịch sử, gửi/duyệt nếu ứng dụng có quy trình phù hợp, xuất Excel. Tính lại ngay khi nhập và đối chiếu kết quả server khi lưu. Dùng màu kèm chữ: Xuất sắc xanh lá, Tốt xanh dương, Trung bình vàng, Không đạt đỏ. Không bỏ trường khi xem màn hình nhỏ.

Trang cấu hình có mã, ngưỡng Xuất sắc/Tốt/Trung bình, chiều đánh giá, ghi chú ngưỡng và trọng số; D1 dùng điểm theo bộ tiêu chí, ghi rõ mốc phân loại 95/85/70. Kiểm tra 26 mã duy nhất, tổng trọng số 100%, tổng từng nhóm đúng; ngưỡng HIGHER giảm dần, LOWER tăng dần, cho phép bằng nhau như C6. Không sửa cấu hình đã dùng để duyệt lịch sử; tạo phiên bản mới.

## 8. Dữ liệu, phân quyền và bảo toàn chức năng

Khảo sát AGENTS/rules, trạng thái git, stack, auth, danh mục đơn vị, schema và test trước khi sửa. Không ghi đè thay đổi của người dùng. Không tự chuyển database, thay hệ thống đăng nhập hay sửa module khác ngoài phạm vi cần tích hợp.

Model đề xuất (tên thực tế theo repository):

- KpiConfigVersion và KpiDefinition: 26 mã, trọng số, đơn vị, chiều, ngưỡng, hiệu lực và version.
- KpiAssessment: đơn vị, kỳ, version, trạng thái, người lập/duyệt, revision và kết luận theo điểm/quản trị.
- KpiAssessmentLine: mã, G/H/I nullable, N/O, kết quả J–M, người cập nhật; unique theo hồ sơ và mã.
- KpiEvidence, KpiManagementDecision, KpiAudit: minh chứng, điều kiện chặn/kết luận, lịch sử trước/sau và lý do.

API lưu đầu vào và tính lại phía server; client không được gửi J–M làm kết quả có thẩm quyền. Mã KPI lấy theo version hồ sơ, không lấy trọng số từ payload client. Lưu nhiều dòng trong transaction; kiểm soát sửa đồng thời, quyền đơn vị và quyền tải minh chứng. Dùng phân quyền sẵn có: xem, nhập, cấu hình, xem xét/duyệt, xuất; không mặc định tất cả người dùng có quyền quản trị.

Hồ sơ đã duyệt giữ snapshot đầu vào/config/kết quả, không tự thay đổi khi cấu hình mới hoặc nguồn nghiệp vụ thay đổi. Mở lại cần quyền, lý do và revision. Migration theo hướng bổ sung; backup và thử restore/migration trên bản sao trước dữ liệu thật. Không cần dữ liệu định danh bệnh nhân để tính module này.

Giai đoạn đầu là nhập liệu theo hướng dẫn. Không tự động lấy tử/mẫu số từ sửa chữa, kho, tài sản hoặc mua sắm khi chưa xác định chính xác định nghĩa từng KPI. Ví dụ B4/B5 không đồng nhất; “hoàn thành yêu cầu” chưa chứng minh “thiết bị khôi phục”. Các khái niệm “ngừng hoạt động kéo dài”, “ngưỡng tồn kho”, bộ tiêu chí D1, baseline tiết kiệm D3, SLA cần chủ nghiệp vụ cung cấp nếu muốn tự động hóa sau này. Không dựng dữ liệu demo thành dữ liệu thật.

## 9. Xuất Excel

Xuất ba sheet `KPI Tổng hợp`, `Cấu hình KPI`, `Hướng dẫn`. Đủ 26 mã, 15 cột và khối tổng hợp như ảnh. J–M chứa công thức gốc ở mục 5 với tham chiếu phù hợp; khóa vùng công thức, G–I nhập số liệu, N/O bổ trợ; A–F lấy cấu hình. Sheet protection không thay thế quyền truy cập server.

D lưu 0.07 và định dạng 7%; J đã nhân 100 nên hiển thị số kèm nhãn %, không format Percent lần nữa làm 99 thành 9900%. Công thức thư viện xlsx dùng cú pháp chuẩn hỗ trợ; nếu hướng dẫn copy vào Excel locale khác thì cung cấp bản dùng dấu `;` khi cần. Thiếu mã cấu hình phải báo lỗi, không nuốt thành Không đạt/0. D1 không phụ thuộc ô ngưỡng trống trong bảng cấu hình.

Bản xuất ghi đơn vị/kỳ/version/thời điểm và kết luận quản trị nếu có. Nội dung ghi chú phải xuất như text, tránh formula injection. Nếu có import, preview và kiểm tra dữ liệu G/H/I/N/O; tính lại J–M phía server, không tin công thức/kết quả sửa bên ngoài. Không tự thêm import nếu người dùng chưa cần và source chưa có cơ chế phù hợp.

## 10. Kiểm thử nghiệm thu bắt buộc

| Ca kiểm thử | Kết quả |
|---|---|
| Hồ sơ hoàn toàn trống | A7=2 điểm; C6=2; D1=0; tỷ lệ rỗng; tổng=4; theo điểm Không đạt; cờ Có KPI không đạt – cần xem xét |
| A7 I trống và I=0 | Cùng J=0, Xuất sắc, L=100, M=2; dữ liệu lưu vẫn phân biệt trống/0 |
| D1 I trống và I=0 | Cùng J=0, Không đạt, M=0 |
| G/H thiếu hoặc H=0 | J/K/L/M rỗng, không lỗi chia cho 0 |
| A1 99/100; 97/100; 95/100; 94.99/100 | Mức Xuất sắc/Tốt/Trung bình/Không đạt; M=7/5.95/4.9/0 |
| A1 98999/100000 | J=98.999; Tốt dù hiển thị 99.00 |
| A6 J=0.1/0.3/0.5/0.5001 | Xuất sắc/Tốt/Trung bình/Không đạt |
| A7 I=1/2/3 | Tốt/Trung bình/Không đạt; M=1.7/1.4/0 |
| C6 I=0/1/2 | Xuất sắc/Trung bình/Không đạt; không có mức Tốt với cấu hình này |
| D1 I=95/85/70/69.99 | L=100/85/70/0; M=3/2.55/2.1/0 |
| D1 I=96 | J=96; L=100; M=3 |
| B8 J=0.5/1/2/2.0001 | Xuất sắc/Tốt/Trung bình/Không đạt |
| Cả 26 dòng Xuất sắc | Nhóm 30/35/20/15; tổng 100 |
| Điểm tổng 95/85/70 và sát dưới | Xếp loại đúng mốc, không dùng giá trị làm tròn |
| Client sửa J–M hoặc trọng số | Server không dùng kết quả giả |
| Đổi config sau duyệt | Hồ sơ cũ không thay đổi |
| Người dùng đơn vị khác gọi API | Không xem/sửa/tải minh chứng ngoài quyền |
| Export | Công thức và hành vi ô trống khớp bảng gốc |

Bổ sung kiểm thử ba ngưỡng và hai phía sát ngưỡng cho tất cả mã. Chạy build, test engine, migration trên bản sao và hồi quy chức năng đang có: login, phân quyền, tài sản, sửa chữa, thông báo, báo cáo công việc/dashboard nếu chúng tồn tại. Ghi bằng chứng thực tế; không báo đạt kiểm thử chưa chạy.

## 11. Trình tự và bàn giao từ Antigravity

1. Khảo sát source và báo cáo chức năng phải giữ, file dự kiến sửa, cách tích hợp và rủi ro dữ liệu.
2. Seed danh mục đủ 26 KPI, cấu hình theo phiên bản; viết engine tái hiện công thức gốc và các test mục 10.
3. Bổ sung lưu hồ sơ, API/permission/audit, bảng nhập, cấu hình/hướng dẫn và Excel.
4. Kiểm thử tính toán và hồi quy; đối chiếu mẫu trống tổng 4 với hình, sau đó đối chiếu mẫu nhập đủ.
5. Bàn giao file thay đổi, kết quả build/test, hướng dẫn sử dụng, migration và backup/restore/rollback. Những quyết định chặn chưa đủ quy định cần liệt kê, không tự đặt chính sách. Không tự triển khai lên dữ liệu thật ngoài phạm vi được cho phép.

## 12. Prompt ngắn để dán vào Antigravity

```text
Đọc toàn bộ KPI.md phiên bản 2.0 ở thư mục gốc và tích hợp module Đánh giá KPI vào phần mềm Quản lý trang bị và tài sản hiện có của tôi.

Giữ nguyên chức năng cũ, stack, đăng nhập và phân quyền. Người dùng nhập số liệu G/H/I theo hướng dẫn; J/K/L/M chỉ dùng công thức gốc trong KPI.md. A–F lấy cấu hình; N/O nhập thông tin bổ trợ theo quyền. Không tự sửa công thức J: I trống của A7/C6/D1 vẫn cho J=0 đúng Excel. Bảng chưa nhập vẫn có tổng 4 như hình mẫu. Không áp dụng cách xử lý ô trống hay chặn xếp loại do thiếu dữ liệu của bản KPI.md trước.

Triển khai đủ 26 KPI, trọng số, ngưỡng, tổng theo nhóm, xếp loại theo điểm, điều kiện chặn/kết luận quản trị theo quy định được cung cấp, lưu hồ sơ theo kỳ/đơn vị và xuất Excel ba sheet. Chưa có quy định xử phạt thì không tự đặt mức hạ xếp loại. Chưa có định nghĩa tử/mẫu số thì giữ nhập tay.

Khảo sát source trước khi sửa; kiểm thử đúng công thức, đặc biệt ô trống, D1 và C6; chạy build và hồi quy chức năng cũ. Bàn giao bằng chứng kiểm thử, hướng dẫn và rollback; không tự chạy migration trên dữ liệu production.
```
