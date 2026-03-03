# 🚚 Giao Hàng Tận Nơi (GiaoHangTanNoi)

Dự án ứng dụng giao đồ ăn trực tuyến hoàn thiện (Full-stack) được xây dựng với kiến trúc hiện đại, tích hợp bản đồ thời gian thực và Trí tuệ nhân tạo (AI).

---

## 🛠️ 1. Yêu cầu hệ thống (Prerequisites)

Để chạy được dự án này, bạn cần cài đặt các công cụ sau trước:

1.  **Node.js (Bản 18.x trở lên):** Môi trường chạy JavaScript chính.
    *   👉 [Tải Node.js LTS tại đây](https://nodejs.org/)
2.  **MySQL Server:** Hệ quản trị cơ sở dữ liệu để lưu trữ người dùng, sản phẩm, đơn hàng.
    *   👉 [Tải MySQL Installer tại đây](https://dev.mysql.com/downloads/installer/)
3.  **Git:** Công cụ để tải mã nguồn từ GitHub.
    *   👉 [Tải Git tại đây](https://git-scm.com/downloads)
4.  **Visual Studio Code (Khuyên dùng):** Trình soạn thảo mã nguồn tốt nhất.
    *   👉 [Tải VS Code tại đây](https://code.visualstudio.com/)

---

## 📦 2. Hướng dẫn Cài đặt Thư viện

Sau khi tải dự án về máy, bạn cần cài đặt các thư viện (dependencies) cho cả Server và Client.

### Bước 1: Cài đặt cho Server (Tại thư mục gốc)
Mở terminal tại thư mục `GiaoHangTanNoi/` và chạy:
```bash
npm install
```
*Lệnh này sẽ tự động cài: Express, MySQL2, Socket.io, Gemini AI, Multer, Bcrypt, v.v.*

### Bước 2: Cài đặt cho Client (Giao diện)
Chuyển vào thư mục client và cài đặt:
```bash
cd client
npm install
```
*Lệnh này sẽ cài: Vue 3, Vite, Tailwind CSS, Leaflet (Bản đồ), Pinia (Giỏ hàng), v.v.*

---

## ⚙️ 3. Cấu hình Cơ sở dữ liệu & Môi trường

1.  **Tạo Database:**
    *   Mở MySQL (Workbench hoặc Command Line).
    *   Tạo database mới: `CREATE DATABASE giaohangtannoi;`
    *   Sử dụng database: `USE giaohangtannoi;`
    *   Chạy nội dung file `server/schema.sql` (nếu có) để tạo bảng.

2.  **Biến môi trường (.env):**
    *   Tạo file `.env` tại thư mục gốc (copy từ `.env.example`).
    *   Điền thông tin MySQL và **Gemini API Key** (Lấy tại [Google AI Studio](https://aistudio.google.com/app/apikey)).

---

## 🚀 4. Khởi động ứng dụng

Bạn có thể khởi chạy cả Client và Server cùng lúc chỉ với một câu lệnh duy nhất tại thư mục gốc:

```bash
# Quay lại thư mục gốc nếu đang ở trong client
cd ..

# Chạy chế độ phát triển (Development)
npm run dev
```

*   **Frontend (Giao diện):** [http://localhost:5173](http://localhost:5173)
*   **Backend (Máy chủ API):** [http://localhost:3000](http://localhost:3000)

---

## 🌟 Các tính năng chính
- 🔐 **Bảo mật:** Đăng nhập, đăng ký, mã hóa mật khẩu với Bcrypt.
- 🍕 **Mua sắm:** Xem món ăn, thêm vào giỏ hàng, thanh toán.
- 🗺️ **Bản đồ:** Theo dõi đường đi của tài xế thời gian thực bằng Leaflet.
- 🤖 **AI Support:** Chatbot thông minh hỗ trợ khách hàng (Gemini AI).
- 📱 **Real-time:** Thông báo đơn hàng và cập nhật trạng thái ngay lập tức qua Socket.io.

---

**Liên hệ hỗ trợ:** [haiquan2482006@gmail.com](mailto:haiquan2482006@gmail.com)
