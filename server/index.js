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
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { MOCK_SHOPS, MOCK_PRODUCTS } = require('./mockData');
const axios = require('axios'); // Added for n8n
const { saveOrderToExcel } = require('./utils/excelHelper');
const { sendOrderToN8N } = require('./utils/n8nHelper');

// Helper to generate a unique simple Order Code (e.g., D001)
function generateOrderCode(orderId) {
    return `D${String(orderId).padStart(3, '0')}`;
}

const app = express();

// Initialize Gemini (Deprecated in favor of Groq)
// let model = null; ...

// Helper function for Groq AI
async function callGroqAI(prompt) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is missing");
    }
    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Groq API Error:", error.response ? error.response.data : error.message);
        throw error;
    }
}

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
        origin: "*",
        methods: ["GET", "POST"]
    }
});

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

app.use(cors());
app.use(express.json());

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
app.get('/api/health', (req, res) => res.send('OK'));

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

// --- AI Chat Route (Groq) ---
app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    let products = [];
    try {
        const [rows] = await pool.query('SELECT p.id, p.name, p.product_code, p.price, p.image_url, s.name as shop_name FROM products p JOIN shops s ON p.shop_id = s.id');
        products = rows;
        let orderContext = "User chưa đăng nhập hoặc không có đơn hàng gần đây.";
        if (userId) {
            const [orders] = await pool.query(`
                SELECT o.id, o.status, o.total_price, o.delivery_address, 
                       u_d.full_name as driver_name, u_c.full_name as customer_name, u_c.phone as customer_phone,
                       (SELECT GROUP_CONCAT(CONCAT('[', p.product_code, '] ', p.name, ' (', oi.quantity, ')') SEPARATOR ', ') 
                        FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as items
                FROM orders o 
                LEFT JOIN users u_d ON o.driver_id = u_d.id 
                JOIN users u_c ON o.user_id = u_c.id
                WHERE o.user_id = ? AND o.status != 'cancelled' 
                ORDER BY o.created_at DESC LIMIT 3`, [userId]);
            
            // Format orders to include the professional Order Code
            const formattedOrders = orders.map(o => ({
                ...o,
                orderCode: generateOrderCode(o.id)
            }));
            
            if (formattedOrders.length > 0) orderContext = JSON.stringify(formattedOrders);
        }
        const currentTime = new Date().toLocaleString('vi-VN');
        const productListForAI = products.map(p => ({ name: p.name, price: p.price, shop: p.shop_name }));
        
        let text = "";
        const n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/chat-ai';
        
        try {
            console.log(`Attempting n8n: ${n8nUrl}`);
            const n8nResponse = await axios.post(n8nUrl, { 
                chatInput: message, 
                userId: userId || 'guest', 
                context: { currentTime, menu: JSON.stringify(productListForAI), orderHistory: orderContext } 
            }, { timeout: 60000 });

            console.log("n8n Raw Response:", JSON.stringify(n8nResponse.data));

            let responseData = n8nResponse.data;
            
            if (Array.isArray(responseData) && responseData.length > 0) {
                responseData = responseData[0];
            }

            if (responseData && (responseData.output || responseData.text || responseData.message || responseData.content)) {
                text = responseData.output || responseData.text || responseData.message || responseData.content;
            } else if (typeof responseData === 'string') {
                text = responseData;
            } else {
                text = JSON.stringify(responseData);
            }
        } catch (e) { 
            console.log("n8n Error:", e.message);
            text = "Hệ thống AI đang bận. Nếu cần hỗ trợ gấp, vui lòng liên hệ email: haiquan2482006@gmail.com";
        }

        if (typeof text === 'object') text = JSON.stringify(text);
        
        // Debug: Nếu text rỗng, báo rõ ràng để người dùng biết
        if (!text || text.trim() === "" || text === "{}") {
             text = "⚠️ n8n trả về kết quả rỗng. Vui lòng kiểm tra Node 'Respond to Webhook' trong n8n. Đảm bảo nó trả về JSON có trường 'output', 'text' hoặc 'message'.";
        }
        
        const safeText = String(text || "");
        const suggestedProducts = products.filter(p => safeText.toLowerCase().includes(p.name.toLowerCase()));
        res.json({ reply: safeText, suggestedProducts });

    } catch (err) {
        console.error("AI Error:", err);
        res.json({ reply: `Lỗi hệ thống: ${err.message}`, suggestedProducts: [] });
    }
});

