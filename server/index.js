require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const compression = require('compression');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || 'giao-hang-tan-noi-2026';

// Đảm bảo thư mục uploads tồn tại
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware xác thực Token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Bạn cần đăng nhập để thực hiện hành động này.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' });
        req.user = user;
        next();
    });
};

// Logging middleware để debug
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Cấu hình CORS cực kỳ linh hoạt
app.use(cors({
    origin: function (origin, callback) {
        // Cho phép mọi origin để dễ debug khi deploy, sau này có domain thì sửa lại
        callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200 
}));

// Xử lý Preflight cho tất cả các route (Sửa chuẩn cho Express 5)
app.options(/^.*$/, cors());

app.use(compression());
app.use(express.json());

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const onlineDrivers = new Map(); // Store active drivers: userId -> { socketId, lat, lng }

function generateOrderCode(orderId) {
    return `D${String(orderId).padStart(3, '0')}`;
}

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

async function sendOrderConfirmationEmail(orderId) {
    try {
        const [orders] = await pool.query(`
            SELECT o.*, u.email as user_email, u.full_name as user_name, s.name as shop_name 
            FROM orders o JOIN users u ON o.user_id = u.id JOIN shops s ON o.shop_id = s.id
            WHERE o.id = ?`, [orderId]);

        if (orders.length === 0 || !orders[0].user_email) return;
        const order = orders[0];

        const [items] = await pool.query(`
            SELECT oi.*, p.name as product_name, p.image_url
            FROM order_items oi JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?`, [orderId]);

        const attachments = [];
        const itemsHtml = items.map((item, index) => {
            let cid = `prod_${index}`;
            let imgSrc = `cid:${cid}`;
            
            if (item.image_url) {
                const fileName = item.image_url.split('/').pop();
                const filePath = path.join(__dirname, 'uploads', fileName);
                if (fs.existsSync(filePath)) {
                    attachments.push({ filename: fileName, path: filePath, cid: cid });
                } else {
                    imgSrc = 'https://via.placeholder.com/60';
                }
            }

            return `
                <div style="display: flex; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <img src="${imgSrc}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; margin-right: 15px;">
                    <div>
                        <p style="margin: 0; font-weight: bold;">${item.product_name}</p>
                        <p style="margin: 0; font-size: 12px; color: #666;">Số lượng: ${item.quantity} x ${new Intl.NumberFormat('vi-VN').format(item.price)}đ</p>
                    </div>
                </div>`;
        }).join('');

        const mailOptions = {
            from: `"Giao Hàng Tận Nơi" <${process.env.EMAIL_USER}>`,
            to: order.user_email,
            subject: `Xác nhận đơn hàng #${generateOrderCode(orderId)} - ${order.shop_name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #00b14f; text-align: center;">Đơn hàng đã được xác nhận!</h2>
                    <p>Chào <b>${order.user_name}</b>,</p>
                    <p>Đơn hàng của bạn tại <b>${order.shop_name}</b> đã được xác nhận và đang chờ tài xế đến lấy.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        ${itemsHtml}
                        <div style="margin-top: 15px; border-top: 2px solid #eee; padding-top: 10px;">
                            <p style="margin: 5px 0;">Tạm tính: <b>${new Intl.NumberFormat('vi-VN').format(order.items_price)}đ</b></p>
                            <p style="margin: 5px 0;">Phí giao hàng: <b>${new Intl.NumberFormat('vi-VN').format(order.delivery_fee)}đ</b></p>
                            ${order.discount > 0 ? `<p style="margin: 5px 0; color: red;">Khuyến mãi vận chuyển: <b>-${new Intl.NumberFormat('vi-VN').format(order.discount)}đ</b></p>` : ''}
                            ${order.status === 'paid' || order.payment_method === 'banking' ? `<p style="margin: 5px 0; color: #2980b9;">Thanh toán QR: <b>-${new Intl.NumberFormat('vi-VN').format(order.total_price)}đ</b></p>` : ''}
                            <p style="margin: 5px 0; font-size: 18px; color: #00b14f;">Tổng cộng: <b>${(order.status === 'paid' || order.payment_method === 'banking') ? '0đ (Đã thanh toán)' : new Intl.NumberFormat('vi-VN').format(order.total_price) + 'đ'}</b></p>
                        </div>
                    </div>
                    <p style="font-size: 12px; color: #888;">Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
                </div>`,
            attachments: attachments
        };
        await transporter.sendMail(mailOptions);
    } catch (e) { console.error("Email error:", e); }
}

async function broadcastOrderToDrivers(orderId) {
    try {
        const [rows] = await pool.query(`
            SELECT o.*, s.name as shop_name, s.address as shop_address, s.lat as shop_lat, s.lng as shop_lng, s.image_url as shop_image, u.full_name as customer_name
            FROM orders o JOIN shops s ON o.shop_id = s.id JOIN users u ON o.user_id = u.id
            WHERE o.id = ?`, [orderId]);
        if (rows.length === 0) return;
        const order = rows[0];
        const socketData = {
            orderId: order.id, ma_don_hang: generateOrderCode(order.id), ten_khach_hang: order.customer_name,
            tong_tien: new Intl.NumberFormat('vi-VN').format(order.total_price) + 'đ', ten_quan: order.shop_name,
            hinh_anh_quan: order.shop_image, lat_don: Number(order.shop_lat), lng_don: Number(order.shop_lng),
            dia_chi_giao: order.delivery_address, lat_tra: Number(order.delivery_lat), lng_tra: Number(order.delivery_lng)
        };
        for (const driver of onlineDrivers.values()) { io.to(driver.socketId).emit('new_order_available', socketData); }
    } catch (err) { console.error("Broadcast Error:", err); }
}

io.on('connection', (socket) => {
    socket.on('join_room', (room) => socket.join(room));
    socket.on('driver_active_status', (data) => {
        const { userId, isActive, lat, lng } = data;
        if (isActive) onlineDrivers.set(userId, { socketId: socket.id, lat, lng });
        else onlineDrivers.delete(userId);
    });
    socket.on('update_driver_location', (data) => {
        if (onlineDrivers.has(data.userId)) onlineDrivers.set(data.userId, { ...onlineDrivers.get(data.userId), lat: data.lat, lng: data.lng });
    });
    socket.on('send_message', async (data) => {
        try {
            await pool.query('INSERT INTO messages (order_id, sender_id, content) VALUES (?, ?, ?)', [data.orderId, data.senderId, data.content]);
            io.to(`order_${data.orderId}`).emit('receive_message', data);
        } catch (err) { console.error(err); }
    });
    socket.on('disconnect', () => {
        for (const [userId, d] of onlineDrivers.entries()) { if (d.socketId === socket.id) { onlineDrivers.delete(userId); break; } }
    });
});

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

app.post('/api/orders', async (req, res) => {
    const { userId, shopId, items, totalPrice, itemsPrice, deliveryFee, discount, deliveryAddress, deliveryLat, deliveryLng, paymentMethod, customerBankCode, customerBankAccount, customerBankName } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query(
            'INSERT INTO orders (user_id, shop_id, status, total_price, items_price, delivery_fee, discount, delivery_address, delivery_lat, delivery_lng, payment_method, customer_bank_code, customer_bank_account, customer_bank_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, shopId, 'pending', totalPrice, itemsPrice || 0, deliveryFee || 0, discount || 0, deliveryAddress, deliveryLat, deliveryLng, paymentMethod, customerBankCode, customerBankAccount, customerBankName]
        );
        const orderId = result.insertId;
        for (const item of items) { await connection.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, item.productId, item.quantity, item.price]); }
        await connection.commit();
        const orderCode = generateOrderCode(orderId);
        
        // Luôn phát tín hiệu new_order cho Shop để cập nhật real-time
        io.to(`shop_${shopId}`).emit('new_order', { 
            orderId, 
            totalPrice, 
            orderCode, 
            paymentMethod, 
            status: 'pending' 
        });

        res.json({ success: true, orderId, orderCode });
    } catch (err) {
        await connection.rollback();
        console.error("Order API Error:", err);
        res.status(500).json({ error: err.message });
    } finally { connection.release(); }
});

