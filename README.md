# 🛵 GiaoHangTanNoi - Hệ thống Đặt hàng & Giao hàng Trực tuyến Toàn diện

**GiaoHangTanNoi** là một nền tảng thương mại điện tử hiện đại dành cho việc đặt món ăn và giao hàng, kết nối liền mạch giữa **Khách hàng**, **Cửa hàng (Shop)** và **Tài xế**. Dự án tích hợp các công nghệ thời gian thực (Real-time), Trợ lý ảo AI đa nền tảng và hệ thống thanh toán tự động thông minh.

---

## 🌟 Tính năng nổi bật

### 1. Đối với Khách hàng
- **🛒 Đặt hàng thông minh:** Giao diện trực quan, dễ dàng tìm kiếm quán ăn và món ngon.
- **💳 Thanh toán QR tự động:** Tích hợp **SePay (VietQR)**. Sau khi quét mã, hệ thống tự động xác nhận thanh toán qua Webhook, cập nhật trạng thái đơn hàng và phát âm thanh thông báo ngay lập tức.
- **🗺️ Theo dõi Real-time:** Theo dõi vị trí tài xế di chuyển trên bản đồ trực tuyến (Leaflet) theo thời gian thực.
- **🤖 Trợ lý ảo AI (Gemini & Groq):** Chatbot thông minh hỗ trợ giải đáp thắc mắc, tư vấn món ăn và hỗ trợ đặt hàng nhanh chóng.
- **📧 Email xác nhận:** Tự động gửi email hóa đơn chi tiết ngay khi đơn hàng được xác nhận thành công.

### 2. Đối với Tài xế
- **🔔 Nhận đơn tức thì:** Thông báo đơn hàng mới trong khu vực qua Socket.io.
- **📍 Điều hướng bản đồ:** Tự động định vị từ vị trí hiện tại đến Shop lấy hàng và từ Shop đến địa chỉ khách hàng.
- **💬 Chat trực tuyến:** Nhắn tin trực tiếp với khách hàng ngay trong ứng dụng để trao đổi về đơn hàng.
- **📊 Quản lý thu nhập:** Theo dõi lịch sử giao hàng và doanh thu cá nhân.

### 3. Đối với Chủ quán (Shop)
- **📊 Quản lý đơn hàng:** Quy trình xử lý đơn hàng chuyên nghiệp (Chờ xác nhận -> Đã xác nhận -> Tìm tài xế -> Đã lấy hàng -> Đã giao).
- **📈 Thống kê kinh doanh:** Xem báo cáo doanh thu, món ăn bán chạy theo ngày/tháng với biểu đồ trực quan.
- **🍴 Quản lý menu & Kho:** Thêm/Sửa/Xóa món ăn, cập nhật hình ảnh và trạng thái còn hàng/hết hàng.
- **🤖 Tích hợp Telegram Bot:** Quản lý sản phẩm và nhận thông báo đơn hàng mới trực tiếp qua Telegram.

### 4. Hệ thống Quản trị (Admin)
- Quản lý toàn bộ hệ thống người dùng, tài xế và các cửa hàng.
- Kiểm soát các giao dịch thanh toán và xử lý khiếu nại.
- Phân quyền người dùng (User, Shop, Driver, Admin).

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
- **Database:** MySQL / TiDB Cloud (Cơ sở dữ liệu phân tán hiệu năng cao)
- **Real-time Server:** Socket.io
- **AI Integration:** Google Generative AI (Gemini) & Groq Cloud API
- **Automation:** Telegram Bot API & n8n Workflows
- **Email:** Nodemailer (Gmail SMTP)
- **Security:** JWT, Bcrypt, Middleware Protection

---

## 🚀 Cấu hình và Chạy thử

### 1. Clone dự án
```bash
git clone https://github.com/HoangHuy206/GiaoHang.git
cd GiaoHang
```

### 2. Cấu hình Biến môi trường (.env)
Tạo file `.env` ở thư mục gốc và cấu hình các thông số:
```env
DB_HOST=your_db_host
DB_PORT=4000
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=GiaoHangTanNoi

GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
TELEGRAM_BOT_TOKEN=your_bot_token

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
N8N_WEBHOOK_URL=your_n8n_webhook
```

### 3. Cài đặt & Khởi chạy
```bash
# Cài đặt Backend
cd server
npm install
npm run dev

# Cài đặt Frontend
cd ../client
npm install
npm run dev
```

---

## 🤝 Liên hệ & Hỗ trợ
Nếu bạn có bất kỳ câu hỏi hoặc góp ý nào cho dự án, vui lòng liên hệ:
- **Email:** haiquan2482006@gmail.com | hhuy281220@gmail.com | dobinh225599@gmail.com 
- **Website:** [giaohangtannoi.id.vn](https://github.com/HoangHuy206/GiaoHang)

---
*Phát triển bởi đội ngũ GiaoHangTanNoi - Mang niềm vui đến tận cửa nhà bạn!* 🚀