app.post('/api/payment/webhook', async (req, res) => {
    let connection;
    try {
        const { content, amount, description, orderCode } = req.body;
        console.log("Webhook:", req.body);
        let detectedOrderCode = null;
        const incomingContent = content || description || orderCode || "";
        const match = incomingContent.match(/((?:D|DH)\s?\d+)/i);
        if (match) {
            detectedOrderCode = match[1].replace(/\s/g, '').toUpperCase();
        } else {
            if (orderCode) detectedOrderCode = orderCode;
        }

        if (!detectedOrderCode) {
            console.error("❌ [Webhook] Failed: No order code found in content:", incomingContent);
            return res.status(400).json({ success: false, message: "No order code found in content" });
        }

        console.log(`✅ [Webhook] Identified Order: ${detectedOrderCode}, Amount: ${amount}`);

        // Trích xuất ID số từ mã DH (ví dụ DH123 -> 123) để update vào DB
        const orderIdNum = parseInt(detectedOrderCode.replace(/\D/g, ''));

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 4. Lưu lịch sử giao dịch
        await connection.query(
            'INSERT INTO transactions (order_code, amount, content, gateway) VALUES (?, ?, ?, ?)',
            [detectedOrderCode, amount, incomingContent, 'webhook']
        );

        // 5. CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG -> finding_driver
        if (orderIdNum) {
            await connection.query(
                "UPDATE orders SET status = 'finding_driver' WHERE id = ?", 
                [orderIdNum]
            );

            // 6. BẮN SOCKET CHO FRONTEND
            io.to(`order_${orderIdNum}`).emit('payment_success', { 
                orderId: orderIdNum,
                status: 'finding_driver',
                message: 'Thanh toán thành công'
            });
            
            io.to(`order_${orderIdNum}`).emit('status_update', { 
                status: 'finding_driver', 
                orderId: orderIdNum 
            });

            console.log(`🚀 Đã cập nhật đơn #${orderIdNum} -> finding_driver và báo cho Client.`);
            
            // Fetch full order details for sync
            try {
                const [orderDetailRows] = await connection.query(`
                    SELECT o.id, u.full_name, u.phone, s.name as shop_name, o.delivery_address, o.total_price, o.status
                    FROM orders o
                    JOIN users u ON o.user_id = u.id
                    JOIN shops s ON o.shop_id = s.id
                    WHERE o.id = ?`, [orderIdNum]);

                if (orderDetailRows.length > 0) {
                    const od = orderDetailRows[0];
                    const [itemRows] = await connection.query(`
                        SELECT p.name, p.product_code, oi.quantity 
                        FROM order_items oi 
                        JOIN products p ON oi.product_id = p.id 
                        WHERE oi.order_id = ?`, [orderIdNum]);
                    
                    const itemNames = itemRows.map(i => {
                        const code = i.product_code ? `${i.product_code} - ` : '';
                        return `${code}${i.name} (${i.quantity})`;
                    }).join(', ');

                    const orderPayload = {
                        orderId: generateOrderCode(orderIdNum),
                        customerName: od.full_name,
                        phone: od.phone,
                        address: od.delivery_address,
                        shopName: od.shop_name,
                        items: itemNames,
                        totalPrice: od.total_price,
                        status: 'finding_driver'
                    };

                    await saveOrderToExcel(orderPayload);
                    await sendOrderToN8N(orderPayload);
                }
            } catch (syncErr) {
                console.error("Webhook sync error:", syncErr);
            }
        }

        await connection.commit();
        res.json({ success: true });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error("❌ Webhook Error:", err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// 2. Client polling check trạng thái
app.get('/api/payment/check/:code', async (req, res) => {
    const { code } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM transactions WHERE order_code = ? LIMIT 1', [code]);
        if (rows.length > 0) {
            return res.json({ paid: true, data: rows[0] });
        }
        return res.json({ paid: false });
    } catch (err) {
        console.error("Check Payment Error:", err);
        return res.json({ paid: false });
    }
});

app.post('/api/payment/register', (req, res) => {
    // Với webhook thật, ta không cần đăng ký trước vào Map bộ nhớ, 
    // nhưng giữ lại endpoint này để client không bị lỗi 404 nếu vẫn gọi.
    res.json({ success: true });
});

// --- API Routes ---

// Auth
app.post('/api/auth/register', async (req, res) => {
    const { username, password, role, fullName, address, email, phone, cccd, gender, vehicle } = req.body;
    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
        const [result] = await pool.query(
            'INSERT INTO users (username, password, role, full_name, address, email, phone, cccd, gender, vehicle) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [username, password, role, fullName, address, email, phone, cccd, gender, vehicle]
        );
        res.json({ success: true, id: result.insertId, role });
    } catch (err) {
        // Fallback Mock Register (Simulated)
        console.error("DB Error Register, using mock:", err.message);
        res.json({ success: true, id: 999, role });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            const user = rows[0];
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
        // Fallback Mock Login
        console.error("DB Error Login, using mock:", err.message);
        if (username === 'admin' && password === '123456') {
            res.json({ success: true, user: { id: 1, username: 'admin', role: 'user', full_name: 'Người dùng Mẫu', email: 'test@gmail.com' } });
        } else if (username === 'driver' && password === '123456') {
             res.json({ success: true, user: { id: 2, username: 'driver', role: 'driver', full_name: 'Tài xế Mẫu', email: 'driver@gmail.com' } });
        } else {
             // Allow any login in fallback mode for testing
             res.json({ success: true, user: { id: 999, username: username, role: 'user', full_name: 'Khách hàng', email: 'guest@gmail.com' } });
        }
    }
});

// Update Profile (Avatar + Info)
app.put('/api/users/:id', upload.single('avatar'), async (req, res) => {
    const userId = req.params.id;
    const { full_name, address, email, phone } = req.body;
    const file = req.file;

    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
        let query = 'UPDATE users SET full_name = ?, address = ?, email = ?, phone = ?';
        let params = [full_name, address, email, phone];

        if (file) {
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
                phone: user.phone,
                avatar_url: user.avatar_url 
            } 
        });

    } catch (err) {
        console.error("DB Error Profile Update, using mock:", err.message);
        res.json({ 
            success: true, 
            user: { 
                id: userId, 
                username: 'mockUser', 
                role: 'user', 
                full_name: full_name, 
                address: address,
                email: email,
                avatar_url: file ? `/uploads/${file.filename}` : null 
            } 
        });
    }
});

