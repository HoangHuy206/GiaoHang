require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./db');
const connectMongoDB = require('./mongodb');
const multer = require('multer');

// Kết nối MongoDB (Song song với TiDB)
connectMongoDB();
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const compression = require('compression');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);

// --- SECURITY CONFIG ---
const FINAL_JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET is required in production') })() : 'giao-hang-tan-noi-2026-dev');

// 1. Helmet for Security Headers
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" } // Cho phép tải ảnh từ server sang client khác origin
}));

// 2. Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // Strict for Login/Register/AI
    message: { error: 'Quá nhiều yêu cầu xác thực, vui lòng thử lại sau 15 phút.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/chat', authLimiter);

// Đảm bảo thư mục uploads tồn tại
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- MIDDLEWARES ---

// 1. Xác thực Token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Bạn cần đăng nhập để thực hiện hành động này.' });

    jwt.verify(token, FINAL_JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' });
        req.user = user;
        next();
    });
};

// 2. Xác thực quyền Admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Quyền truy cập bị từ chối. Chỉ dành cho Admin.' });
    }
};

// 3. Xác thực quyền Shop
const isShop = (req, res, next) => {
    if (req.user && (req.user.role === 'shop' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ error: 'Quyền truy cập bị từ chối. Chỉ dành cho Chủ quán.' });
    }
};

// 4. Logging & Security Headers
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : [];
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
};

app.use(cors(corsOptions));

app.use(compression());
app.use(express.json());

// --- SOCKET.IO ---
const io = new Server(server, {
    cors: corsOptions
});

// Khởi động Bot Telegram
const { bot, sendRefundNotification, sendAnimatedGif } = require('./utils/paymentReminders')(io);

const onlineDrivers = new Map();
const verificationCodes = new Map();

