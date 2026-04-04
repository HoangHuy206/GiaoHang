#!/bin/bash

# Script setup dự án GiaoHangTanNoi trên Ubuntu VPS

echo "🚀 Bắt đầu quá trình setup dự án..."

# 1. Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# 2. Cài đặt Node.js (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Cài đặt MySQL
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql

# 4. Cài đặt PM2
sudo npm install -g pm2

# 5. Cài đặt dependencies dự án
npm install
npm run build

# 6. Hướng dẫn người dùng
echo ""
echo "✅ Đã cài đặt xong môi trường cơ bản."
echo "👉 Bước tiếp theo:"
echo "1. Cấu hình file .env (Sử dụng .env.example làm mẫu)"
echo "2. Khởi tạo database: node server/init_db.js"
echo "3. Di cư dữ liệu sang MongoDB (nếu cần): node server/migrate_users_to_mongo.js"
echo "4. Chạy dự án bằng PM2: pm2 start server/index.js --name GHTN"
echo ""
echo "🚀 Chúc mừng bạn đã sẵn sàng đưa web lên VPS!"