// Get All Products (for AI or Search)
app.get('/api/products', async (req, res) => {
    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
        const [rows] = await pool.query('SELECT p.*, s.name as shop_name FROM products p JOIN shops s ON p.shop_id = s.id');
        res.json(rows);
    } catch (err) {
        console.error("DB Error /api/products, using mock:", err.message);
        res.json(MOCK_PRODUCTS);
    }
});

// Shops & Products
app.get('/api/shops', async (req, res) => {
    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
        const [rows] = await pool.query('SELECT * FROM shops');
        res.json(rows);
    } catch (err) {
        console.error("DB Error /api/shops, using mock:", err.message);
        res.json(MOCK_SHOPS);
    }
});

app.get('/api/shops/:id', async (req, res) => {
    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
        const [shop] = await pool.query('SELECT * FROM shops WHERE id = ?', [req.params.id]);
        const [products] = await pool.query('SELECT id, shop_id, name, product_code, price, image_url FROM products WHERE shop_id = ?', [req.params.id]);
        if (shop.length === 0) return res.status(404).json({ error: 'Shop not found' });
        res.json({ ...shop[0], products });
    } catch (err) {
        console.error("DB Error /api/shops/:id, using mock:", err.message);
        const shop = MOCK_SHOPS.find(s => s.id == req.params.id);
        if (shop) {
             const prods = MOCK_PRODUCTS.filter(p => p.shop_id == req.params.id);
             res.json({ ...shop, products: prods });
        } else {
             res.status(404).json({ error: 'Shop not found (Mock)' });
        }
    }
});

