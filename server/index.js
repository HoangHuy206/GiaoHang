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

const app = express();
const server = http.createServer(app);

// Use compression to reduce file sizes sent over the network
app.use(compression());

// --- Email Config ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

// Store online drivers' locations
const onlineDrivers = new Map(); // socketId -> { driverId, lat, lng }

// Haversine formula to calculate distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

app.use(cors());
app.use(express.json());

// --- File Upload Config ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Serve static files from uploads with caching
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    etag: true
}));

// Serve Frontend static files (Production) with caching
app.use(express.static(path.join(__dirname, '../client/dist'), {
    maxAge: '1h',
    etag: true
}));

// Add a simple health check route
app.get('/api/health', (req, res) => res.send('OK'));

// --- Socket.io Logic ---
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join specific rooms based on role/id
    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined ${room}`);
    });

    // Driver updates general location (for matching orders)
    socket.on('update_driver_location', (data) => {
        // data: { driverId, lat, lng }
        onlineDrivers.set(socket.id, { ...data, socketId: socket.id });
        console.log(`Driver ${data.driverId} updated location: ${data.lat}, ${data.lng}`);
    });

    // Driver updates location for a specific order
    socket.on('driver_location', (data) => {
        // data: { driverId, orderId, lat, lng }
        io.to(`order_${data.orderId}`).emit('update_driver_location', data);
    });

    // Handle new order placement from client
    socket.on('place_order', (orderData) => {
        console.log('New order received, finding nearby drivers:', orderData.ma_don_hang);
        
        const shopLat = orderData.lat_don;
        const shopLng = orderData.lng_don;

        if (!shopLat || !shopLng) {
            console.log('Order missing shop coordinates, broadcasting to all.');
            io.emit('place_order', orderData);
            return;
        }

        let driversNotified = 0;
        onlineDrivers.forEach((driver, socketId) => {
            const distance = calculateDistance(shopLat, shopLng, driver.lat, driver.lng);
            console.log(`Driver ${driver.driverId} distance: ${distance.toFixed(2)}km`);
            
            if (distance <= 10) { // 10km radius
                io.to(socketId).emit('place_order', orderData);
                driversNotified++;
            }
        });

        console.log(`Order ${orderData.ma_don_hang} notified to ${driversNotified} drivers within 10km.`);
    });
    
    // Handle driver_status_change
    socket.on('driver_status_change', (data) => {
         console.log('Driver status:', data);
         if (data.status === 'offline') {
             onlineDrivers.delete(socket.id);
         }
    });

    // --- Chat Logic ---
    socket.on('send_message', async (data) => {
        // data: { orderId, senderId, content }
        const { orderId, senderId, content } = data;
        try {
            await pool.query(
                'INSERT INTO messages (order_id, sender_id, content) VALUES (?, ?, ?)',
                [orderId, senderId, content]
            );
            
            // Broadcast the message to the order room
            io.to(`order_${orderId}`).emit('receive_message', {
                orderId,
                senderId,
                content,
                created_at: new Date()
            });

            console.log(`Message from ${senderId} in order ${orderId}: ${content}`);
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    // Typing indicators
    socket.on('typing', (data) => {
        // data: { orderId, userId }
        socket.to(`order_${data.orderId}`).emit('typing', data);
    });

    socket.on('stop_typing', (data) => {
        socket.to(`order_${data.orderId}`).emit('stop_typing', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        onlineDrivers.delete(socket.id);
    });
});

// --- API Routes ---

// Auth
app.post('/api/auth/register', async (req, res) => {
    const { username, password, role, fullName, address, email, phone, cccd, gender, vehicle } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO users (username, password, role, full_name, address, email, phone, cccd, gender, vehicle) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [username, password, role, fullName, address, email, phone, cccd, gender, vehicle]
        );
        res.json({ success: true, id: result.insertId, role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            const user = rows[0];
            // Ensure avatar_url is full path if needed, but relative is fine if frontend handles base URL
            // Let's return the relative path stored in DB. Frontend can prepend server URL.
            res.json({ success: true, user: { 
                id: user.id, 
                username: user.username, 
                role: user.role, 
                full_name: user.full_name,
                address: user.address,
                email: user.email,
                avatar_url: user.avatar_url,
                phone: user.phone,
                cccd: user.cccd,
                gender: user.gender,
                vehicle: user.vehicle
            }});
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Profile (Avatar + Info)
app.put('/api/users/:id', upload.single('avatar'), async (req, res) => {
    const userId = req.params.id;
    const { full_name, address, email } = req.body;
    const file = req.file;

    try {
        let query = 'UPDATE users SET full_name = ?, address = ?, email = ?';
        let params = [full_name, address, email];

        if (file) {
            // If new file uploaded, update avatar_url
            // Construct full URL or relative path. 
            // Better to store relative path "uploads/filename" or full URL "http://host/uploads/filename"
            // Let's store full URL for simplicity in Frontend, assuming host doesn't change often or we construct it.
            // Actually, best practice is relative, but for this simple app, let's construct a usable URL.
            // Using protocol and host from request might be tricky behind proxies, so let's store '/uploads/filename'.
            const avatarUrl = `/uploads/${file.filename}`;
            query += ', avatar_url = ?';
            params.push(avatarUrl);
        }

        query += ' WHERE id = ?';
        params.push(userId);

        await pool.query(query, params);

        // Return updated user info
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        const user = rows[0];

        res.json({ 
            success: true, 
            user: { 
                id: user.id, 
                username: user.username, 
                role: user.role, 
                full_name: user.full_name, 
                address: user.address,
                email: user.email,
                avatar_url: user.avatar_url 
            } 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get All Products (for AI or Search)
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT p.*, s.name as shop_name FROM products p JOIN shops s ON p.shop_id = s.id');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Shops & Products
app.get('/api/shops', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM shops');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/shops/:id', async (req, res) => {
    try {
        const [shop] = await pool.query('SELECT * FROM shops WHERE id = ?', [req.params.id]);
        const [products] = await pool.query('SELECT * FROM products WHERE shop_id = ?', [req.params.id]);
        if (shop.length === 0) return res.status(404).json({ error: 'Shop not found' });
        res.json({ ...shop[0], products });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Orders
app.post('/api/orders', async (req, res) => {
    const { userId, shopId, items, totalPrice, deliveryAddress, deliveryLat, deliveryLng } = req.body;
    // items: [{ productId, quantity, price }]
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, shop_id, status, total_price, delivery_address, delivery_lat, delivery_lng) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, shopId, 'pending', totalPrice, deliveryAddress, deliveryLat, deliveryLng]
        );
        const orderId = orderResult.insertId;

        for (const item of items) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.productId, item.quantity, item.price]
            );
        }

        await connection.commit();
        
        // Notify Shop
        // We assume shop admin userId is linked to shopId. simpler: emit to room 'shop_{shopId}'
        io.to(`shop_${shopId}`).emit('new_order', { orderId, totalPrice, items });
        
        res.json({ success: true, orderId });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// Get Orders (Role based)
app.get('/api/orders', async (req, res) => {
    const { role, userId, shopId } = req.query;
    try {
        let query = '';
        let params = [];

        if (role === 'user') {
            query = `
                SELECT o.*, s.name as shop_name, u.full_name as driver_name, u.phone as driver_phone
                FROM orders o
                JOIN shops s ON o.shop_id = s.id
                LEFT JOIN users u ON o.driver_id = u.id
                WHERE o.user_id = ?
                ORDER BY o.created_at DESC`;
            params = [userId];
        } else if (role === 'driver') {
            query = `
                SELECT o.*, s.name as shop_name, s.address as shop_address, u.full_name as user_name
                FROM orders o
                JOIN shops s ON o.shop_id = s.id
                JOIN users u ON o.user_id = u.id
                WHERE o.driver_id = ? OR o.status = 'finding_driver'
                ORDER BY o.created_at DESC`;
            params = [userId];
        } else if (role === 'shop') {
            query = `
                SELECT o.*, u.full_name as user_name, d.full_name as driver_name
                FROM orders o
                JOIN users u ON o.user_id = u.id
                LEFT JOIN users d ON o.driver_id = d.id
                WHERE o.shop_id = ?
                ORDER BY o.created_at DESC`;
            params = [shopId];
        } else {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Messages for an order
app.get('/api/orders/:id/messages', async (req, res) => {
    const orderId = req.params.id;
    try {
        const [messages] = await pool.query(
            'SELECT m.*, u.full_name, u.role FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.order_id = ? ORDER BY m.created_at ASC',
            [orderId]
        );
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Order Status
app.put('/api/orders/:id/status', async (req, res) => {
    const { status, driverId } = req.body;
    const orderId = req.params.id;
    console.log(`Cập nhật trạng thái đơn #${orderId}: ${status} (Driver: ${driverId})`);
    try {
        let query = 'UPDATE orders SET status = ?';
        let params = [status];

        if (driverId) {
            query += ', driver_id = ?';
            params.push(driverId);
        }
        
        query += ' WHERE id = ?';
        params.push(orderId);

        await pool.query(query, params);

        // Notify relevant parties
        const [orderRows] = await pool.query(`
            SELECT o.*, u.email as user_email, u.full_name as user_name 
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            WHERE o.id = ?`, [orderId]);

        if (orderRows.length > 0) {
            const o = orderRows[0];
            // Phát cho cả đơn hàng và toàn bộ hệ thống để tài xế nhận được tự động
            io.to(`order_${orderId}`).emit('status_update', { status, orderId });
            io.emit('status_update', { status, orderId }); 
            
            if (status === 'finding_driver') {
                io.emit('driver_notification', { message: 'New order available!', orderId }); // Broadcast to all drivers

                // --- BROADCAST ORDER TO NEARBY DRIVERS ---
                const [fullOrder] = await pool.query(`
                    SELECT o.*, s.name as ten_quan, s.lat as lat_don, s.lng as lng_don, s.image_url as hinh_anh_quan,
                           u.full_name as ten_khach_hang
                    FROM orders o 
                    JOIN shops s ON o.shop_id = s.id 
                    JOIN users u ON o.user_id = u.id
                    WHERE o.id = ?`, [orderId]);

                if (fullOrder.length > 0) {
                    const orderData = fullOrder[0];
                    // Fetch items for the popup
                    const [items] = await pool.query('SELECT p.name, oi.quantity FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [orderId]);
                    const itemNames = items.map(i => `${i.name} (${i.quantity})`).join(', ');

                    const socketData = {
                        orderId: orderId,
                        ma_don_hang: 'DH' + orderId,
                        ten_khach_hang: orderData.ten_khach_hang,
                        ten_mon_an: itemNames,
                        tong_tien: new Intl.NumberFormat('vi-VN').format(orderData.total_price) + 'đ',
                        ten_quan: orderData.ten_quan,
                        hinh_anh_quan: orderData.hinh_anh_quan,
                        lat_don: Number(orderData.lat_don),
                        lng_don: Number(orderData.lng_don),
                        dia_chi_giao: orderData.delivery_address,
                        lat_tra: Number(orderData.delivery_lat),
                        lng_tra: Number(orderData.delivery_lng)
                    };

                    console.log(`Đang quét ${onlineDrivers.size} tài xế đang trực tuyến...`);
                    
                    let notifiedCount = 0;
                    onlineDrivers.forEach((driver, sid) => {
                        // Gửi đơn cho tất cả tài xế đang online (Không giới hạn km)
                        io.to(sid).emit('place_order', socketData);
                        notifiedCount++;
                        
                        const dLat = Number(driver.lat);
                        const dLng = Number(driver.lng);
                        const sLat = Number(socketData.lat_don);
                        const sLng = Number(socketData.lng_don);
                        if (!isNaN(dLat) && !isNaN(dLng) && !isNaN(sLat) && !isNaN(sLng)) {
                            const dist = calculateDistance(sLat, sLng, dLat, dLng);
                            console.log(`- Đã nổ đơn cho Tài xế ${driver.driverId} (Cách quán ${dist.toFixed(2)}km)`);
                        } else {
                            console.log(`- Đã nổ đơn cho Tài xế ${driver.driverId} (Chưa rõ vị trí)`);
                        }
                    });
                    
                    if (notifiedCount === 0) {
                        console.log('⚠️ KHÔNG tìm thấy tài xế nào trong bán kính 10km.');
                    } else {
                        console.log(`✅ Đã gửi đơn hàng đến ${notifiedCount} tài xế.`);
                    }
                }

                // --- SEND CONFIRMATION EMAIL TO USER ---
                if (o.user_email) {
                    console.log(`Đang gửi email xác nhận đến: ${o.user_email}`);
                    // Fetch order items to include in email
                    const [items] = await pool.query(`
                        SELECT oi.*, p.name, p.image_url 
                        FROM order_items oi 
                        JOIN products p ON oi.product_id = p.id 
                        WHERE oi.order_id = ?`, [orderId]);

                    let itemsHtml = '';
                    items.forEach(item => {
                        let imgUrl = item.image_url;
                        if (imgUrl && !imgUrl.startsWith('http')) {
                            // Nếu là đường dẫn cục bộ, Gmail sẽ không hiển thị được.
                            // Nhưng ta vẫn gán đúng cấu trúc để sau này deploy sẽ tự chạy.
                            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
                            imgUrl = imgUrl.startsWith('/') ? `${baseUrl}${imgUrl}` : `${baseUrl}/${imgUrl}`;
                        }
                        
                        // Nếu không có ảnh, dùng ảnh mặc định chuyên nghiệp
                        if (!imgUrl) imgUrl = 'https://cdn-icons-png.flaticon.com/512/706/706164.png';

                        itemsHtml += `
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                    <img src="${imgUrl}" width="50" height="50" style="border-radius: 5px; object-fit: cover;" alt="Food" />
                                </td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 14px;">${item.name}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 14px;">${item.quantity}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-size: 14px; font-weight: bold;">${Number(item.price).toLocaleString('vi-VN')}đ</td>
                            </tr>`;
                    });

                    const mailOptions = {
                        from: `"GiaoHangTanNoi" <${process.env.EMAIL_USER}>`,
                        to: o.user_email,
                        subject: `✅ Xác nhận đơn hàng #${orderId} - GiaoHangTanNoi`,
                        html: `
                            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                                <div style="background-color: #00b14f; color: white; padding: 30px; text-align: center;">
                                    <h1 style="margin: 0; font-size: 24px;">Đơn hàng đã được xác nhận!</h1>
                                    <p style="margin: 10px 0 0; opacity: 0.9;">Cảm ơn bạn đã tin tưởng dịch vụ của chúng tôi</p>
                                </div>
                                
                                <div style="padding: 30px; color: #333;">
                                    <p>Chào <b>${o.user_name}</b>,</p>
                                    <p>Đơn hàng <b>#${orderId}</b> của bạn đã được nhà hàng xác nhận và đang bắt đầu chuẩn bị. Chúng tôi sẽ điều phối tài xế đến lấy hàng ngay lập tức.</p>
                                    
                                    <div style="background: #f9f9f9; border-radius: 10px; padding: 20px; margin: 25px 0;">
                                        <h3 style="margin-top: 0; color: #00b14f; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Chi tiết đơn hàng</h3>
                                        <table style="width: 100%; border-collapse: collapse;">
                                            ${itemsHtml}
                                            <tr style="border-top: 2px solid #ddd;">
                                                <td colspan="3" style="padding: 15px 0; font-weight: bold; text-align: right;">Tổng thanh toán:</td>
                                                <td style="padding: 15px 0; font-weight: bold; text-align: right; color: #d63031; font-size: 18px;">${Number(o.total_price).toLocaleString('vi-VN')}đ</td>
                                            </tr>
                                        </table>
                                    </div>

                                    <div style="border-left: 4px solid #00b14f; padding-left: 15px; margin: 20px 0;">
                                        <p style="margin: 0; font-size: 14px; color: #666;">Địa chỉ giao hàng:</p>
                                        <p style="margin: 5px 0 0; font-weight: bold;">${o.delivery_address}</p>
                                    </div>

                                    <p style="font-size: 14px; color: #888; line-height: 1.6;">
                                        Bạn có thể theo dõi hành trình của tài xế ngay trên ứng dụng GiaoHangTanNoi. Nếu có bất kỳ thắc mắc nào, đừng ngần ngại liên hệ với chúng tôi qua hotline hoặc reply email này.
                                    </p>
                                </div>

                                <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #999;">
                                    <p style="margin: 0;">© 2026 GiaoHangTanNoi. All rights reserved.</p>
                                    <p style="margin: 5px 0 0;">Số 1 Đường Cầu Diễn, Bắc Từ Liêm, Hà Nội</p>
                                </div>
                            </div>
                        `
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) console.error('Lỗi gửi email xác nhận:', error);
                        else console.log('Email xác nhận đã gửi: ' + info.response);
                    });
                }
            }

            // --- SEND EMAIL IF DELIVERED ---
            if (status === 'delivered' && o.user_email) {
                const mailOptions = {
                    from: `"GiaoHangTanNoi - Dịch vụ Giao hàng" <${process.env.EMAIL_USER || 'haiquan2482006@gmail.com'}>`,
                    to: o.user_email,
                    subject: `Đơn hàng #${orderId} giao hàng thành công!`,
                    text: `Chào ${o.user_name || 'bạn'},\n\nĐơn hàng #${orderId} của bạn đã giao thành công! Mọi hỗ trợ gì hãy liên hệ vào gmail: haiquan2482006@gmail.com\n\nCảm ơn bạn đã sử dụng dịch vụ!`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Lỗi gửi email:', error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
            }
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Likes / Favorites
app.post('/api/like', async (req, res) => {
    const { maNguoiDung, maQuan } = req.body;
    try {
        // Ensure table exists (quick fix for prototype)
        await pool.query(`CREATE TABLE IF NOT EXISTS favorites (
            user_id INT NOT NULL,
            shop_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, shop_id)
        )`);

        // Check if already liked
        const [exists] = await pool.query('SELECT * FROM favorites WHERE user_id = ? AND shop_id = ?', [maNguoiDung, maQuan]);
        
        if (exists.length > 0) {
            // Unlike
            await pool.query('DELETE FROM favorites WHERE user_id = ? AND shop_id = ?', [maNguoiDung, maQuan]);
            res.json({ success: true, message: 'Unliked', isFavorite: false });
        } else {
            // Like
            await pool.query('INSERT INTO favorites (user_id, shop_id) VALUES (?, ?)', [maNguoiDung, maQuan]);
            res.json({ success: true, message: 'Liked', isFavorite: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/like/:userId', async (req, res) => {
    try {
        // Ensure table exists
         await pool.query(`CREATE TABLE IF NOT EXISTS favorites (
            user_id INT NOT NULL,
            shop_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, shop_id)
        )`);

        const [rows] = await pool.query(`
            SELECT s.* 
            FROM favorites f 
            JOIN shops s ON f.shop_id = s.id 
            WHERE f.user_id = ?
        `, [req.params.userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CATCH-ALL ROUTE FOR FRONTEND (Regex for Express 5)
app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});


const PORT = process.env.PORT || 3000;

async function checkAndMigrate() {
    try {
        const connection = await pool.getConnection();
        try {
            // Check for delivery_lat
            const [columnsLat] = await connection.query("SHOW COLUMNS FROM orders LIKE 'delivery_lat'");
            if (columnsLat.length === 0) {
                console.log('Migrating: Adding delivery_lat to orders table...');
                await connection.query('ALTER TABLE orders ADD COLUMN delivery_lat DECIMAL(10, 8)');
            }

            // Check for delivery_lng
            const [columnsLng] = await connection.query("SHOW COLUMNS FROM orders LIKE 'delivery_lng'");
            if (columnsLng.length === 0) {
                console.log('Migrating: Adding delivery_lng to orders table...');
                await connection.query('ALTER TABLE orders ADD COLUMN delivery_lng DECIMAL(11, 8)');
            }

            // Check for messages table
            await connection.query(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_id INT NOT NULL,
                    sender_id INT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (order_id) REFERENCES orders(id),
                    FOREIGN KEY (sender_id) REFERENCES users(id)
                )
            `);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Migration check failed:', error);
    }
}

checkAndMigrate().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