function generateOrderCode(orderId) {
    return `D${String(orderId).padStart(3, '0')}`;
}

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'haiquan2482006@gmail.com';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// --- HELPER FUNCTIONS ---

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
                if (fs.existsSync(filePath)) attachments.push({ filename: fileName, path: filePath, cid: cid });
                else imgSrc = 'https://via.placeholder.com/60';
            }
            return `<div style="display: flex; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                        <img src="${imgSrc}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; margin-right: 15px;">
                        <div>
                            <p style="margin: 0; font-weight: bold;">${item.product_name}</p>
                            <p style="margin: 0; font-size: 12px; color: #666;">Số lượng: ${item.quantity} x ${new Intl.NumberFormat('vi-VN').format(item.price)}đ</p>
                        </div>
                    </div>`;
        }).join('');

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"Giao Hàng Tận Nơi" <${process.env.EMAIL_USER}>`,
            to: order.user_email,
            subject: `Xác nhận đơn hàng #${generateOrderCode(orderId)} - ${order.shop_name}`,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #00b14f; text-align: center;">Đơn hàng đã được xác nhận!</h2>
                    <p>Chào <b>${order.user_name}</b>,</p>
                    <p>Đơn hàng của bạn tại <b>${order.shop_name}</b> đã được xác nhận và đang chờ tài xế đến lấy.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        ${itemsHtml}
                        <div style="margin-top: 15px; border-top: 2px solid #eee; padding-top: 10px;">
                            <p style="margin: 5px 0;">Tạm tính: <b>${new Intl.NumberFormat('vi-VN').format(order.items_price)}đ</b></p>
                            <p style="margin: 5px 0;">Phí giao hàng: <b>${new Intl.NumberFormat('vi-VN').format(order.delivery_fee)}đ</b></p>
                            <p style="margin: 5px 0; font-size: 18px; color: #00b14f;">Tổng cộng: <b>${new Intl.NumberFormat('vi-VN').format(order.total_price)}đ</b></p>
                        </div>
                    </div>
                  </div>`,
            attachments: attachments
        });
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
        onlineDrivers.forEach(d => io.to(d.socketId).emit('new_order_available', socketData));
    } catch (err) { console.error("Broadcast Error:", err); }
}

// --- API ROUTES ---

// Auth
const User = require('./models/User'); // Import User model

app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, username, password, role } = req.body;
    try {
        const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 1. Lưu vào TiDB
        const [result] = await pool.query('INSERT INTO users (full_name, email, username, password, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?)', 
            [fullName, email, username, hashedPassword, role || 'user', '/uploads/anhdaidienmacdinh.jpg']);
        const userId = result.insertId;

        // 2. Lưu vào MongoDB (Background)
        setImmediate(async () => {
            try {
                console.log('🔄 Attempting to sync user to MongoDB:', username);
                const mongoUser = await User.create({
                    originalId: userId,
                    full_name: fullName,
                    email: email,
                    username: username,
                    password: hashedPassword,
                    role: role || 'user',
                    avatar_url: '/uploads/anhdaidienmacdinh.jpg'
                });
                console.log(`🍃 User ${username} synced to MongoDB successfully:`, mongoUser._id);
            } catch (mErr) { 
                console.error('❌ Mongo Auth Sync Error for', username, ':', mErr); 
            }
        });

        res.json({ success: true, userId: userId });
    } catch (err) { res.status(500).json({ error: 'Lỗi đăng ký người dùng.' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Tên đăng nhập không tồn tại.' });

        const user = rows[0];
        let match = false;

        // 1. Thử so sánh bằng bcrypt (cho mật khẩu mới/đã hash)
        if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
            match = await bcrypt.compare(password, user.password);
        } else {
            // 2. So sánh trực tiếp (cho mật khẩu cũ từ seed chưa hash)
            match = (password === user.password);
            
            // 3. Nếu khớp mật khẩu cũ, tự động cập nhật lên hash để bảo mật
            if (match) {
                const newHash = await bcrypt.hash(password, 10);
                await pool.query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
                console.log(`✅ Updated password hash for user: ${username}`);
            }
        }

        if (!match) return res.status(401).json({ error: 'Mật khẩu không chính xác.' });

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            FINAL_JWT_SECRET,
            { expiresIn: '7d' }
        );

        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword, token });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập.' });
    }
});

// --- GOOGLE LOGIN ---
const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID_GOOGLE = process.env.GOOGLE_CLIENT_ID || '562270522404-12p4p779nthnlt086mhjpriffko9ici8.apps.googleusercontent.com';
const googleClient = new OAuth2Client(CLIENT_ID_GOOGLE);

app.post('/api/auth/google-login', async (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Thiếu thông tin xác thực Google.' });
    
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: CLIENT_ID_GOOGLE
        });
        const payload = ticket.getPayload();
        const { sub, email, name, picture } = payload;

        console.log('🔹 Google Login Attempt:', email);

        // Kiểm tra kết nối MongoDB trước khi truy vấn
        if (require('mongoose').connection.readyState !== 1) {
            throw new Error('Kết nối Database MongoDB đang bị ngắt kết nối. Vui lòng kiểm tra IP Whitelist trên Atlas.');
        }

        // Tìm hoặc tạo user trong MongoDB
        let user = await User.findOne({ $or: [{ google_id: sub }, { email: email }] });
        
        if (!user) {
            console.log('✨ Creating new Google user:', email);
            user = await User.create({
                username: `google_${sub.substring(0, 10)}`,
                password: await bcrypt.hash(Math.random().toString(36), 10),
                full_name: name,
                email: email,
                avatar_url: picture,
                google_id: sub,
                auth_provider: 'google',
                role: 'user'
            });
        }

        const token = jwt.sign(
            { id: user.originalId || user._id, username: user.username, role: user.role }, 
            FINAL_JWT_SECRET, 
            { expiresIn: '7d' }
        );
        
        res.json({ success: true, user: user, token });
    } catch (err) {
        console.error("❌ Google Login Error:", err.message);
        res.status(500).json({ error: 'Lỗi xác thực Google: ' + err.message });
    }
});

// --- ADDRESS BOOK API ---
app.get('/api/user/addresses', authenticateToken, async (req, res) => {
    try {
        // Kiểm tra kết nối MongoDB
        if (require('mongoose').connection.readyState !== 1) {
            console.warn("⚠️ MongoDB not connected, returning empty addresses");
            return res.json([]); 
        }

        const userId = req.user.id;
        // Tìm user theo originalId (Number) hoặc _id (ObjectId/String)
        let query = {};
        if (!isNaN(userId)) {
            query = { originalId: Number(userId) };
        } else {
            query = { _id: userId };
        }

        const user = await User.findOne(query);
        if (!user) return res.json([]); 
        res.json(user.addresses || []);
    } catch (err) {
        console.error("Fetch Addresses Error:", err);
        res.json([]);
    }
});

app.post('/api/user/addresses', authenticateToken, async (req, res) => {
    const { label, address, lat, lng, is_default } = req.body;
    try {
        const userId = req.user.id;
        let query = !isNaN(userId) ? { originalId: Number(userId) } : { _id: userId };
        
        const user = await User.findOne(query);
        if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });

        if (is_default) {
            user.addresses.forEach(addr => addr.is_default = false);
        }

        user.addresses.push({ label, address, lat, lng, is_default });
        await user.save();
        res.json({ success: true, addresses: user.addresses });
    } catch (err) {
        console.error("Add Address Error:", err);
        res.status(500).json({ error: 'Lỗi thêm địa chỉ.' });
    }
});

app.delete('/api/user/addresses/:index', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        let query = !isNaN(userId) ? { originalId: Number(userId) } : { _id: userId };

        const user = await User.findOne(query);
        if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });

        const index = parseInt(req.params.index);
        if (isNaN(index) || index < 0 || index >= user.addresses.length) {
            return res.status(400).json({ error: 'Chỉ mục không hợp lệ.' });
        }

        user.addresses.splice(index, 1);
        await user.save();
        res.json({ success: true, addresses: user.addresses });
    } catch (err) {
        console.error("Delete Address Error:", err);
        res.status(500).json({ error: 'Lỗi xóa địa chỉ.' });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Vui lòng cung cấp email.' });

    try {
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'Email không tồn tại trong hệ thống.' });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        verificationCodes.set(email, { code, expires: Date.now() + 10 * 60 * 1000 }); // 10 mins

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"Giao Hàng Tận Nơi" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Mã xác thực quên mật khẩu',
            html: `<h3>Mã xác thực của bạn là: <b style="color: #00b14f; font-size: 24px;">${code}</b></h3>
                   <p>Mã này có hiệu lực trong 10 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>`
        });

        res.json({ success: true, message: 'Mã xác thực đã được gửi tới email của bạn.' });
    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ error: 'Lỗi gửi mã xác thực.' });
    }
});

app.post('/api/auth/verify-code', (req, res) => {
    const { email, code } = req.body;
    const record = verificationCodes.get(email);

    if (!record || record.code !== code || record.expires < Date.now()) {
        return res.status(400).json({ error: 'Mã xác thực không chính xác hoặc đã hết hạn.' });
    }

    res.json({ success: true, message: 'Mã xác thực hợp lệ.' });
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    const record = verificationCodes.get(email);

    if (!record || record.code !== code || record.expires < Date.now()) {
        return res.status(400).json({ error: 'Mã xác thực không hợp lệ.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
        verificationCodes.delete(email);
        res.json({ success: true, message: 'Mật khẩu đã được cập nhật thành công.' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi cập nhật mật khẩu.' });
    }
});

app.get('/api/ping', (req, res) => {
    res.json({ success: true, message: 'pong', serverTime: new Date().toISOString() });
});

// Favorites (Likes) - SECURED
app.get('/api/like/:userId', authenticateToken, async (req, res) => {
    const userId = req.params.userId;
    // Security check: Users can only see their own favorites unless they are admin
    if (String(req.user.id) !== String(userId) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Truy cập bị từ chối.' });
    }

    try {
        const [rows] = await pool.query(
            'SELECT s.* FROM shops s JOIN favorites f ON s.id = f.shop_id WHERE f.user_id = ?',
            [userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi tải danh sách yêu thích.' });
    }
});

app.post('/api/like', authenticateToken, async (req, res) => {
    const { shopId } = req.body;
    const userId = req.user.id; // Use authenticated userId

    if (!shopId) return res.status(400).json({ error: 'Thiếu thông tin quán ăn.' });

    try {
        const [existing] = await pool.query('SELECT * FROM favorites WHERE user_id = ? AND shop_id = ?', [userId, shopId]);
        if (existing.length === 0) {
            await pool.query('INSERT INTO favorites (user_id, shop_id) VALUES (?, ?)', [userId, shopId]);
        }
        res.json({ success: true, isFavorite: true, message: 'Đã thêm vào danh sách yêu thích.' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi xử lý yêu thích.' });
    }
});

app.delete('/api/like/:userId/:shopId', authenticateToken, async (req, res) => {
    const { userId, shopId } = req.params;
    
    // Security check: Users can only delete their own favorites
    if (String(req.user.id) !== String(userId) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Truy cập bị từ chối.' });
    }

    try {
        await pool.query('DELETE FROM favorites WHERE user_id = ? AND shop_id = ?', [userId, shopId]);
        res.json({ success: true, isFavorite: false, message: 'Đã xóa khỏi danh sách yêu thích.' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi xóa yêu thích.' });
    }
});

// Users (Secure)
app.put('/api/users/:id', authenticateToken, multer({ 
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
    }),
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new Error("Chỉ hỗ trợ upload ảnh (jpeg, jpg, png, webp)"));
    }
}).single('avatar'), async (req, res) => {
    const userId = req.params.id;
    if (String(req.user.id) !== String(userId) && req.user.role !== 'admin') return res.status(403).json({ error: 'Truy cập bị từ chối.' });
    const { full_name, address, phone, email } = req.body;
    const avatar_url = req.file ? `/uploads/${req.file.filename}` : null;
    try {
        let q = 'UPDATE users SET full_name = ?, address = ?, phone = ?, email = ?'; let p = [full_name, address, phone, email];
        if (avatar_url) { q += ', avatar_url = ?'; p.push(avatar_url); }
        q += ' WHERE id = ?'; p.push(userId);
        await pool.query(q, p);
        const [updated] = await pool.query('SELECT id, username, full_name, email, phone, role, address, avatar_url FROM users WHERE id = ?', [userId]);
        res.json({ success: true, user: updated[0] });
    } catch (err) { res.status(500).json({ error: 'Lỗi cập nhật thông tin người dùng.' }); }
});

// Orders & Payment
const Order = require('./models/Order'); // Import Mongo Order model

app.post('/api/orders', authenticateToken, async (req, res) => {
    const { shopId, items, totalPrice, itemsPrice, deliveryFee, discount, deliveryAddress, deliveryLat, deliveryLng, paymentMethod, customerBankCode, customerBankAccount, customerBankName } = req.body;
    const userId = req.user.id; // Luôn sử dụng ID từ token đã xác thực
    
    // Đảm bảo các giá trị là số và không phải NaN
    const safeTotalPrice = Number(totalPrice) || 0;
    const safeItemsPrice = Number(itemsPrice) || 0;
    const safeDeliveryFee = Number(deliveryFee) || 0;
    const safeDiscount = Number(discount) || 0;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Kiểm tra xem quán có đang mở cửa không (TiDB)
        const [shopStatus] = await conn.query('SELECT is_active, name FROM shops WHERE id = ?', [shopId]);
        if (shopStatus.length > 0 && !shopStatus[0].is_active) {
            await conn.rollback();
            return res.status(400).json({ error: `Rất tiếc, quán ${shopStatus[0].name} hiện đang đóng cửa. Bạn vui lòng quay lại sau nhé!` });
        }

        // 2. Lưu vào TiDB (MySQL)
        const [result] = await conn.query('INSERT INTO orders (user_id, shop_id, status, total_price, items_price, delivery_fee, discount, delivery_address, delivery_lat, delivery_lng, payment_method, customer_bank_code, customer_bank_account, customer_bank_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [userId, shopId, 'pending', safeTotalPrice, safeItemsPrice, safeDeliveryFee, safeDiscount, deliveryAddress, deliveryLat, deliveryLng, paymentMethod, customerBankCode, customerBankAccount, customerBankName]);
        const orderId = result.insertId;
        
        const sqlItems = [];
        for (const item of items) {
            await conn.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?,?,?,?)', [orderId, item.productId, item.quantity, item.price]);
            sqlItems.push({ product_id: item.productId, quantity: item.quantity, price: item.price });
        }
        await conn.commit();

        // 3. Lưu vào MongoDB (Song song - Background)
        setImmediate(async () => {
            try {
                console.log('🔄 Attempting to sync order to MongoDB:', orderId);
                const mongoOrder = await Order.create({
                    originalId: orderId,
                    user_id: Number(userId),
                    shop_id: Number(shopId),
                    status: 'pending',
                    payment_status: 'unpaid',
                    total_price: Number(totalPrice),
                    items_price: Number(itemsPrice || 0),
                    delivery_fee: Number(deliveryFee || 0),
                    discount: Number(discount || 0),
                    delivery_address: deliveryAddress,
                    delivery_lat: Number(deliveryLat),
                    delivery_lng: Number(deliveryLng),
                    payment_method: paymentMethod,
                    customer_bank_code: customerBankCode,
                    customer_bank_account: customerBankAccount,
                    customer_bank_name: customerBankName,
                    items: sqlItems.map(i => ({
                        product_id: Number(i.product_id),
                        quantity: Number(i.quantity),
                        price: Number(i.price)
                    })),
                    created_at: new Date()
                });
                console.log(`🍃 Order ${orderId} synced to MongoDB successfully:`, mongoOrder._id);
            } catch (mongoErr) {
                console.error('❌ MongoDB Sync Error for order', orderId, ':', mongoErr);
            }
        });

        // 3. Lấy thông tin khách hàng để gửi cho Shop
        const [userRows] = await conn.query('SELECT full_name FROM users WHERE id = ?', [userId]);
        const customerName = userRows.length > 0 ? userRows[0].full_name : 'Khách hàng';

        const orderDataForShop = { 
            orderId, 
            totalPrice: new Intl.NumberFormat('vi-VN').format(totalPrice) + 'đ', 
            orderCode: generateOrderCode(orderId), 
            status: 'pending',
            customerName: customerName,
            items: items.map(i => ({ name: i.name, quantity: i.quantity })) // Giả định items từ body có name
        };

        io.to(`shop_${shopId}`).emit('new_order', orderDataForShop);
        res.json({ success: true, orderId, orderCode: generateOrderCode(orderId) });
    } catch (err) { await conn.rollback(); res.status(500).json({ error: 'Lỗi tạo đơn hàng.' }); }
    finally { conn.release(); }
});

app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
    const { status, driverId } = req.body;
    const orderId = req.params.id;
    const { id: currentUserId, role: currentUserRole } = req.user;

    try {
        // 1. Kiểm tra quyền truy cập đơn hàng
        const [orderRows] = await pool.query(`
            SELECT o.*, s.user_id as shop_owner_id 
            FROM orders o 
            JOIN shops s ON o.shop_id = s.id 
            WHERE o.id = ?`, [orderId]);

        if (orderRows.length === 0) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
        const order = orderRows[0];

        let allowed = false;
        if (currentUserRole === 'admin') {
            allowed = true;
        } else if (currentUserRole === 'driver') {
            // Tài xế có thể nhận đơn mới hoặc cập nhật đơn đang giao của mình
            if (status === 'driver_assigned' || (order.driver_id && String(order.driver_id) === String(currentUserId))) {
                allowed = true;
            }
        } else if (String(order.shop_owner_id) === String(currentUserId)) {
            allowed = true; // Chủ quán
        } else if (String(order.user_id) === String(currentUserId)) {
            // Khách hàng chỉ có thể hủy đơn khi chưa giao hoặc chưa thanh toán
            if (status === 'cancelled' && (order.status === 'pending' || order.status === 'unpaid' || order.status === 'finding_driver')) {
                allowed = true;
            }
        }

        if (!allowed) return res.status(403).json({ error: 'Bạn không có quyền cập nhật trạng thái đơn hàng này.' });

        // 2. Cập nhật trạng thái
        await pool.query('UPDATE orders SET status = ?' + (driverId ? ', driver_id = ?' : '') + ' WHERE id = ?', 
            driverId ? [status, driverId, orderId] : [status, orderId]);
        
        if (status === 'cancelled') {
            const [info] = await pool.query("SELECT payment_status FROM orders WHERE id = ?", [orderId]);
            if (info.length > 0 && info[0].payment_status === 'paid') sendRefundNotification(orderId);
        }

        const [o] = await pool.query('SELECT shop_id FROM orders WHERE id = ?', [orderId]);
        if (o.length > 0) io.to(`shop_${o[0].shop_id}`).emit('order_status_updated', { orderId: orderId, status });
        io.to(`order_${orderId}`).emit('status_update', { status, orderId: orderId });
        
        if (status === 'finding_driver') { 
            broadcastOrderToDrivers(orderId); 
            sendOrderConfirmationEmail(orderId); 
        }

        // Thông báo cho Shop khi tài xế nhận đơn
        if (status === 'driver_assigned') {
            const dId = driverId || req.body.driverId;
            if (dId) {
                try {
                    const [orderInfo] = await pool.query(`
                        SELECT o.id, s.telegram_chat_id, u.full_name as driver_name 
                        FROM orders o 
                        JOIN shops s ON o.shop_id = s.id 
                        JOIN users u ON u.id = ?
                        WHERE o.id = ?
                    `, [dId, orderId]);

                    if (orderInfo.length > 0 && orderInfo[0].telegram_chat_id) {
                        const info = orderInfo[0];
                        const orderCode = generateOrderCode(info.id);
                        const msg = `🛵 <b>TÀI XẾ ĐÃ NHẬN ĐƠN!</b>\n\n` +
                                    `Tài xế <b>${info.driver_name}</b> đã nhận đơn hàng <b>${orderCode}</b> và đang di chuyển tới quán.\n\n` +
                                    `<i>Vui lòng chuẩn bị món ăn để giao cho tài xế nhé! 🍜</i>`;
                        
                        const gifScooter = 'https://media.giphy.com/media/U6Y0IuJidW1i6T6Y6E/giphy.gif';
                        await sendAnimatedGif(info.telegram_chat_id, gifScooter, msg);
                    }
                } catch (e) { console.error("Notify shop error:", e); }
            }
        }

        res.json({ success: true });
    } catch (err) { 
        console.error("Order update error:", err);
        res.status(500).json({ error: 'Lỗi cập nhật trạng thái đơn hàng.' }); 
    }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
    const { role, userId, shopId } = req.query;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    
    try {
        let rows = [];
        
        if (role === 'user') {
            // Kiểm tra: Chỉ admin hoặc chính khách hàng đó mới được xem
            const targetUserId = String(userId || currentUserId);
            if (currentUserRole !== 'admin' && String(currentUserId) !== targetUserId) {
                return res.status(403).json({ 
                    error: 'Bạn không có quyền xem đơn hàng của người khác.',
                    debug: { current: currentUserId, target: targetUserId } 
                });
            }
            [rows] = await pool.query(`
                SELECT o.*, s.name as shop_name, s.image_url as shop_image, u.full_name as driver_name, u.phone as driver_phone
                FROM orders o 
                JOIN shops s ON o.shop_id = s.id
                LEFT JOIN users u ON o.driver_id = u.id
                WHERE o.user_id = ? 
                ORDER BY o.created_at DESC`, [targetUserId]);

        } else if (role === 'driver') {
            // Kiểm tra: Chỉ admin hoặc chính tài xế đó mới được xem
            const targetDriverId = userId || currentUserId;
            if (currentUserRole !== 'admin' && String(currentUserId) !== String(targetDriverId)) {
                return res.status(403).json({ error: 'Bạn không có quyền xem đơn hàng của tài xế khác.' });
            }
            [rows] = await pool.query('SELECT * FROM orders WHERE driver_id = ? ORDER BY created_at DESC', [targetDriverId]);

        } else if (role === 'shop') {
            // Kiểm tra: Phải là chủ shop hoặc admin
            if (!shopId) return res.status(400).json({ error: 'Thiếu shopId' });
            
            const [shop] = await pool.query('SELECT user_id FROM shops WHERE id = ?', [shopId]);
            if (shop.length === 0) return res.status(404).json({ error: 'Shop không tồn tại.' });
            
            if (currentUserRole !== 'admin' && String(shop[0].user_id) !== String(currentUserId)) {
                return res.status(403).json({ error: 'Bạn không có quyền quản lý quán này.' });
            }
            
            [rows] = await pool.query(`
                SELECT o.*, u.full_name as user_name, u.phone as user_phone
                FROM orders o 
                JOIN users u ON o.user_id = u.id
                WHERE o.shop_id = ? 
                ORDER BY o.created_at DESC`, [shopId]);
        }

        // Trả về dữ liệu kèm theo mã đơn hàng đã format và danh sách món chi tiết
        const ordersWithItems = await Promise.all(rows.map(async (r) => {
            const [items] = await pool.query(`
                SELECT oi.*, p.name as product_name, p.image_url as product_image
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            `, [r.id]);
            
            return { 
                ...r, 
                order_code: generateOrderCode(r.id),
                items: items,
                // Lấy ảnh của món đầu tiên làm ảnh đại diện đơn hàng nếu chưa có shop_image
                first_product_image: items.length > 0 ? items[0].product_image : r.shop_image
            };
        }));

        res.json(ordersWithItems);
    } catch (e) { 
        console.error("Fetch orders error:", e);
        res.status(500).json({ error: 'Lỗi tải danh sách đơn hàng.' });
    }
});

// Webhook Payment (SePay)
app.post('/api/payment/webhook', async (req, res) => {
    const secureToken = process.env.SEPAY_WEBHOOK_KEY || 'SEPAY_TOKEN_2026';
    if (req.headers['x-api-key'] && req.headers['x-api-key'] !== secureToken) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { content, amount } = req.body;
        const match = String(content).match(/D(\d+)/i);
        if (match) {
            const orderId = match[1];
            const [check] = await pool.query("SELECT payment_status, shop_id, total_price FROM orders WHERE id = ?", [orderId]);
            if (check.length > 0 && check[0].payment_status !== 'paid') {
                await pool.query("UPDATE orders SET status = 'finding_driver', payment_status = 'paid', paid_at = NOW() WHERE id = ?", [orderId]);
                await pool.query("INSERT INTO transactions (order_code, amount, content, gateway) VALUES (?, ?, ?, ?)", [`D${orderId.padStart(3,'0')}`, amount||0, content, 'SePay']);
                io.to(`order_${orderId}`).emit('payment_success', { orderId });
                broadcastOrderToDrivers(orderId);
                sendOrderConfirmationEmail(orderId);
            }
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Lỗi xử lý webhook thanh toán.' }); }
});

// Shops & Products (Public)
app.get('/api/products', async (req, res) => {
    try { const [rows] = await pool.query('SELECT p.*, s.name as shop_name FROM products p JOIN shops s ON p.shop_id = s.id ORDER BY p.id DESC'); res.json(rows); } 
    catch (err) { res.json([]); }
});

app.get('/api/shops', async (req, res) => {
    try { 
        // Lấy quán đang mở cửa và hiện mới nhất lên đầu
        const [rows] = await pool.query('SELECT * FROM shops WHERE is_active = 1 ORDER BY id DESC'); 
        res.json(rows); 
    } catch (e) { 
        res.json([]); 
    }
});

app.get('/api/shops/:id', async (req, res) => {
    try {
        const [s] = await pool.query('SELECT * FROM shops WHERE id = ?', [req.params.id]);
        if (s.length === 0) return res.status(404).json({ error: 'Không tìm thấy thông tin quán.' });
        const [p] = await pool.query('SELECT * FROM products WHERE shop_id = ?', [req.params.id]);
        res.json({ ...s[0], products: p });
    } catch (err) { res.status(500).json({ error: 'Lỗi tải thông tin quán.' }); }
});

app.put('/api/shops/:id', authenticateToken, multer({ 
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
    }),
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new Error("Chỉ hỗ trợ upload ảnh (jpeg, jpg, png, webp)"));
    }
}).single('banner'), async (req, res) => {
    const shopId = req.params.id;
    const { name, address, bank_code, bank_account, telegram_chat_id } = req.body;
    const banner_url = req.file ? `/uploads/${req.file.filename}` : null;
    
    try {
        // Kiểm tra quyền (Chỉ Admin hoặc chủ Shop)
        const [shop] = await pool.query('SELECT user_id FROM shops WHERE id = ?', [shopId]);
        if (shop.length === 0) return res.status(404).json({ error: 'Không tìm thấy shop.' });
        if (req.user.role !== 'admin' && String(shop[0].user_id) !== String(req.user.id)) {
            return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa shop này.' });
        }

        let q = 'UPDATE shops SET name = ?, address = ?, bank_code = ?, bank_account = ?, telegram_chat_id = ?';
        let p = [name, address, bank_code, bank_account, telegram_chat_id];
        
        if (banner_url) {
            q += ', banner_url = ?';
            p.push(banner_url);
        }
        
        q += ' WHERE id = ?';
        p.push(shopId);
        
        await pool.query(q, p);
        res.json({ success: true, message: 'Cập nhật shop thành công' });
    } catch (err) {
        console.error("Update shop error:", err);
        res.status(500).json({ error: 'Lỗi cập nhật thông tin shop.' });
    }
});

// Admin (Strict Secure)
app.get('/api/admin/shops', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT s.*, u.full_name as owner_name, u.username as owner_username FROM shops s LEFT JOIN users u ON s.user_id = u.id`);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Lỗi tải danh sách quán (Admin).' }); }
});