app.get('/api/shops/:id/stats', async (req, res) => {
    const shopId = req.params.id;
    const date = req.query.date; // Expect YYYY-MM-DD format

    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
        let dateFilter = '';
        const params = [shopId];

        if (date) {
            dateFilter = ' AND DATE(o.created_at) = ?';
            params.push(date);
        }

        // 1. Top Selling Products
        const [topProducts] = await pool.query(`
            SELECT p.name, SUM(oi.quantity) as sold 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            JOIN orders o ON oi.order_id = o.id 
            WHERE o.shop_id = ? ${dateFilter}
            GROUP BY p.name 
            ORDER BY sold DESC 
            LIMIT 5
        `, params);

        // 2. Peak Purchase Times (by Hour)
        const [peakTimes] = await pool.query(`
            SELECT HOUR(created_at) as order_hour, COUNT(*) as count 
            FROM orders 
            WHERE shop_id = ? ${dateFilter.replace('o.', '')}
            GROUP BY order_hour 
            ORDER BY order_hour
        `, params);

        res.json({ topProducts, peakTimes });
    } catch (err) {
        // Mock Stats
        res.json({ 
            topProducts: [{ name: "Mock Product 1", sold: 50 }, { name: "Mock Product 2", sold: 30 }], 
            peakTimes: [{ order_hour: 12, count: 20 }, { order_hour: 19, count: 15 }] 
        });
    }
});

// Orders
app.post('/api/orders', async (req, res) => {
    const { userId, shopId, items, totalPrice, deliveryAddress, deliveryLat, deliveryLng } = req.body;
    // items: [{ productId, quantity, price }]
    const connection = await pool.getConnection();
    try {
        await connection.query(`USE ${process.env.DB_NAME}`);
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
        
        // Save to Excel for AI Support
        try {
            const [orderDetailRows] = await pool.query(`
                SELECT o.id, u.full_name, u.phone, s.name as shop_name, o.delivery_address, o.total_price, o.status
                FROM orders o
                JOIN users u ON o.user_id = u.id
                JOIN shops s ON o.shop_id = s.id
                WHERE o.id = ?`, [orderId]);

            if (orderDetailRows.length > 0) {
                const od = orderDetailRows[0];
                const [itemRows] = await pool.query(`
                    SELECT p.name, p.product_code, oi.quantity 
                    FROM order_items oi 
                    JOIN products p ON oi.product_id = p.id 
                    WHERE oi.order_id = ?`, [orderId]);
                
                const itemNames = itemRows.map(i => {
                    const code = i.product_code ? `${i.product_code} - ` : '';
                    return `${code}${i.name} (${i.quantity})`;
                }).join(', ');

                const orderPayload = {
                    orderId: generateOrderCode(orderId),
                    customerName: od.full_name,
                    phone: od.phone,
                    address: od.delivery_address,
                    shopName: od.shop_name,
                    items: itemNames,
                    totalPrice: od.total_price,
                    status: od.status
                };

                await saveOrderToExcel(orderPayload);
                await sendOrderToN8N(orderPayload);
            }
        } catch (excelErr) {
            console.error("Failed to save to Excel:", excelErr);
        }

        // Notify Shop
        // We assume shop admin userId is linked to shopId. simpler: emit to room 'shop_{shopId}'
        const finalOrderCode = generateOrderCode(orderId);
        io.to(`shop_${shopId}`).emit('new_order', { orderId, orderCode: finalOrderCode, totalPrice, items });
        
        res.json({ success: true, orderId, orderCode: finalOrderCode });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error("DB Error Place Order:", err.message);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi đặt hàng. Vui lòng thử lại." });
    } finally {
        if (connection) connection.release();
    }
});

