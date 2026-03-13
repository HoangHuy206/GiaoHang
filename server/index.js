require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pool = require('./db');
// Handle pool errors to prevent crash
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const compression = require('compression');
const axios = require('axios');
const { saveOrderToExcel } = require('./utils/excelHelper');
const { sendOrderToN8N } = require('./utils/n8nHelper');

const app = express();
const server = http.createServer(app);

// Use compression to reduce file sizes sent over the network
app.use(compression());
app.use(cors());
app.use(express.json());

// Auto-create password_resets table
pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        INDEX(email)
    )
`).catch(err => console.error("Error creating password_resets table:", err));

// Helper to generate a unique simple Order Code (e.g., D001)
function generateOrderCode(orderId) {
    return `D${String(orderId).padStart(3, '0')}`;
}

// --- Email Config ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});

// Function to send order confirmation email
async function sendOrderConfirmationEmail(orderId, host) {
    try {
        // Fetch order details with user email and shop name
        const [orders] = await pool.query(`
            SELECT o.*, u.email as user_email, u.full_name as user_name, s.name as shop_name 
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN shops s ON o.shop_id = s.id
            WHERE o.id = ?
        `, [orderId]);

        if (orders.length === 0) return;
        const order = orders[0];

        // Fetch order items
        const [items] = await pool.query(`
            SELECT oi.*, p.name as product_name, p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [orderId]);

        if (!order.user_email) {
            console.log(`Order ${orderId}: No user email found, skipping confirmation email.`);
            return;
        }

        const attachments = [];
        const itemsHtml = items.map((item, index) => {
            let imageFileName = 'anhdaidienmacdinh.jpg';
            if (item.image_url) {
                imageFileName = item.image_url.replace('/uploads/', '').replace('uploads/', '');
            }
            
            const imagePath = path.join(__dirname, 'uploads', imageFileName);
            const cid = `product_img_${index}`;
            
            // Check if file exists to attach
            if (fs.existsSync(imagePath)) {
                attachments.push({
                    filename: imageFileName,
                    path: imagePath,
                    cid: cid
                });
            }
            
            const imgSrc = fs.existsSync(imagePath) ? `cid:${cid}` : 'https://via.placeholder.com/80';
            
            return `
                <div style="display: flex; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                    <img src="${imgSrc}" alt="${item.product_name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px;">
                    <div style="flex: 1;">
                        <p style="margin: 0; font-weight: bold; color: #333; font-size: 16px;">${item.product_name}</p>
                        <p style="margin: 5px 0 0 0; color: #666;">Số lượng: ${item.quantity}</p>
                        <p style="margin: 5px 0 0 0; color: #e44d26; font-weight: bold; font-size: 15px;">${new Intl.NumberFormat('vi-VN').format(item.price)}đ</p>
                    </div>
                </div>
            `;
        }).join('');

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Giao Hàng Tận Nơi" <${process.env.EMAIL_USER}>`,
            to: order.user_email,
            subject: `Xác nhận đơn hàng #${orderId} - ${order.shop_name}`,
            attachments: attachments,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <div style="background-color: #2e7d32; color: white; padding: 25px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">Đơn hàng đã được xác nhận!</h1>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff;">
                        <p style="font-size: 16px; color: #333;">Chào <strong>${order.user_name}</strong>,</p>
                        <p style="font-size: 15px; color: #555; line-height: 1.5;">Đơn hàng của bạn tại <strong>${order.shop_name}</strong> đã được shop xác nhận và đang chờ tài xế đến lấy.</p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #2e7d32;">
                            <p style="margin: 5px 0; font-size: 14px;"><strong>Mã đơn hàng:</strong> #${orderId}</p>
                            <p style="margin: 5px 0; font-size: 14px;"><strong>Ngày đặt:</strong> ${new Date(order.created_at).toLocaleString('vi-VN')}</p>
                            <p style="margin: 5px 0; font-size: 14px;"><strong>Địa chỉ giao:</strong> ${order.delivery_address}</p>
                        </div>

                        <h3 style="border-bottom: 2px solid #2e7d32; padding-bottom: 8px; color: #2e7d32; margin-top: 30px;">Chi tiết món ăn</h3>
                        <div style="margin-top: 15px;">
                            ${itemsHtml}
                        </div>

                        <div style="margin-top: 25px; padding-top: 15px; border-top: 2px solid #eee;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #555;">
                                <span style="flex: 1;">Tạm tính:</span>
                                <span style="width: 120px; text-align: right;">${new Intl.NumberFormat('vi-VN').format(order.items_price || 0)}đ</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #555;">
                                <span style="flex: 1;">Phí giao hàng:</span>
                                <span style="width: 120px; text-align: right;">${new Intl.NumberFormat('vi-VN').format(order.delivery_fee || 0)}đ</span>
                            </div>
                            ${(order.discount || 0) > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #d63031;">
                                <span style="flex: 1;">Khuyến mãi vận chuyển:</span>
                                <span style="width: 120px; text-align: right;">-${new Intl.NumberFormat('vi-VN').format(order.discount)}đ</span>
                            </div>` : ''}
                            <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #eee;">
                                <strong style="flex: 1; font-size: 18px; color: #333;">Tổng cộng:</strong>
                                <strong style="width: 120px; text-align: right; font-size: 20px; color: #e44d26;">${new Intl.NumberFormat('vi-VN').format(order.total_price)}đ</strong>
                            </div>
                        </div>
                        
                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #888; text-align: center;">
                            <p>Cảm ơn bạn đã tin dùng <strong>Giao Hàng Tận Nơi</strong>!</p>
                            <p>Mọi thắc mắc vui lòng liên hệ: <a href="mailto:hotro@giaohang.com" style="color: #2e7d32; text-decoration: none;">hotro@giaohang.com</a></p>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Confirmation email sent for Order #${orderId} to ${order.user_email}`);
    } catch (error) {
        console.error('❌ Lỗi gửi Email xác nhận:');
        console.error('- Thông báo:', error.message);
        console.error('- Mã lỗi:', error.code);
        if (error.response) console.error('- Phản hồi từ SMTP:', error.response);
    }
}