app.put('/api/orders/:id/status', async (req, res) => {
    const { status, driverId } = req.body;
    try {
        let query = 'UPDATE orders SET status = ?';
        let params = [status];
        if (driverId) { query += ', driver_id = ?'; params.push(driverId); }
        query += ' WHERE id = ?'; params.push(req.params.id);
        await pool.query(query, params);

        // Lấy shop_id để thông báo cho shop
        const [orderRows] = await pool.query('SELECT shop_id FROM orders WHERE id = ?', [req.params.id]);
        if (orderRows.length > 0) {
            const shopId = orderRows[0].shop_id;
            io.to(`shop_${shopId}`).emit('order_status_updated', { orderId: req.params.id, status });
        }

        io.to(`order_${req.params.id}`).emit('status_update', { status, orderId: req.params.id });
        if (status === 'finding_driver') {
            broadcastOrderToDrivers(req.params.id);
            sendOrderConfirmationEmail(req.params.id);
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Update Status Error:", err);
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/payment/webhook', async (req, res) => {
    // 🛡️ BẢO MẬT WEBHOOK: Kiểm tra Token từ SePay (Bạn cài đặt trong Header SePay là x-api-key)
    const secureToken = process.env.SEPAY_WEBHOOK_KEY || 'SEPAY_TOKEN_2026';
    const clientToken = req.headers['x-api-key'];

    if (clientToken && clientToken !== secureToken) {
        console.error("🚫 Cảnh báo: Có người cố gắng giả mạo Webhook mà không có mã bảo mật!");
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log("📥 [Webhook Received]:", req.body);

    try {
        const { content, amount } = req.body;
        if (!content) return res.status(400).json({ error: 'No content' });

        // Tìm mã đơn hàng Dxxx trong nội dung chuyển khoản
        const match = String(content).match(/D(\d+)/i);
        if (match) {
            const orderId = match[1];

            // 2. Kiểm tra Idempotency (Chống xử lý trùng lặp)
            const [orderCheck] = await pool.query("SELECT payment_status, shop_id, total_price FROM orders WHERE id = ?", [orderId]);
            
            if (orderCheck.length === 0) {
                console.error(`❌ Không tìm thấy đơn hàng ID: ${orderId}`);
                return res.status(404).json({ error: 'Order not found' });
            }

            if (orderCheck[0].payment_status === 'paid') {
                console.log(`⚠️ Đơn hàng ${orderId} đã được xác nhận thanh toán trước đó.`);
                return res.json({ success: true, message: 'Already paid' });
            }

            // 3. Cập nhật trạng thái (Sử dụng các cột từ migration)
            await pool.query(
                "UPDATE orders SET status = 'finding_driver', payment_status = 'paid', payment_method = 'banking', paid_at = NOW() WHERE id = ?", 
                [orderId]
            );

            // 4. Lưu vết giao dịch vào bảng transactions
            await pool.query(
                "INSERT INTO transactions (order_code, amount, content, gateway) VALUES (?, ?, ?, ?)",
                [`D${orderId.padStart(3, '0')}`, amount || 0, content, 'SePay']
            );

            const order = orderCheck[0];
            const orderCode = generateOrderCode(orderId);

            // 5. Thông báo Real-time
            io.to(`order_${orderId}`).emit('payment_success', { orderId });
            io.to(`shop_${order.shop_id}`).emit('new_order', { 
                orderId, 
                totalPrice: order.total_price, 
                orderCode, 
                paymentMethod: 'banking', 
                status: 'finding_driver' 
            });

            // 6. Tìm tài xế và gửi Email
            broadcastOrderToDrivers(orderId);
            sendOrderConfirmationEmail(orderId);

            console.log(`✅ Xác nhận thanh toán thành công đơn hàng: ${orderCode}`);
        }
        res.json({ success: true });
    } catch (err) { 
        console.error("❌ Webhook Error:", err); 
        res.status(500).json({ error: err.message }); 
    }
});

app.get('/api/payment/check/:orderCode', async (req, res) => {
    try {
        const match = req.params.orderCode.match(/D(\d+)/i);
        if (!match) return res.json({ paid: false });
        const [rows] = await pool.query("SELECT payment_status FROM orders WHERE id = ?", [match[1]]);
        res.json({ paid: rows.length > 0 && rows[0].payment_status === 'paid' });
    } catch (err) { res.json({ paid: false }); }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const { orderId, userId, driverId, rating, comment } = req.body;
        await pool.query('INSERT INTO reviews (order_id, user_id, driver_id, rating, comment) VALUES (?, ?, ?, ?, ?)', [orderId, userId, driverId, rating, comment]);
        await pool.query('UPDATE orders SET is_completed_by_user = TRUE WHERE id = ?', [orderId]);
        res.json({ success: true });
    } catch (err) { console.error("Review Error:", err); res.status(500).json({ error: err.message }); }
});

app.get('/api/drivers/:id/rating', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT AVG(rating) as avgRating, COUNT(*) as totalReviews FROM reviews WHERE driver_id = ?', [req.params.id]);
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, username, password, role } = req.body;
    try {
        const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(400).json({ success: false, error: 'Tên đăng nhập đã tồn tại.' });
        
        // Mã hóa mật khẩu trước khi lưu
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const avatar_url = '/uploads/anhdaidienmacdinh.jpg';
        const [result] = await pool.query('INSERT INTO users (full_name, email, username, password, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?)', [fullName, email, username, hashedPassword, role || 'user', avatar_url]);
        res.json({ success: true, userId: result.insertId });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Tài khoản không tồn tại.' });

        const user = rows[0];
        // So sánh mật khẩu nhập vào với mật khẩu đã mã hóa trong DB
        const isMatch = await bcrypt.compare(password, user.password);
        
        // Hỗ trợ tạm thời cho mật khẩu cũ chưa mã hóa (để bạn không bị khóa tài khoản cũ)
        const isOldPlainMatch = (password === user.password);

        if (isMatch || isOldPlainMatch) {
            // Tạo JWT Token
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Không gửi password về frontend
            const { password: _, ...userWithoutPassword } = user;
            res.json({ success: true, user: userWithoutPassword, token });
        } else {
            res.status(401).json({ error: 'Mật khẩu không chính xác.' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders', async (req, res) => {
    const { role, userId, shopId } = req.query;
    try {
        let query = ''; let params = [];
        if (role === 'user') {
            query = `SELECT o.*, s.name as shop_name, u_driver.full_name as driver_name, u_driver.phone as driver_phone,
                    (SELECT p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as first_product_image,
                    (SELECT GROUP_CONCAT(CONCAT(p.name, ' x', oi.quantity) SEPARATOR ', ') FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as item_details
                    FROM orders o JOIN shops s ON o.shop_id = s.id LEFT JOIN users u_driver ON o.driver_id = u_driver.id WHERE o.user_id = ? ORDER BY o.created_at DESC`;
            params = [userId];
        } else if (role === 'driver') {
            query = `SELECT o.*, s.name as shop_name, u_cust.full_name as customer_name, u_cust.phone as customer_phone
                    FROM orders o JOIN shops s ON o.shop_id = s.id JOIN users u_cust ON o.user_id = u_cust.id WHERE o.driver_id = ? ORDER BY o.created_at DESC`;
            params = [userId];
        } else if (role === 'shop') {
            query = `SELECT o.*, u.full_name as user_name, (SELECT p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as first_product_image
                    FROM orders o JOIN users u ON o.user_id = u.id WHERE o.shop_id = ? ORDER BY o.created_at DESC`;
            params = [shopId];
        } else {
            return res.json([]);
        }
        const [rows] = await pool.query(query, params);
        res.json(rows.map(r => ({ ...r, order_code: generateOrderCode(r.id) })));
    } catch (err) { console.error("Get Orders Error:", err); res.json([]); }
});

app.put('/api/users/:id', upload.single('avatar'), async (req, res) => {
    const { full_name, address, phone, email } = req.body;
    const avatar_url = req.file ? `/uploads/${req.file.filename}` : null;
    try {
        let query = 'UPDATE users SET full_name = ?, address = ?, phone = ?, email = ?'; let params = [full_name, address, phone, email];
        if (avatar_url) { query += ', avatar_url = ?'; params.push(avatar_url); }
        query += ' WHERE id = ?'; params.push(req.params.id);
        await pool.query(query, params);
        const [updated] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, user: updated[0] });
    } catch (err) { console.error("Update User Error:", err); res.status(500).json({ error: err.message }); }
});

app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT p.*, s.name as shop_name FROM products p JOIN shops s ON p.shop_id = s.id');
        res.json(rows);
    } catch (err) {
        console.error("Get Products Error:", err);
        res.json([]);
    }
});