// Get Orders (Role based)
app.get('/api/orders', async (req, res) => {
    const { role, userId, shopId } = req.query;
    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
        let query = '';
        let params = [];

        if (role === 'user') {
            query = `
                SELECT o.*, s.name as shop_name, u.full_name as driver_name, u.phone as driver_phone,
                       (SELECT p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as first_product_image,
                       (SELECT p.id FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as first_product_id,
                       (SELECT COUNT(*) FROM reviews r WHERE r.order_id = o.id AND r.user_id = ?) > 0 as is_completed_by_user,
                       (SELECT GROUP_CONCAT(CONCAT('[', p.product_code, '] ', p.name, ' (', oi.quantity, ')') SEPARATOR ', ') 
                        FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as item_details
                FROM orders o
                JOIN shops s ON o.shop_id = s.id
                LEFT JOIN users u ON o.driver_id = u.id
                WHERE o.user_id = ?
                ORDER BY o.created_at DESC`;
            params = [userId, userId];
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
                SELECT o.*, u.full_name as user_name, d.full_name as driver_name,
                       (SELECT p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as first_product_image
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
        
        // Add formatted orderCode to each row
        const formattedRows = rows.map(row => ({
            ...row,
            order_code: generateOrderCode(row.id)
        }));
        
        res.json(formattedRows);
    } catch (err) {
        console.error("DB Error Get Orders, using mock:", err.message);
        res.json([]); // Return empty list for now
    }
});

// Get Messages for an order
app.get('/api/orders/:id/messages', async (req, res) => {
    const orderId = req.params.id;
    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
        const [messages] = await pool.query(
            'SELECT m.*, u.full_name, u.role FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.order_id = ? ORDER BY m.created_at ASC',
            [orderId]
        );
        res.json(messages);
    } catch (err) {
        res.json([]);
    }
});

// Update Order Status
app.put('/api/orders/:id/status', async (req, res) => {
    const { status, driverId } = req.body;
    const orderId = req.params.id;
    console.log(`Cập nhật trạng thái đơn #${orderId}: ${status} (Driver: ${driverId})`);
    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
        let query = 'UPDATE orders SET status = ?';
        let params = [status];

        if (driverId) {
            query += ', driver_id = ?';
            params.push(driverId);
        }
        
        query += ' WHERE id = ?';
        params.push(orderId);

        await pool.query(query, params);

        // Fetch full order details to ensure Excel and n8n have complete data for updating
        try {
            const [orderDetailRows] = await pool.query(`
                SELECT o.id, u.full_name, u.phone, s.name as shop_name, o.delivery_address, o.total_price, o.status
                FROM orders o
                JOIN users u ON o.user_id = u.id
                JOIN shops s ON o.shop_id = s.id
                WHERE o.id = ?`, [orderId]);

            if (orderDetailRows.length > 0) {
                const od = orderDetailRows[0];
                const [itemRows] = await pool.query(`
                    SELECT p.name, p.product_code, oi.quantity 
                    FROM order_items oi 
                    JOIN products p ON oi.product_id = p.id 
                    WHERE oi.order_id = ?`, [orderId]);
                
                const itemNames = itemRows.map(i => {
                    const code = i.product_code ? `${i.product_code} - ` : '';
                    return `${code}${i.name} (${i.quantity})`;
                }).join(', ');

                const orderPayload = {
                    orderId: generateOrderCode(orderId),
                    customerName: od.full_name,
                    phone: od.phone,
                    address: od.delivery_address,
                    shopName: od.shop_name,
                    items: itemNames,
                    totalPrice: od.total_price,
                    status: od.status // This is the new status
                };

                await saveOrderToExcel(orderPayload);
                await sendOrderToN8N(orderPayload);
            }
        } catch (syncErr) {
            console.error("Sync error:", syncErr);
        }

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
                            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
                            imgUrl = imgUrl.startsWith('/') ? `${baseUrl}${imgUrl}` : `${baseUrl}/${imgUrl}`;
                        }
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
                        subject: `✅Xác nhận đơn hàng #${orderId} - GiaoHangTanNoi`,
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
                    text: `Chào ${o.user_name || 'bạn'},

Đơn hàng #${orderId} của bạn đã giao thành công! Mọi hỗ trợ gì hãy liên hệ vào gmail: haiquan2482006@gmail.com

Cảm ơn bạn đã sử dụng dịch vụ!`
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
        // Fallback Success for status update
        console.error("DB Error Update Status, using mock:", err.message);
        res.json({ success: true });
    }
});