app.delete('/api/admin/shops/:id', authenticateToken, isAdmin, async (req, res) => {
    const shopId = req.params.id;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [s] = await conn.query('SELECT user_id FROM shops WHERE id = ?', [shopId]);
        if (s.length > 0) {
            await conn.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE shop_id = ?)', [shopId]);
            await conn.query('DELETE FROM orders WHERE shop_id = ?', [shopId]);
            await conn.query('DELETE FROM products WHERE shop_id = ?', [shopId]);
            await conn.query('DELETE FROM favorites WHERE shop_id = ?', [shopId]);
            await conn.query('DELETE FROM shops WHERE id = ?', [shopId]);
            if (s[0].user_id) await conn.query('DELETE FROM users WHERE id = ?', [s[0].user_id]);
        }
        await conn.commit(); res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ error: 'Lỗi xóa quán (Admin).' }); }
    finally { conn.release(); }
});

// Chat AI - SECURED
app.post('/api/chat', authenticateToken, async (req, res) => {
    try {
        const n8nUrl = process.env.N8N_WEBHOOK_URL;
        if (!n8nUrl) return res.status(500).json({ error: 'Chưa cấu hình N8N' });
        // Gửi kèm thông tin user để n8n có thể cá nhân hóa phản hồi
        const response = await axios.post(n8nUrl, { 
            ...req.body, 
            user: {
                id: req.user.id,
                username: req.user.username,
                role: req.user.role
            }
        });
        const reply = response.data.output || response.data.text || "Xin lỗi, mình không hiểu.";
        res.json({ message: reply, output: reply });
    } catch (error) { 
        console.error("Chat AI Error:", error.message);
        res.status(500).json({ error: 'AI hiện đang bận, vui lòng thử lại sau.' }); 
    }
});