// --- FORGOT PASSWORD ROUTES ---
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'Email không tồn tại trong hệ thống.' });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await pool.query('DELETE FROM password_resets WHERE email = ?', [email]);
        await pool.query('INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)', [email, code, expiresAt]);

        const mailOptions = {
            from: '"hotro@giaohang.com" <hh9393100@gmail.com>',
            to: email,
            subject: 'Mã xác nhận thay đổi mật khẩu - Giao Hàng Tận Nơi',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; padding: 25px;">
                    <h2 style="color: #2e7d32; text-align: center;">Mã Xác Nhận Đổi Mật Khẩu</h2>
                    <p>Chào bạn,</p>
                    <p>Hệ thống nhận được yêu cầu thay đổi mật khẩu cho tài khoản liên kết với email này.</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <h1 style="letter-spacing: 10px; color: #333; margin: 0;">${code}</h1>
                    </div>
                    <p style="color: #666; font-size: 13px;">Mã này có hiệu lực trong <strong>5 phút</strong>. Vui lòng không cung cấp mã này cho bất kỳ ai khác.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="text-align: center; font-size: 12px; color: #888;">Giao Hàng Tận Nơi - Dịch vụ giao hàng uy tín</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Mã xác thực đã được gửi về email của bạn.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi hệ thống khi gửi email.' });
    }
});