// Likes / Favorites
app.post('/api/like', async (req, res) => {
    const { maNguoiDung, maQuan } = req.body;
    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
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
        console.error("DB Error Like, using mock:", err.message);
        // Mock success
        res.json({ success: true, message: 'Liked (Mock)', isFavorite: true });
    }
});

app.get('/api/like/:userId', async (req, res) => {
    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
        // Ensure table exists
         await pool.query(`CREATE TABLE IF NOT EXISTS favorites (
            user_id INT NOT NULL,
            shop_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, shop_id)
        )`);

        const [rows] = await pool.query(`
            SELECT s.* FROM favorites f 
            JOIN shops s ON f.shop_id = s.id 
            WHERE f.user_id = ?
        `, [req.params.userId]);
        res.json(rows);
    } catch (err) {
         console.error("DB Error Get Likes, using mock:", err.message);
         res.json([]); // Return empty list
    }
});

// Reviews
app.post('/api/reviews', async (req, res) => {
    const { orderId, driverId, userId, rating, comment } = req.body;
    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
        await pool.query(
            'INSERT INTO reviews (order_id, driver_id, user_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
            [orderId, driverId, userId, rating, comment]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/:id/reviews', async (req, res) => {
    const driverId = req.params.id;
    try {
        await pool.query(`USE ${process.env.DB_NAME}`);
        const [reviews] = await pool.query(`
            SELECT r.*, u.full_name as user_name, u.avatar_url as user_avatar
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.driver_id = ?
            ORDER BY r.created_at DESC
        `, [driverId]);

        const [stats] = await pool.query(`
            SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews
            FROM reviews
            WHERE driver_id = ?
        `, [driverId]);

        res.json({
            reviews,
            averageRating: stats[0].average_rating || 0,
            totalReviews: stats[0].total_reviews || 0
        });
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

            console.log("🔄 Initializing Database...");

            // ... (code cũ)

            await connection.query(`USE ${process.env.DB_NAME}`);



            // TỰ ĐỘNG CẬP NHẬT ẢNH THẬT KHI KHỞI ĐỘNG

            console.log("🖼️ Syncing product images...");

            const productUpdates = [

                { name: 'Cơm rang dưa bò', image: 'comrangduabo.webp' },

                { name: 'Cơm rang đùi gà', image: 'comrangduiga.webp' },

                { name: 'Cơm rang hải sản', image: 'comranghaisan.webp' },

                { name: 'Cơm rang thập cẩm', image: 'comrangthapcam.webp' },

                { name: 'Burger Bulgogi', image: 'Burger_Bulgogi.webp' },

                { name: 'Burger tôm', image: 'Burger_Tom.webp' },

                { name: 'Gà Rán Phần', image: 'garanphan.webp' },

                { name: 'Gà sốt dâu 3 miếng', image: 'gasotdau3mieng.webp' },

                { name: 'Gà sốt phô mai 3 miếng', image: 'gasotphomai3mieng.webp' },

                { name: 'Mỳ', image: 'myy.webp' },

                { name: 'Bơ xào', image: 'boxao.png' },

                { name: 'Cocacola', image: 'coca.png' },

                { name: 'Cơm thố bơ', image: 'comthobo.png' },

                { name: 'Cơm thố đặc biệt', image: 'comthodacbiet.png' },

                { name: 'Cơm thố dương châu', image: 'comthoduongchau.png' },

                { name: 'Cơm thố sườn nướng', image: 'comthosuonnuong.png' },

                { name: 'Cơm thố gà quay', image: 'comthogaquay.png' },

                { name: 'Cơm thố gà', image: 'comthoga.png' },

                { name: 'Gà nướng', image: 'ganuong.png' },

                { name: 'Gà hầm thuốc bắc', image: 'gahamthuoc.jpg' },

                { name: 'Gà hầm thập cẩm', image: 'gahamthapcam.jpg' },

                { name: 'Gà đóng hộp', image: 'gadonghop.jpg' },

                { name: 'Gà hầm sâm', image: 'gahamxam.jpg' },

                { name: 'Gà hầm ngải cứu', image: 'gahamngaicuu.jpg' },

                { name: 'Gà hầm hạt sen', image: 'gahamhatsen.jpg' },

                { name: 'Hồng trà kem phô mai', image: 'hongtrakemphomaisizeM.webp' },

                { name: 'Ô long kem phô mai', image: 'olongkemphomaisizeM.webp' },

                { name: 'Trà xanh kem phô mai', image: 'traxanhkemphomaisizeM.webp' },

                { name: 'Hồng trà khổng lồ', image: 'hongtramanquehoakhonglo.webp' },

                { name: 'Trà trân châu khổng lồ', image: 'suatuoichantrauduonghokhonglo.webp' },

                { name: 'Trà sữa dâu tây', image: 'trasuadaytaysizeM.webp' },

                { name: 'Bánh cuốn chả nướng', image: 'banhcuonchanuong.webp' },

                { name: 'Bánh cuốn chả quế', image: 'banhcuonchaque.webp' },

                { name: 'Bún chả chấm', image: 'bunchacham.webp' },

                { name: 'Bánh cuốn trứng', image: 'banhcuontrung.webp' },

                { name: 'Bún bò huế', image: 'bunbohue.jpg' },

                { name: 'Super sundae xoài', image: 'Super_sundae_xoai.webp' },

                { name: 'Super sundae dâu tây', image: 'Supersundae_dautay.webp' },

                { name: 'Super sundae socola', image: 'Supersundaesocola.webp' },

                { name: 'Trà bí đao', image: 'tradaobigsize.webp' },

                { name: 'Trà ô long kiwi', image: 'traolongkiwi.webp' },

                { name: 'Dương chi cam lộ', image: 'duongchicamlo.webp' }

            ];



            for (const item of productUpdates) {

                await connection.query(

                    'UPDATE products SET image_url = ? WHERE name = ?',

                    [`/uploads/${item.image}`, item.name]

                );

            }

            console.log("✅ Product images synced.");

            // Check if tables exist, if not run migration manually or via seed
            const [tables] = await connection.query("SHOW TABLES LIKE 'users'");
            if (tables.length === 0) {
                console.log("⚠️ Tables not found. Creating schema...");
                const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
                const statements = schemaSql.split(';').filter(s => s.trim());
                for (const statement of statements) {
                    if (statement.trim()) {
                        await connection.query(statement);
                    }
                }
                console.log("✅ Schema created.");
                
                // Optional: Run Seed here if needed
                // const { exec } = require('child_process');
                // exec('node server/seed.js', (err, stdout) => console.log(stdout));
            } else {
                // Check for delivery_lat (Migration check)
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

                // Check for product_code
                const [columnsPC] = await connection.query("SHOW COLUMNS FROM products LIKE 'product_code'");
                if (columnsPC.length === 0) {
                    console.log('Migrating: Adding product_code to products table...');
                    await connection.query('ALTER TABLE products ADD COLUMN product_code VARCHAR(50)');
                }

                // Auto-generate product codes for ALL products if missing
                const [productsWithoutCode] = await connection.query('SELECT id, name FROM products WHERE product_code IS NULL OR product_code = ""');
                
                if (productsWithoutCode.length > 0) {
                    console.log(`🏷️ Generating codes for ${productsWithoutCode.length} products...`);
                    for (const product of productsWithoutCode) {
                        const firstChar = product.name.trim().charAt(0).toUpperCase();
                        // Find how many products already have a code starting with this letter
                        const [existing] = await connection.query(
                            'SELECT COUNT(*) as count FROM products WHERE product_code LIKE ?',
                            [`${firstChar}%`]
                        );
                        const nextNumber = existing[0].count + 1;
                        const newCode = `${firstChar}${String(nextNumber).padStart(3, '0')}`; // e.g., G001
                        
                        await connection.query(
                            'UPDATE products SET product_code = ? WHERE id = ?',
                            [newCode, product.id]
                        );
                    }
                    console.log("✅ All product codes generated.");
                }
            }

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