// API Check Thanh Toán
app.get('/api/payment/check/:orderCode', async (req, res) => {
    try {
        const orderCode = req.params.orderCode;
        const match = orderCode.match(/D(\d+)/i);
        if (!match) return res.status(400).json({ error: 'Mã đơn hàng không hợp lệ' });
        
        const orderId = parseInt(match[1]);
        const [rows] = await pool.query("SELECT payment_status FROM orders WHERE id = ?", [orderId]);
        
        if (rows.length > 0 && rows[0].payment_status === 'paid') {
            return res.json({ paid: true });
        }
        res.json({ paid: false });
    } catch (err) {
        console.error("Payment check error:", err);
        res.status(500).json({ error: 'Lỗi kiểm tra thanh toán.' });
    }
});

// API Hỗ trợ (Public)
app.post('/api/support', async (req, res) => {
    const { name, phone, email, subject, message } = req.body;
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return res.status(500).json({ error: "Email chưa cấu hình." });
    try {
        await transporter.sendMail({
            from: `"Hỗ Trợ GHTN" <${process.env.EMAIL_USER}>`,
            to: SUPPORT_EMAIL,
            subject: `[Hỗ Trợ] ${subject.toUpperCase()} - ${name}`,
            html: `<div style="font-family: Arial; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #00b14f;">Yêu cầu hỗ trợ mới</h2>
                    <p><b>Họ tên:</b> ${name}</p><p><b>SĐT:</b> ${phone}</p><p><b>Email:</b> ${email}</p>
                    <hr><p><b>Nội dung:</b></p><p>${message}</p>
                   </div>`
        });
        res.json({ success: true, message: "Thành công" });
    } catch (err) { res.status(500).json({ error: "Lỗi gửi mail." }); }
});

// Static Files với CORS riêng để tránh lỗi không hiện ảnh
app.use('/uploads', cors(corsOptions), express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../client/dist')));

io.on('connection', (s) => {
    s.on('join_room', (r) => s.join(r));
    s.on('driver_active_status', (d) => d.isActive ? onlineDrivers.set(d.userId, { socketId: s.id, ...d }) : onlineDrivers.delete(d.userId));
    s.on('send_message', async (d) => {
        try { 
            await pool.query('INSERT INTO messages (order_id, sender_id, content) VALUES (?,?,?)', [d.orderId, d.senderId, d.content]);
            io.to(`order_${d.orderId}`).emit('receive_message', d);
        } catch(e){}
    });
});

// CATCH-ALL SPA ROUTE (MUST BE LAST)
app.get(/.*/, (req, res) => {
    if (!req.url.startsWith('/api/') && !req.url.startsWith('/uploads/')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    } else {
        res.status(404).json({ error: '404 Not Found' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
