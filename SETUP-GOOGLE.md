# Kết nối Google Drive & đăng nhập

App lưu toàn bộ kỉ niệm, ảnh và khoảnh khắc vào **Google Drive của bạn**, và hai người cùng đăng nhập bằng tài khoản Google.
Để làm được vậy cần tạo một **OAuth Client ID** (miễn phí, chỉ làm một lần, mất khoảng 10 phút).

## 1. Tạo project trên Google Cloud

1. Vào <https://console.cloud.google.com/> và đăng nhập bằng Gmail của bạn.
2. Bấm chọn project ở thanh trên cùng, chọn **New Project**, đặt tên `Toi va Bong`, rồi bấm **Create**.

## 2. Bật Google Drive API

1. Vào **APIs & Services → Library**.
2. Tìm **Google Drive API** rồi bấm **Enable**.

## 3. Cấu hình màn hình đồng ý (OAuth consent screen)

1. Vào **APIs & Services → OAuth consent screen** (giao diện mới gọi là **Google Auth Platform**).
2. Chọn **External** rồi điền:
   - App name: `Hùng & Linh`
   - User support email và Developer contact: Gmail của bạn
3. Ở mục **Data access / Scopes**, thêm scope `https://www.googleapis.com/auth/drive`.
4. Ở mục **Audience / Test users**, bấm **Add users** và thêm **cả Gmail của bạn lẫn Gmail của Linh**.
   Để app ở trạng thái **Testing**, không cần gửi Google xét duyệt.

> Khi đăng nhập lần đầu, Google sẽ báo *"Google hasn't verified this app"*.
> Đây là app của chính bạn nên cứ bấm **Continue**, sau đó tick ô cho phép truy cập Drive.

## 4. Tạo OAuth Client ID

1. Vào **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Ở **Authorized JavaScript origins**, thêm các địa chỉ sẽ mở app:
   - `http://localhost:5173` (khi chạy thử trên máy)
   - `https://hublinx.github.io` (nếu dùng GitHub Pages; thay bằng domain của bạn nếu khác)
4. Bấm **Create** rồi copy **Client ID** (dạng `xxxx.apps.googleusercontent.com`).

## 5. Gắn Client ID vào app

**Chạy trên máy:** tạo file `.env` ở thư mục gốc:

```
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

rồi chạy `npm run dev`.

**GitHub Pages:** vào repo trên GitHub, chọn **Settings → Secrets and variables → Actions → tab Variables → New repository variable**:

- Name: `VITE_GOOGLE_CLIENT_ID`
- Value: Client ID vừa copy

Sau đó chạy lại workflow **Deploy to GitHub Pages** (hoặc push lên `main`).

> Client ID không phải bí mật, ai cũng thấy được trong code web. Chỉ những email nằm trong danh sách Test users mới đăng nhập được.

## 6. Dùng chung với Linh

1. Bạn đăng nhập trước và bấm **Tạo cuốn nhật kí mới trên Drive**.
   App sẽ tạo thư mục **Hùng & Linh ♡** trong Drive của bạn, gồm:
   - `bong-data.json`: toàn bộ kỉ niệm, hành trình, lời nhắn (đừng xoá file này)
   - `Ảnh kỉ niệm/`: ảnh của các kỉ niệm. Bạn cũng có thể thả ảnh thẳng vào đây bằng app Google Drive, ảnh sẽ hiện trong **Kho ảnh**.
   - `Khoảnh khắc/`: ảnh chụp nhanh
2. Vào **Cài đặt → Mời người ấy**, nhập Gmail của Linh rồi bấm **Gửi lời mời**.
3. Linh mở app và đăng nhập bằng Gmail đó. App sẽ tự tìm thấy cuốn nhật kí được chia sẻ.

Hai người cùng xem và cùng viết. App tự đồng bộ khoảng 15 giây một lần, nên khoảnh khắc người kia vừa gửi sẽ hiện ra rất nhanh.

## Câu hỏi thường gặp

- **Phải đăng nhập lại sau mỗi giờ?** Google chỉ cấp quyền truy cập trong 1 giờ. Khi hết hạn, app hiện thanh *"Phiên đăng nhập đã hết hạn"*, bấm **Tiếp tục** là xong, không mất dữ liệu.
- **Trên iPhone:** nên mở bằng Safari. Nếu đã "Thêm vào màn hình chính" mà popup đăng nhập không mở được, hãy đăng nhập trong Safari trước.
- **Xoá kỉ niệm có xoá ảnh trên Drive không?** Không. Ảnh vẫn nằm trong thư mục Drive, coi như kho chung của hai đứa.