app.post('/api/verify-code', async (req, res) => {
    const { email, code } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM password_resets WHERE email = ? AND code = ? AND expires_at > NOW()', [email, code]);
        if (rows.length > 0) res.json({ success: true });
        else res.status(400).json({ error: 'Mã xác thực không đúng hoặc đã hết hạn.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM password_resets WHERE email = ? AND code = ? AND expires_at > NOW()', [email, code]);
        if (rows.length === 0) return res.status(400).json({ error: 'Yêu cầu không hợp lệ hoặc mã đã hết hạn.' });
        await pool.query('UPDATE users SET password = ? WHERE email = ?', [newPassword, email]);
        await pool.query('DELETE FROM password_resets WHERE email = ?', [email]);
        res.json({ success: true, message: 'Mật khẩu đã được thay đổi thành công!' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Start the Telegram & Web payment reminder service
const reminderService = require('./utils/paymentReminders')(io);

const onlineDrivers = new Map();

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(deg2rad(lat1))*Math.cos(deg2rad(lat2)) * Math.sin(dLon/2)*Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function deg2rad(deg) { return deg * (Math.PI/180); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1d', etag: true }));
app.use(express.static(path.join(__dirname, '../client/dist'), { maxAge: '1h', etag: true }));

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join_room', (room) => socket.join(room));
    socket.on('update_driver_location', (data) => {
        onlineDrivers.set(socket.id, { ...data, socketId: socket.id });
    });
    socket.on('driver_location', (data) => io.to(`order_${data.orderId}`).emit('update_driver_location', data));
    socket.on('place_order', (data) => io.to(`shop_${data.shop_id}`).emit('new_order', data));
    socket.on('driver_status_change', (data) => { if (data.status === 'offline') onlineDrivers.delete(socket.id); });
    socket.on('send_message', async (data) => {
        const { orderId, senderId, content } = data;
        try {
            await pool.query('INSERT INTO messages (order_id, sender_id, content) VALUES (?, ?, ?)', [orderId, senderId, content]);
            io.to(`order_${orderId}`).emit('receive_message', { orderId, senderId, content, created_at: new Date() });
        } catch (err) { console.error(err); }
    });
    socket.on('typing', (data) => socket.to(`order_${data.orderId}`).emit('typing', data));
    socket.on('stop_typing', (data) => socket.to(`order_${data.orderId}`).emit('stop_typing', data));
    socket.on('disconnect', () => onlineDrivers.delete(socket.id));
});

// --- Helper to send Telegram Message ---
async function sendTelegramMessage(chatId, text) {
    if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) {
        console.warn("⚠️ Không thể gửi Telegram: ChatId hoặc TELEGRAM_BOT_TOKEN bị thiếu.");
        return;
    }
    try {
        await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: text
        });
        console.log(`✅ Đã gửi thông báo Telegram tới ChatId: ${chatId}`);
    } catch (error) {
        console.error("❌ Lỗi gửi Telegram:", error.response ? error.response.data : error.message);
    }
}

// --- WEBHOOK HANDLER ---
async function handleWebhook(req, res) {
    let connection;
    try {
        const { content, amount, transferAmount, description, orderCode } = req.body;
        console.log("✅ [Webhook] Nhận dữ liệu từ Sepay:", req.body);
        
        const finalAmount = amount || transferAmount || 0;
        let detectedOrderCode = null;

        const incomingContent = String(content || description || "");
        const match = incomingContent.match(/((?:D|DH)\d+)/i) || incomingContent.match(/((?:D|DH)\s+\d+)/i);
        
        if (match) {
            detectedOrderCode = match[1].replace(/\s/g, '').toUpperCase();
        } else if (orderCode) {
            detectedOrderCode = String(orderCode).toUpperCase();
        }

        if (!detectedOrderCode) {
            console.error("❌ Webhook lỗi: Không tìm thấy mã đơn trong nội dung:", incomingContent);
            return res.status(200).json({ success: false, message: "No order code found" });
        }

        const orderIdNum = parseInt(detectedOrderCode.replace(/\D/g, ''));
        const standardizedCode = `D${String(orderIdNum).padStart(3, '0')}`;

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Cập nhật giao dịch
        await connection.query(
            'INSERT INTO transactions (order_code, amount, content, gateway) VALUES (?, ?, ?, ?)',
            [standardizedCode, finalAmount, incomingContent, 'sepay']
        );

        // 2. Cập nhật đơn hàng
        await connection.query(
            "UPDATE orders SET status = 'finding_driver', payment_status = 'paid', paid_at = NOW() WHERE id = ?", 
            [orderIdNum]
        );

        // Gửi email xác nhận ngay khi thanh toán thành công
        sendOrderConfirmationEmail(orderIdNum, req.headers.host).catch(err => console.error("Email error after payment:", err));

        // 3. Lấy thông tin chi tiết
        const [fullOrderRows] = await connection.query(`
            SELECT o.*, s.name as shop_name, s.address as shop_address, s.lat as shop_lat, s.lng as shop_lng, s.telegram_chat_id, u.full_name as customer_name, u.phone as customer_phone, u.email as user_email
            FROM orders o
            JOIN shops s ON o.shop_id = s.id
            JOIN users u ON o.user_id = u.id
            WHERE o.id = ?`, [orderIdNum]);

        if (fullOrderRows.length === 0) {
            await connection.rollback();
            return res.status(200).json({ success: false, message: "Order not found in DB" });
        }

        const fullOrder = fullOrderRows[0];

        // 4. Bắn Socket cho Khách hàng
        io.to(`order_${orderIdNum}`).emit('payment_success', { 
            orderId: orderIdNum,
            status: 'finding_driver',
            message: 'Thanh toán thành công'
        });
        
        // 5. Nổ đơn cho Tài xế
        const socketData = {
            orderId: orderIdNum,
            ma_don_hang: standardizedCode,
            ten_khach_hang: fullOrder.customer_name,
            ten_mon_an: "Đơn hàng mới từ QR",
            tong_tien: new Intl.NumberFormat('vi-VN').format(finalAmount) + 'đ',
            ten_quan: fullOrder.shop_name,
            hinh_anh_quan: fullOrder.image_url,
            lat_don: Number(fullOrder.shop_lat),
            lng_don: Number(fullOrder.shop_lng),
            dia_chi_giao: fullOrder.delivery_address,
            lat_tra: Number(fullOrder.delivery_lat),
            lng_tra: Number(fullOrder.delivery_lng)
        };
        io.emit('place_order', socketData);

        await connection.commit();
        res.status(200).json({ success: true });
        console.log(`🚀 Xử lý xong Webhook cho đơn #${orderIdNum}.`);

        // 6. Xử lý tác vụ nền (Gửi Telegram + Sync Excel/n8n)
        setTimeout(async () => {
            try {
                const [checkRows] = await pool.query(
                    "SELECT status, customer_bank_code, customer_bank_account, customer_bank_name, total_price FROM orders WHERE id = ?", 
                    [orderIdNum]
                );
                
                if (checkRows.length > 0 && checkRows[0].status === 'finding_driver') {
                    const orderInfo = checkRows[0];
                    // CHỈ GỬI CHO SHOP (ChatId lưu trong bảng shops)
                    if (fullOrder.telegram_chat_id) {
                        let msg = `⚠️ HOÀN TIỀN: Đơn ${standardizedCode} của Shop ${fullOrder.shop_name} chưa có tài xế sau 2p.\n`;
                        msg += `💰 Số tiền cần hoàn: ${finalAmount.toLocaleString()}đ\n`;

                        if (orderInfo.customer_bank_code && orderInfo.customer_bank_account) {
                            const qrUrl = `https://img.vietqr.io/image/${orderInfo.customer_bank_code}-${orderInfo.customer_bank_account}-compact.png?amount=${finalAmount}&addInfo=Hoan tien don ${standardizedCode}&accountName=${encodeURIComponent(orderInfo.customer_bank_name || '')}`;
                            msg += `\n🏦 QR HOÀN TIỀN CỦA KHÁCH:\n${qrUrl}\n\n(Shop quét mã trên để hoàn tiền nhanh cho khách)`;
                        } else {
                            msg += `\n❌ Khách hàng không cung cấp thông tin ngân hàng.`;
                        }

                        await sendTelegramMessage(fullOrder.telegram_chat_id, msg);
                    }
                }
            } catch (e) { console.error("Timer error:", e); }
        }, 120000);

        // Background Sync
        (async () => {
            try {
                const [itemRows] = await pool.query(`
                    SELECT p.name, p.product_code, oi.quantity 
                    FROM order_items oi 
                    JOIN products p ON oi.product_id = p.id 
                    WHERE oi.order_id = ?`, [orderIdNum]);
                
                const itemNames = itemRows.map(i => `${i.product_code || ''} ${i.name} (${i.quantity})`).join(', ');

                const payload = {
                    orderId: standardizedCode,
                    customerName: fullOrder.customer_name,
                    phone: fullOrder.customer_phone,
                    address: fullOrder.delivery_address,
                    shopName: fullOrder.shop_name,
                    items: itemNames,
                    totalPrice: finalAmount,
                    status: 'finding_driver'
                };

                await saveOrderToExcel(payload);
                sendOrderToN8N(payload).catch(() => {});
            } catch (syncErr) { console.error("Sync error:", syncErr); }
        })();

    } catch (err) {
        if (connection) await connection.rollback();
        console.error("❌ Webhook Error:", err);
        res.status(200).json({ success: false, error: "Internal Error" });
    } finally {
        if (connection) connection.release();
    }
}

// Routes
app.post('/sepay-hook', handleWebhook);
app.post('/api/payment/webhook', handleWebhook);

app.get('/api/payment/check/:code', async (req, res) => {
    const { code } = req.params;
    try {
        const [transRows] = await pool.query('SELECT * FROM transactions WHERE order_code = ? LIMIT 1', [code]);
        if (transRows.length > 0) return res.json({ paid: true });
        
        const orderIdNum = parseInt(code.replace(/\D/g, ''));
        if (!isNaN(orderIdNum)) {
            const [orderRows] = await pool.query('SELECT payment_status FROM orders WHERE id = ?', [orderIdNum]);
            if (orderRows.length > 0 && orderRows[0].payment_status === 'paid') return res.json({ paid: true });
        }
        res.json({ paid: false });
    } catch (err) { res.json({ paid: false }); }
});

// --- AUTH & OTHER ROUTES ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            const user = rows[0];
            res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name, address: user.address, phone: user.phone, avatar_url: user.avatar_url, email: user.email, telegram_chat_id: user.telegram_chat_id } });
        } else res.status(401).json({ error: 'Invalid credentials' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PRODUCT ROUTES ---
app.post('/api/products', upload.single('image'), async (req, res) => {
    const { shopId, name, price, productCode } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : '/uploads/anhdaidienmacdinh.jpg';

    try {
        const [result] = await pool.query(
            'INSERT INTO products (shop_id, name, price, product_code, image_url) VALUES (?, ?, ?, ?, ?)',
            [shopId, name, price, productCode, image_url]
        );
        res.json({ success: true, productId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    const { name, price, productCode } = req.body;
    let query = 'UPDATE products SET name = ?, price = ?, product_code = ?';
    let params = [name, price, productCode];

    if (req.file) {
        query += ', image_url = ?';
        params.push(`/uploads/${req.file.filename}`);
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    try {
        await pool.query(query, params);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- TEST & SIMULATION ROUTES ---
app.post('/api/test/simulate-refund', async (req, res) => {
    const { orderId, amount, customerName, bankCode, bankAccount } = req.body;
    const orderCode = `D${String(orderId).padStart(3, '0')}`;
    
    try {
        // Gửi thông báo Telegram giả lập hoàn tiền
        const [shopRows] = await pool.query('SELECT telegram_chat_id, name FROM shops WHERE id = (SELECT shop_id FROM orders WHERE id = ?)', [orderId]);
        
        if (shopRows.length > 0 && shopRows[0].telegram_chat_id) {
            let msg = `🧪 [TEST MODE] Yêu cầu hoàn tiền đơn ${orderCode}\n`;
            msg += `💰 Số tiền: ${Number(amount).toLocaleString()}đ\n`;
            msg += `👤 Khách hàng: ${customerName}\n`;
            
            if (bankCode && bankAccount) {
                msg += `🏦 Ngân hàng: ${bankCode} - ${bankAccount}\n`;
            }

            await sendTelegramMessage(shopRows[0].telegram_chat_id, msg);
            res.json({ success: true, message: "Đã gửi yêu cầu hoàn tiền giả lập tới Telegram của Shop." });
        } else {
            res.json({ success: false, message: "Shop chưa cấu hình Telegram Chat ID." });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, role, full_name, address, phone, avatar_url, email, telegram_chat_id FROM users WHERE id = ?', [req.params.id]);
        if (rows.length > 0) res.json(rows[0]);
        else res.status(404).json({ error: 'User not found' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', upload.single('avatar'), async (req, res) => {
    const { full_name, address, phone, email } = req.body;
    const avatar_url = req.file ? `/uploads/${req.file.filename}` : null;
    
    try {
        let query = 'UPDATE users SET full_name = ?, address = ?, phone = ?, email = ?';
        let params = [full_name, address, phone, email];
        
        if (avatar_url) {
            query += ', avatar_url = ?';
            params.push(avatar_url);
        }
        
        query += ' WHERE id = ?';
        params.push(req.params.id);
        
        await pool.query(query, params);
        
        // Return updated user info
        const [updated] = await pool.query('SELECT id, username, role, full_name, address, phone, avatar_url, email, telegram_chat_id FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, user: updated[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/shops', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM shops ORDER BY id DESC');
        res.json(rows);
    } catch (err) { res.json([]); }
});

app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.*, s.name as shop_name 
            FROM products p 
            JOIN shops s ON p.shop_id = s.id 
            ORDER BY p.id DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("Lỗi lấy sản phẩm:", err);
        res.json([]);
    }
});

app.get('/api/shops/:id', async (req, res) => {
    try {
        const [shop] = await pool.query('SELECT * FROM shops WHERE id = ?', [req.params.id]);
        const [products] = await pool.query('SELECT * FROM products WHERE shop_id = ?', [req.params.id]);
        res.json({ ...shop[0], products });
    } catch (err) { res.status(404).json({ error: 'Not found' }); }
});

app.put('/api/shops/:id', async (req, res) => {
    const { name, address, bank_code, bank_account, telegram_chat_id } = req.body;
    try {
        await pool.query(
            'UPDATE shops SET name = ?, address = ?, bank_code = ?, bank_account = ?, telegram_chat_id = ? WHERE id = ?',
            [name, address, bank_code, bank_account, telegram_chat_id, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN ROUTES ---
app.get('/api/admin/shops', async (req, res) => {
    const { userId } = req.query;
    try {
        // Verify if user is truly the admin with the specific Telegram ID
        const [userCheck] = await pool.query('SELECT role, telegram_chat_id FROM users WHERE id = ?', [userId]);
        if (userCheck.length === 0 || userCheck[0].role !== 'admin' || userCheck[0].telegram_chat_id !== '5807941249') {
            return res.status(403).json({ error: 'Truy cập bị từ chối. Chỉ Admin với ID 5807941249 mới có quyền này.' });
        }

        const [rows] = await pool.query(`
            SELECT s.*, u.username as owner_username, u.full_name as owner_name, u.phone as owner_phone, u.email as owner_email, u.created_at as registration_date
            FROM shops s
            LEFT JOIN users u ON s.user_id = u.id
            ORDER BY s.id DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/shops/:id', async (req, res) => {
    const { userId: adminUserId } = req.body;
    const shopId = req.params.id;

    try {
        // Verify admin
        const [userCheck] = await pool.query('SELECT role, telegram_chat_id FROM users WHERE id = ?', [adminUserId]);
        if (userCheck.length === 0 || userCheck[0].role !== 'admin' || userCheck[0].telegram_chat_id !== '5807941249') {
            return res.status(403).json({ error: 'Chỉ Admin chính chủ mới có thể xóa Shop.' });
        }
    } catch (e) { return res.status(500).json({ error: e.message }); }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 0. Get Owner User ID
        const [shopInfo] = await connection.query('SELECT user_id FROM shops WHERE id = ?', [shopId]);
        const ownerId = shopInfo.length > 0 ? shopInfo[0].user_id : null;

        // 1. Delete reviews
        await connection.query('DELETE FROM reviews WHERE order_id IN (SELECT id FROM orders WHERE shop_id = ?)', [shopId]);

        // 2. Delete order items
        await connection.query(`
            DELETE oi FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.shop_id = ?
        `, [shopId]);

        // 3. Delete orders
        await connection.query('DELETE FROM orders WHERE shop_id = ?', [shopId]);

        // 4. Delete favorites
        await connection.query('DELETE FROM favorites WHERE shop_id = ?', [shopId]);

        // 5. Delete products
        await connection.query('DELETE FROM products WHERE shop_id = ?', [shopId]);

        // 6. Delete the shop
        await connection.query('DELETE FROM shops WHERE id = ?', [shopId]);

        // 7. Finally, delete the owner user
        if (ownerId) {
            await connection.query('DELETE FROM users WHERE id = ?', [ownerId]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Shop và Tài khoản chủ quán đã được xóa sạch.' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/orders', async (req, res) => {
    const { userId, shopId, items, totalPrice, itemsPrice, deliveryFee, discount, deliveryAddress, deliveryLat, deliveryLng, customerBankCode, customerBankAccount, customerBankName } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query(
            'INSERT INTO orders (user_id, shop_id, status, total_price, items_price, delivery_fee, discount, delivery_address, delivery_lat, delivery_lng, customer_bank_code, customer_bank_account, customer_bank_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, shopId, 'pending', totalPrice, itemsPrice || 0, deliveryFee || 0, discount || 0, deliveryAddress, deliveryLat, deliveryLng, customerBankCode, customerBankAccount, customerBankName]
        );
        const orderId = result.insertId;
        for (const item of items) {
            await connection.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, item.productId, item.quantity, item.price]);
        }
        await connection.commit();
        res.json({ success: true, orderId, orderCode: generateOrderCode(orderId) });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    } finally { if (connection) connection.release(); }
});

app.get('/api/orders', async (req, res) => {
    const { role, userId, shopId } = req.query;
    try {
        let query = '';
        let params = [];
        if (role === 'user') {
            query = `
                SELECT o.*, s.name as shop_name, 
                (SELECT p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as first_product_image,
                (SELECT p.id FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as first_product_id,
                (SELECT GROUP_CONCAT(CONCAT(p.name, ' x', oi.quantity) SEPARATOR ', ') FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as item_details,
                u_driver.full_name as driver_name, u_driver.phone as driver_phone
                FROM orders o 
                JOIN shops s ON o.shop_id = s.id 
                LEFT JOIN users u_driver ON o.driver_id = u_driver.id
                WHERE o.user_id = ? 
                ORDER BY o.created_at DESC`;
            params = [userId];
        } else if (role === 'driver') {
            query = `
                SELECT o.*, s.name as shop_name, s.address as shop_address, s.lat as shop_lat, s.lng as shop_lng,
                (SELECT p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as first_product_image,
                (SELECT GROUP_CONCAT(CONCAT(p.name, ' x', oi.quantity) SEPARATOR ', ') FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as item_details,
                u_cust.full_name as customer_name, u_cust.phone as customer_phone
                FROM orders o 
                JOIN shops s ON o.shop_id = s.id 
                JOIN users u_cust ON o.user_id = u_cust.id
                WHERE o.driver_id = ? OR o.status = 'finding_driver' 
                ORDER BY o.created_at DESC`;
            params = [userId];
        } else if (role === 'shop') {
            query = `
                SELECT o.*, u.full_name as user_name,
                (SELECT p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as first_product_image,
                (SELECT GROUP_CONCAT(CONCAT(p.name, ' x', oi.quantity) SEPARATOR ', ') FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as item_details
                FROM orders o 
                JOIN users u ON o.user_id = u.id 
                WHERE o.shop_id = ? 
                ORDER BY o.created_at DESC`;
            params = [shopId];
        }
        const [rows] = await pool.query(query, params);
        res.json(rows.map(r => ({ ...r, order_code: generateOrderCode(r.id) })));
    } catch (err) { 
        console.error(err);
        res.json([]); 
    }
});

// --- FAVORITES ROUTES ---
app.get('/api/like/:userId', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT shop_id FROM favorites WHERE user_id = ?', [req.params.userId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
});

app.post('/api/like', async (req, res) => {
    const { userId, shopId } = req.body;
    try {
        await pool.query('INSERT IGNORE INTO favorites (user_id, shop_id) VALUES (?, ?)', [userId, shopId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

app.delete('/api/like/:userId/:shopId', async (req, res) => {
    try {
        await pool.query('DELETE FROM favorites WHERE user_id = ? AND shop_id = ?', [req.params.userId, req.params.shopId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    const { status, driverId } = req.body;
    try {
        let query = 'UPDATE orders SET status = ?';
        let params = [status];
        if (driverId) { query += ', driver_id = ?'; params.push(driverId); }
        query += ' WHERE id = ?'; params.push(req.params.id);
        await pool.query(query, params);
        
        io.emit('status_update', { status, orderId: req.params.id });

        // If status is 'finding_driver', send confirmation email AND notify all drivers
        if (status === 'finding_driver') {
            sendOrderConfirmationEmail(req.params.id, req.headers.host).catch(err => console.error("Email error:", err));
            
            // Fetch order details to notify drivers
            const [fullOrderRows] = await pool.query(`
                SELECT o.*, s.name as shop_name, s.address as shop_address, s.lat as shop_lat, s.lng as shop_lng, s.image_url as shop_image, u.full_name as customer_name
                FROM orders o
                JOIN shops s ON o.shop_id = s.id
                JOIN users u ON o.user_id = u.id
                WHERE o.id = ?`, [req.params.id]);

            if (fullOrderRows.length > 0) {
                const fullOrder = fullOrderRows[0];
                const standardizedCode = `D${String(req.params.id).padStart(3, '0')}`;
                
                // Get item details for notification
                const [itemRows] = await pool.query(`
                    SELECT p.name, oi.quantity 
                    FROM order_items oi 
                    JOIN products p ON oi.product_id = p.id 
                    WHERE oi.order_id = ?`, [req.params.id]);
                
                const itemDetails = itemRows.map(i => `${i.name} (${i.quantity})`).join(', ');

                io.emit('place_order', {
                    orderId: req.params.id,
                    ma_don_hang: standardizedCode,
                    ten_khach_hang: fullOrder.customer_name,
                    ten_mon_an: itemDetails,
                    tong_tien: new Intl.NumberFormat('vi-VN').format(fullOrder.total_price) + 'k',
                    ten_quan: fullOrder.shop_name,
                    hinh_anh_quan: fullOrder.shop_image,
                    lat_don: Number(fullOrder.shop_lat),
                    lng_don: Number(fullOrder.shop_lng),
                    dia_chi_giao: fullOrder.delivery_address,
                    lat_tra: Number(fullOrder.delivery_lat),
                    lng_tra: Number(fullOrder.delivery_lng)
                });
            }
        }

        res.json({ success: true });
    } catch (err) { 
        console.error(err);
        res.json({ success: false }); 
    }
});

// --- AI CHAT ENDPOINT ---
app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    try {
        // 1. Gửi tới n8n để xử lý ngôn ngữ tự nhiên
        const n8nResponse = await axios.post(process.env.N8N_WEBHOOK_URL, {
            action: 'chat',
            message: message,
            userId: userId,
            source: 'web_chat'
        });

        let aiReply = n8nResponse.data.output || n8nResponse.data.reply || n8nResponse.data.message || "Tôi không hiểu ý bạn lắm, bạn có thể nói rõ hơn không?";
        let suggestedProducts = [];

        // 2. Nếu n8n trả về yêu cầu tìm sản phẩm hoặc dựa trên từ khóa đơn giản
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('món') || lowerMsg.includes('ăn') || lowerMsg.includes('uống') || lowerMsg.includes('đói') || lowerMsg.includes('gợi ý')) {
            const [products] = await pool.query(`
                SELECT p.*, s.name as shop_name 
                FROM products p 
                JOIN shops s ON p.shop_id = s.id 
                ORDER BY RAND() LIMIT 3
            `);
            suggestedProducts = products;
        }

        res.json({
            success: true,
            reply: aiReply,
            suggestedProducts: suggestedProducts
        });

    } catch (error) {
        console.error("❌ AI Chat Error:", error.message);
        // Fallback đơn giản nếu n8n lỗi
        res.status(200).json({
            success: true,
            reply: "Chào bạn, hiện tại hệ thống AI đang bảo trì một chút. Tôi có thể giúp gì cho bạn về các đơn hàng không?",
            suggestedProducts: []
        });
    }
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Catch-all route cho Frontend (Sửa lỗi '*' cho các bản Express mới)
app.get(/^(.*)$/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
