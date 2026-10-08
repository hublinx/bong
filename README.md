# Tôi & Bông ♡

Một cuốn nhật kí kỉ niệm nhỏ, sang trọng, dành riêng cho hai người. Mọi thứ được lưu trong Google Drive của chính bạn.

## Có gì bên trong

- **Đăng nhập bằng Google**: hai tài khoản dùng chung một cuốn nhật kí, mời nhau bằng email.
- **Lưu trữ trên Google Drive**: dữ liệu và ảnh nằm trong thư mục `Tôi & Bông ♡`. Ảnh bạn tự thả vào thư mục Drive cũng hiện trong Kho ảnh.
- **Bộ đếm ngày bên nhau**: số ngày, năm/tháng/ngày, đếm ngược tới ngày kỉ niệm tròn năm và mốc trăm ngày kế tiếp.
- **Dòng thời gian kỉ niệm**: tiêu đề, ngày, nơi chốn, cảm xúc, câu chuyện, #thẻ, nhiều ảnh. Tìm kiếm không cần gõ dấu, lọc theo cảm xúc và mục yêu thích, có cả *Ngày này năm xưa*.
- **Hành trình**: mở một dòng thời gian mới cho từng chuyến đi, kế hoạch, dự định hay câu chuyện riêng.
  - Có ngày đi/về, đếm ngược ngày khởi hành, trạng thái *đang diễn ra* hoặc *đã đi qua*.
  - Checklist việc cần làm, có gợi ý sẵn cho chuyến đi.
  - Thêm được các điểm đến *dự kiến* trước khi đi.
- **Khoảnh khắc (kiểu Locket)**: mở camera chụp ngay trong app, khung vuông, đổi camera trước/sau, flash màn hình, thêm lời nhắn, gửi cho người ấy. Người kia thả cảm xúc 😍, chạm đúp để thả tim, và lưu được khoảnh khắc thành kỉ niệm.
- **Kho ảnh**: toàn bộ ảnh trong thư mục Drive xếp dạng masonry. Bấm vào ảnh để xem toàn màn hình, vuốt để chuyển ảnh.
- **Lời nhắn**: bức tường giấy nhớ viết tay, ghim lời nhắn quan trọng.
- **Cài lên điện thoại** như một app (PWA). Giao diện tối ưu cho cả điện thoại lẫn máy tính.
- **Chế độ dùng thử**: chạy ngay không cần Google, dữ liệu chỉ nằm trên trình duyệt.

## Bắt đầu

1. Làm theo **[SETUP-GOOGLE.md](./SETUP-GOOGLE.md)** để lấy Google Client ID (miễn phí, làm một lần).
2. Chạy trên máy:

   ```bash
   npm install
   cp .env.example .env   # rồi dán Client ID vào
   npm run dev            # mở http://localhost:5173
   ```

## Đưa lên mạng (GitHub Pages)

Workflow `.github/workflows/deploy.yml` tự build và deploy mỗi khi push lên `main`. Cần làm hai việc một lần:

1. **Settings → Pages → Source: GitHub Actions**
2. **Settings → Secrets and variables → Actions → Variables**: thêm `VITE_GOOGLE_CLIENT_ID`

Camera cần HTTPS, mà GitHub Pages có sẵn HTTPS.

## Công nghệ

React 18 · TypeScript · Vite · Framer Motion · Google Identity Services · Google Drive API v3 · IndexedDB (`idb`) để cache ảnh
