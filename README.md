# Tôi & Bông ♡

Một cuốn nhật kí kỉ niệm nhỏ, sang trọng, dành riêng cho hai người.

## Có gì bên trong

- **Bộ đếm ngày bên nhau**: số ngày, năm/tháng/ngày, đếm ngược tới ngày kỉ niệm tròn năm và mốc trăm ngày kế tiếp.
- **Dòng thời gian**: mỗi kỉ niệm có tiêu đề, ngày, nơi chốn, cảm xúc, câu chuyện, #thẻ và nhiều ảnh. Các kỉ niệm được nhóm theo năm, đường thời gian sáng dần khi cuộn.
- **Tìm kiếm và lọc**: tìm không cần gõ dấu, lọc theo cảm xúc và mục yêu thích.
- **Ngày này năm xưa**: tự nhắc lại những kỉ niệm cùng ngày của các năm trước.
- **Kho ảnh**: toàn bộ ảnh xếp dạng masonry. Bấm vào ảnh để xem toàn màn hình, vuốt hoặc dùng phím ← → để chuyển ảnh, có thể tải ảnh về.
- **Những lời nhắn**: bức tường giấy nhớ viết tay, chọn người viết, đổi màu giấy, ghim lời nhắn quan trọng.
- **Sao lưu và khôi phục**: xuất toàn bộ kỉ niệm (gồm cả ảnh) ra một file `.json`, rồi nhập lại trên máy khác.
- **Cài được lên điện thoại** như một app (Add to Home Screen), giao diện tối ưu cho cả điện thoại lẫn máy tính.

## Dữ liệu được lưu ở đâu?

Mọi thứ nằm **riêng tư trong trình duyệt của thiết bị đang dùng** (IndexedDB), không gửi lên máy chủ nào cả.
Ảnh được nén lại (tối đa 2000px) để tiết kiệm dung lượng.

> ⚠️ Nếu xoá dữ liệu trình duyệt thì kỉ niệm cũng mất theo. Thỉnh thoảng hãy vào **Cài đặt → Tải bản sao lưu**.
> Muốn xem trên máy khác thì dùng **Khôi phục từ file** ở máy đó.

## Chạy thử

```bash
npm install
npm run dev       # mở http://localhost:5173
npm run build     # build ra thư mục dist/
```

## Đưa lên mạng (GitHub Pages)

Repo đã có sẵn workflow `.github/workflows/deploy.yml`, tự build và deploy mỗi khi push lên `main`.
Chỉ cần bật một lần: **Settings → Pages → Source: GitHub Actions**.

Thư mục `dist/` là web tĩnh nên cũng deploy được lên Netlify, Vercel hay Cloudflare Pages.

## Công nghệ

React 18 · TypeScript · Vite · Framer Motion · IndexedDB (`idb`)