app.get('/api/shops', async (req, res) => {
 try { const [rows] = await pool.query('SELECT * FROM shops'); res.json(rows); } catch (e) { res.json([]); } });
app.get('/api/shops/:id', async (req, res) => {
    try {
        const [shopRows] = await pool.query('SELECT * FROM shops WHERE id = ?', [req.params.id]);
        if (shopRows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        const [products] = await pool.query('SELECT * FROM products WHERE shop_id = ?', [req.params.id]);
        res.json({ ...shopRows[0], products });
    } catch (err) { console.error("Get Shop Error:", err); res.status(500).json({ error: err.message }); }
});

app.get('/api/favorites/:userId', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT s.* FROM shops s JOIN favorites f ON s.id = f.shop_id WHERE f.user_id = ?',
            [req.params.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Get Favorites Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/like/:userId', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT s.* FROM shops s JOIN favorites f ON s.id = f.shop_id WHERE f.user_id = ?',
            [req.params.userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/like', async (req, res) => {
    const { userId, shopId } = req.body;
    try {
        await pool.query('INSERT IGNORE INTO favorites (user_id, shop_id) VALUES (?, ?)', [userId, shopId]);
        res.json({ success: true });
    } catch (err) {
        console.error("Like Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/like/:userId/:shopId', async (req, res) => {
    try {
        await pool.query('DELETE FROM favorites WHERE user_id = ? AND shop_id = ?', [req.params.userId, req.params.shopId]);
        res.json({ success: true });
    } catch (err) {
        console.error("Unlike Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/shops/:id/stats', async (req, res) => {
    try {
        const shopId = req.params.id;
        const date = req.query.date || new Date().toISOString().split('T')[0];

        // 1. Top Products
        const [topProducts] = await pool.query(`
            SELECT p.name, SUM(oi.quantity) as sold
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.shop_id = ? AND DATE(o.created_at) = ? AND o.status = 'delivered'
            GROUP BY p.id
            ORDER BY sold DESC
            LIMIT 5
        `, [shopId, date]);

        // 2. Peak Times (Orders per hour)
        const [peakTimes] = await pool.query(`
            SELECT HOUR(created_at) as order_hour, COUNT(*) as count
            FROM orders
            WHERE shop_id = ? AND DATE(created_at) = ? AND status = 'delivered'
            GROUP BY order_hour
        `, [shopId, date]);

        res.json({ topProducts, peakTimes });
    } catch (err) {
        console.error("Shop Stats Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get(/^(.*)$/, (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
