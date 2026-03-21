# 🛵 GiaoHangTanNoi - Hệ thống Đặt hàng & Giao hàng Trực tuyến

**GiaoHangTanNoi** là một nền tảng thương mại điện tử hiện đại dành cho việc đặt món ăn và giao hàng, kết nối liền mạch giữa **Khách hàng**, **Cửa hàng (Shop)** và **Tài xế**. Dự án tích hợp các công nghệ thời gian thực (Real-time), Trợ lý ảo AI và thanh toán tự động.

---

## 🌟 Tính năng nổi bật

### 1. Đối với Khách hàng
- **🛒 Đặt hàng thông minh:** Giao diện trực quan, dễ dàng tìm kiếm quán ăn và món ngon.
- **💳 Thanh toán QR tự động:** Tích hợp **SePay (VietQR)**. Sau khi quét mã, hệ thống tự động xác nhận thanh toán, cập nhật trạng thái đơn hàng về **0đ (Đã thanh toán)** và phát âm thanh thông báo ngay lập tức.
- **🗺️ Theo dõi Real-time:** Theo dõi vị trí tài xế di chuyển trên bản đồ trực tuyến (Leaflet) theo thời gian thực.
- **🤖 Trợ lý ảo AI:** Chatbot thông minh sử dụng **Google Gemini AI** hỗ trợ giải đáp thắc mắc và tư vấn món ăn.
- **📧 Email xác nhận:** Tự động gửi email hóa đơn chi tiết ngay khi đơn hàng được xác nhận thành công.

### 2. Đối với Tài xế
- **🔔 Nhận đơn tức thì:** Thông báo đơn hàng mới trong khu vực qua Socket.io.
- **📍 Điều hướng bản đồ:** Xem vị trí quán ăn và địa chỉ khách hàng chính xác trên bản đồ.
- **💬 Chat trực tuyến:** Chat trực tiếp với khách hàng ngay trong ứng dụng.

### 3. Đối với Chủ quán (Shop)
- **📊 Quản lý đơn hàng:** Tiếp nhận và cập nhật trạng thái đơn hàng (Đang chuẩn bị, Đã giao...).
- **📈 Thống kê kinh doanh:** Xem báo cáo doanh thu, món ăn bán chạy theo ngày/tháng.
- **🍴 Quản lý menu:** Thêm/Sửa/Xóa món ăn và cập nhật hình ảnh dễ dàng.

### 4. Hệ thống Quản trị (Admin)
- Quản lý toàn bộ người dùng, tài xế và các cửa hàng trên hệ thống.
- Duyệt và kiểm soát các giao dịch thanh toán.

---

## 🛠️ Công nghệ sử dụng

### Frontend
- **Framework:** Vue.js 3 (Vite)
- **State Management:** Pinia
- **Styling:** TailwindCSS, Vanilla CSS
- **Real-time:** Socket.io-client
- **Map:** Leaflet.js

### Backend
- **Runtime:** Node.js & Express
- **Database:** MySQL (Hỗ trợ tốt trên TiDB Cloud)
- **Real-time Server:** Socket.io
- **AI Integration:** Google Generative AI (Gemini)
- **Email:** Nodemailer (Gmail SMTP)
- **Security:** JWT (JSON Web Token), Bcrypt (Mã hóa mật khẩu)

---

## 🚀 Cài đặt và Chạy thử

### 1. Clone dự án
```bash
git clone https://github.com/your-username/GiaoHangTanNoi.git
cd GiaoHangTanNoi
```

### 2. Cấu hình Environment Variables
Tạo file `.env` trong thư mục `server/` và cấu hình các thông số sau:
```env
PORT=3000
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=GiaoHangTanNoi
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
GEMINI_API_KEY=your_gemini_key
SEPAY_WEBHOOK_KEY=SEPAY_TOKEN_2026
```

### 3. Cài đặt Dependencies
```bash
# Cài đặt cho Server
cd server
npm install

# Cài đặt cho Client
cd ../client
npm install
```

### 4. Chạy ứng dụng
```bash
# Chạy Server (tại thư mục server)
npm run dev

# Chạy Client (tại thư mục client)
npm run dev
```

---

## 📸 Demo giao diện
*(Bạn có thể thêm hình ảnh chụp màn hình dự án vào đây)*

---

## 🤝 Liên hệ hỗ trợ
Nếu bạn gặp vấn đề hoặc có đóng góp cho dự án, vui lòng liên hệ:
- **Email:** [haiquan2482006@gmail.com](mailto:haiquan2482006@gmail.com , hhuy281220@gmail.com)


---
*Dự án được phát triển với tâm huyết nhằm mang lại trải nghiệm giao hàng tốt nhất!* 🚀
