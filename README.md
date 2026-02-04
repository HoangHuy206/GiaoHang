# GiaoHangTanNoi - Ứng dụng Giao Hàng Tận Nơi

Đây là một ứng dụng giao đồ ăn trực tuyến được xây dựng với kiến trúc Full-stack hiện đại.

## 🚀 Công nghệ sử dụng

### Frontend
- **Vue.js 3**: Framework chính để xây dựng giao diện người dùng.
- **Vite**: Công cụ build frontend cực nhanh.
- **Tailwind CSS**: Framework CSS tiện dụng để thiết kế giao diện nhanh chóng.
- **Pinia**: Quản lý state cho ứng dụng.
- **Vue Router**: Điều hướng các trang trong ứng dụng.
- **Leaflet & Leaflet Routing Machine**: Bản đồ tương tác và tính toán tuyến đường giao hàng.
- **Socket.io Client**: Kết nối thời gian thực để theo dõi đơn hàng.
- **Axios**: Thực hiện các yêu cầu HTTP đến Backend.

### Backend
- **Node.js & Express**: Môi trường thực thi và Framework web cho server.
- **MySQL (mysql2)**: Cơ sở dữ liệu quan hệ để lưu trữ thông tin người dùng, sản phẩm và đơn hàng.
- **Socket.io**: Xử lý giao tiếp thời gian thực (nhắn tin, cập nhật vị trí).
- **Google Generative AI (@google/generative-ai)**: Tích hợp AI (Gemini) để hỗ trợ người dùng.
- **Nodemailer**: Gửi email thông báo.
- **Multer**: Xử lý tải lên hình ảnh sản phẩm và người dùng.
- **Bcrypt**: Mã hóa mật khẩu bảo mật.
- **n8n**: Tự động hóa quy trình công việc (Workflows).

### Công cụ hỗ trợ khác
- **Dotenv**: Quản lý biến môi trường.
- **Nodemon**: Tự động khởi động lại server khi có thay đổi code.
- **Concurrenty**: Chạy đồng thời cả Client và Server trong quá trình phát triển.
- **Compression**: Nén dữ liệu để tối ưu tốc độ truyền tải.
- **CORS**: Cho phép chia sẻ tài nguyên giữa các nguồn khác nhau.

## 🛠️ Cài đặt và Chạy ứng dụng

### 1. Cài đặt các thư viện

#### Cho Backend (Thư mục gốc)
Mở terminal tại thư mục `E:\GiaoHangTanNoi` và chạy:
```bash
npm install express mysql2 socket.io @google/generative-ai dotenv multer bcrypt nodemailer compression cors axios leafleat pinia vue-router
```
*Các thư viện dev:*
```bash
npm install -D nodemon concurrently tailwindcss postcss autoprefixer
```

#### Cho Frontend (Thư mục client)
Chuyển vào thư mục client và cài đặt:
```bash
cd client
npm install vue axios pinia vue-router socket.io-client leaflet leaflet-routing-machine @tailwindcss/postcss
```
*Các thư viện dev:*
```bash
npm install -D vite @vitejs/plugin-vue tailwindcss postcss autoprefixer
```

### 2. Cấu hình biến môi trường
Sao chép tệp `.env.example` thành `.env` tại thư mục gốc và điền các thông tin:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=giaohangtannoi
GEMINI_API_KEY=your_api_key
```

### 3. Chạy ứng dụng
Tại thư mục gốc, bạn có thể chạy nhanh bằng lệnh:
```bash
npm run dev
```
Lệnh này sẽ khởi động cả Server (nodemon) và Client (vite) cùng lúc.

- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:3000`


