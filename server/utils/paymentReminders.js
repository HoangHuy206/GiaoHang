const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');
const pool = require('../db');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const userStates = {}; 

// Các link GIF trực tiếp (Giphy Clean URLs)
const GIF_LINKS = {
    welcome: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3o3VEtNR3B4VjU2cFA3dUUmZXA9djFfaW50ZXJuYWxfZ2lmX2J5X2lkJmN0PWc/3o7TKMGpxV5R6pP7uE/giphy.gif',
    success: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM383VEtWVW43aU04Rk1FVTU0JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKVUn7iM8FMEU24/giphy.gif',
    money: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnE1M3RndW1uZW12ZmtqbmZ4ZmtqbmZ4ZmtqbmZ4ZmtqbmZ4ZmtqYmImZXA9djFfaW50ZXJuYWxfZ2lmX2J5X2lkJmN0PWc/U6Y0IuJidW1i6T6Y6E/giphy.gif',
    scooter: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnE1M3RndW1uZW12ZmtqbmZ4ZmtqbmZ4ZmtqbmZ4ZmtqbmZ4ZmtqYmImZXA9djFfaW50ZXJuYWxfZ2lmX2J5X2lkJmN0PWc/U6Y0IuJidW1i6T6Y6E/giphy.gif'
};

let bot = null;

// Hàm hỗ trợ tải GIF và gửi trực tiếp (Đảm bảo 100% hiển thị)
async function sendAnimatedGif(chatId, url, caption = '') {
    if (!bot) return;
    try {
        await bot.sendAnimation(chatId, url, { caption, parse_mode: 'HTML' });
    } catch (e) {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
            const buffer = Buffer.from(response.data, 'binary');
            await bot.sendAnimation(chatId, buffer, { caption, parse_mode: 'HTML' }, { filename: 'animation.gif', contentType: 'image/gif' });
        } catch (err2) {
            console.error("⚠️ Không thể gửi GIF, chuyển sang tin nhắn văn bản.");
            if (caption) await bot.sendMessage(chatId, caption, { parse_mode: 'HTML' });
        }
    }
}

async function sendRefundNotification(orderId) {
    try {
        const [rows] = await pool.query(`SELECT o.id, o.shop_id, o.total_price, u.full_name as customer_name, o.customer_bank_code, o.customer_bank_account, s.name as shopName, s.telegram_chat_id as shopChatId FROM orders o JOIN users u ON o.user_id = u.id JOIN shops s ON o.shop_id = s.id WHERE o.id = ? AND o.payment_status = 'paid'`, [orderId]);
        if (rows.length === 0) return;
        const o = rows[0];
        const qrUrl = `https://img.vietqr.io/image/${o.customer_bank_code || 'MB'}-${o.customer_bank_account}-compact2.jpg?amount=${Math.round(o.total_price)}&addInfo=HOAN TIEN DH${o.id}`;
        const msg = `⚠️ <b>YÊU CẦU HOÀN TIỀN DH${o.id}</b>\n\n💰 Tiền: <b>${new Intl.NumberFormat('vi-VN').format(o.total_price)}đ</b>\n👤 Khách: <b>${o.customer_name}</b>\n🏦 Ngân hàng: <b>${o.customer_bank_code}</b>\n💳 STK: <code>${o.customer_bank_account}</code>`;
        const target = o.shopChatId || process.env.TELEGRAM_CHAT_ID;
        if (target && bot) {
            await bot.sendPhoto(target, qrUrl, { caption: msg, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '✅ Đã hoàn tiền', callback_data: `refunded_${o.id}` }], [{ text: '📞 Liên hệ', callback_data: `contact_cust_${o.id}` }]] } });
            await pool.query('UPDATE orders SET refund_notified = 1 WHERE id = ?', [o.id]);
        }
    } catch (e) {
        console.error("Error sending refund notification:", e);
    }
}

async function sendDailyReport() {
    try {
        const [shops] = await pool.query('SELECT id, name, telegram_chat_id FROM shops WHERE telegram_chat_id IS NOT NULL AND telegram_chat_id != ""');
        for (const shop of shops) {
            const [stats] = await pool.query(`SELECT COUNT(*) as totalOrders, SUM(total_price) as totalRevenue FROM orders WHERE shop_id = ? AND status = 'delivered' AND DATE(created_at) = CURDATE()`, [shop.id]);
            if (stats[0].totalOrders === 0) {
                await bot.sendMessage(shop.telegram_chat_id, `📊 <b>BÁO CÁO NGÀY ${new Date().toLocaleDateString('vi-VN')}</b>\n\n🏪 Shop: <b>${shop.name}</b>\n\nHôm nay chưa có đơn hoàn thành.`, { parse_mode: 'HTML' });
                continue;
            }
            const reportMsg = `📊 <b>BÁO CÁO NGÀY ${new Date().toLocaleDateString('vi-VN')}</b>\n\n🏪 Shop: <b>${shop.name}</b>\n✅ Tổng đơn: <b>${stats[0].totalOrders}</b>\n💰 Doanh thu: <b>${new Intl.NumberFormat('vi-VN').format(stats[0].totalRevenue)}đ</b>`;
            sendAnimatedGif(shop.telegram_chat_id, GIF_LINKS.money, reportMsg);
        }
    } catch (e) {
        console.error("Error sending daily report:", e);
    }
}

module.exports = function(io) {
    if (token) {
        try {
            // Chỉ chạy polling trên instance đầu tiên (nếu dùng PM2)
            const isFirstInstance = process.env.NODE_APP_INSTANCE === undefined || process.env.NODE_APP_INSTANCE === '0';
            const disablePolling = process.env.DISABLE_TELEGRAM_POLLING === 'true';

            bot = new TelegramBot(token, { polling: isFirstInstance && !disablePolling });
            
            if (isFirstInstance && !disablePolling) {
                console.log("🤖 Telegram Bot Polling started.");
            } else {
                console.log("🤖 Telegram Bot started in Send-only mode.");
            }
            bot.on('polling_error', (error) => {
                if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
                    console.error("⚠️ CẢNH BÁO: Xung đột Bot Telegram (409 Conflict).");
                    bot.stopPolling();
                }
            });

            bot.on('message', async (msg) => {
                const chatId = msg.chat.id;
                const text = msg.text;
                const chatIdStr = String(chatId);

                console.log(`[Bot Message] From: ${chatIdStr}, Text: ${text}`);

                // 0. Lưu Chat ID vào bot_users
                try {
                    await pool.query('REPLACE INTO bot_users (chat_id, last_seen) VALUES (?, NOW())', [chatIdStr]);
                } catch (e) { console.error("Error saving bot user:", e.message); }

                // 1. Phản hồi các lệnh đơn giản
                if (text === '/myid') {
                    return bot.sendMessage(chatId, `🆔 Chat ID của bạn là: <code>${chatIdStr}</code>`, { parse_mode: 'HTML' });
                }

                if (text === '/cancel') { 
                    delete userStates[chatId]; 
                    return bot.sendMessage(chatId, "❌ Đã hủy thao tác."); 
                }

                if (text === '/themid') {
                    return bot.sendMessage(chatId, "🆔 <b>TÍCH HỢP TELEGRAM</b>\n\nBạn đã có Shop trên hệ thống chưa?", {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '✅ Đã có Shop', callback_data: 'has_shop' }],
                                [{ text: '➕ Tạo Shop mới', callback_data: 'no_shop' }]
                            ]
                        }
                    });
                }

                const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '5807941249';
                const isAdmin = (chatIdStr === ADMIN_CHAT_ID);
                let isShop = false;
                
                const needsDb = ['/start', '/help', '/shop', '/xemsp', '/add_product', '/xoasp', '/admin_list', '/themid', '/trangthai'].some(cmd => text === cmd || (text && (text.startsWith('/admin_delete') || text.startsWith('/thongbao'))));
                
                if (needsDb || userStates[chatId]) {
                    try {
                        const [shopRows] = await pool.query('SELECT name FROM shops WHERE telegram_chat_id = ?', [chatIdStr]);
                        if (shopRows.length > 0) isShop = true;
                    } catch (e) {}
                }

                if (text === '/start' || text === '/help') {
                    let welcomeMsg = `👋 Chào bạn! Đây là Bot GiaoHangTanNoi <b>(V3)</b>\n\n` +
                                     `🆔 Chat ID của bạn là: <code>${chatIdStr}</code>\n\n` +
                                     `✅ <b>Lệnh khả dụng:</b>\n\n`;

                    if (isAdmin) {
                        welcomeMsg += `📋 /admin_list - Danh sách tất cả Shop\n` +
                                     `🗑️ /admin_delete [ID] - Xóa Shop\n` +
                                     `📣 /thongbao [Nội dung] - Gửi thông báo toàn hệ thống\n`;
                    }

                    if (isShop || isAdmin) {
                        welcomeMsg += `🏪 /shop - Xem thông tin Shop\n` +
                                     `📦 /xemsp - Danh sách món ăn\n` +
                                     `🍔 /add_product - Thêm món ăn mới\n` +
                                     `🗑️ /xoasp - Xóa món ăn\n` +
                                     `🚪 /trangthai - Đóng/Mở Shop nhanh\n` +
                                     `❌ /cancel - Hủy thao tác\n`;
                    }

                    welcomeMsg += `🆔 /myid - Xem Chat ID của bạn\n` +
                                 `🆔 /themid - Tích hợp ID & Tạo Shop mới\n\n` +
                                 `<i>Sử dụng /themid để liên kết Telegram với Shop của bạn!</i>`;

                    sendAnimatedGif(chatId, 'https://i.giphy.com/3o7TKMGpxV5R6pP7uE.gif', welcomeMsg);
                    return;
                }

                if (isAdmin) {
                    if (text === '/admin_list') {
                        try {
                            const [rows] = await pool.query('SELECT s.id, s.name, u.full_name as owner FROM shops s LEFT JOIN users u ON s.user_id = u.id');
                            if (rows.length === 0) return bot.sendMessage(chatId, "Hệ thống chưa có Shop nào.");
                            let m = "📋 <b>DANH SÁCH SHOP:</b>\n\n";
                            rows.forEach(s => { m += `ID: <code>${s.id}</code> - <b>${s.name}</b> (${s.owner || 'N/A'})\n`; });
                            bot.sendMessage(chatId, m, { parse_mode: 'HTML' });
                        } catch (e) { bot.sendMessage(chatId, "Lỗi tải danh sách."); }
                        return;
                    }

                    if (text && text.startsWith('/thongbao')) {
                        const broadcastMsg = text.replace('/thongbao', '').trim();
                        if (!broadcastMsg) return bot.sendMessage(chatId, "⚠️ Nhập: <code>/thongbao [Nội dung]</code>", { parse_mode: 'HTML' });
                        
                        try {
                            const [users] = await pool.query('SELECT chat_id FROM bot_users');
                            bot.sendMessage(chatId, `⏳ Đang gửi thông báo cho <b>${users.length}</b> người dùng...`, { parse_mode: 'HTML' });
                            
                            let count = 0;
                            for (const u of users) {
                                try {
                                    await bot.sendMessage(u.chat_id, `📣 <b>THÔNG BÁO TỪ HỆ THỐNG:</b>\n\n${broadcastMsg}`, { parse_mode: 'HTML' });
                                    count++;
                                } catch (err) { console.error(`Lỗi gửi thông báo cho ${u.chat_id}:`, err.message); }
                            }
                            bot.sendMessage(chatId, `✅ <b>HOÀN TẤT:</b> Đã gửi thành công cho <b>${count}/${users.length}</b> người dùng.`, { parse_mode: 'HTML' });
                        } catch (e) { bot.sendMessage(chatId, "❌ Lỗi thực hiện gửi thông báo."); }
                        return;
                    }

                    if (text && text.startsWith('/admin_delete')) {
                        const shopId = text.split(' ')[1];
                        if (!shopId) return bot.sendMessage(chatId, "⚠️ Nhập: /admin_delete [ID]");
                        bot.sendMessage(chatId, `⚠️ <b>XÁC NHẬN:</b> Xóa Shop ID <code>${shopId}</code>?`, {
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [[{ text: '🔥 XÓA NGAY', callback_data: `confirm_admin_del_${shopId}` }, { text: '❌ HỦY', callback_data: 'cancel_admin_del' }]]
                            }
                        });
                        return;
                    }
                }

                if (isShop || isAdmin) {
                    if (text === '/trangthai') {
                        try {
                            const [rows] = await pool.query('SELECT id, name, is_active FROM shops WHERE telegram_chat_id = ?', [chatIdStr]);
                            if (rows.length === 0) return bot.sendMessage(chatId, "⚠️ Shop của bạn chưa được liên kết.");
                            
                            const shop = rows[0];
                            const newStatus = shop.is_active ? 0 : 1;
                            const statusText = newStatus ? "🚪 <b>MỞ CỬA</b>" : "🔒 <b>ĐÓNG CỬA</b>";

                            await pool.query('UPDATE shops SET is_active = ? WHERE id = ?', [newStatus, shop.id]);
                            bot.sendMessage(chatId, `✅ <b>THÀNH CÔNG:</b> Shop <b>${shop.name}</b> đã được chuyển sang trạng thái: ${statusText}\n\n<i>(Quán sẽ ${newStatus ? 'hiện lên' : 'ẩn đi'} trên ứng dụng của khách hàng)</i>`, { parse_mode: 'HTML' });
                        } catch (e) { bot.sendMessage(chatId, "❌ Lỗi thay đổi trạng thái Shop."); }
                        return;
                    }

                    if (text === '/shop') {
                        const [rows] = await pool.query('SELECT * FROM shops WHERE telegram_chat_id = ?', [chatIdStr]);
                        if (rows.length > 0) {
                            const s = rows[0];
                            const status = s.is_active ? "🟢 Đang mở" : "🔴 Đang đóng";
                            bot.sendMessage(chatId, `🏪 <b>${s.name}</b>\n📍 ${s.address}\n🏦 ${s.bank_code} - ${s.bank_account}\n🛒 Trạng thái: <b>${status}</b>`, { parse_mode: 'HTML' });
                        }
                        return;
                    }

                    if (text === '/add_product') {
                        const [rows] = await pool.query('SELECT id FROM shops WHERE telegram_chat_id = ?', [chatIdStr]);
                        if (rows.length === 0) return bot.sendMessage(chatId, "⚠️ Cần liên kết Shop.");
                        userStates[chatId] = { step: 'AWAITING_NAME', shopId: rows[0].id, data: {} };
                        bot.sendMessage(chatId, "🍔 Nhập <b>Tên món ăn:</b>", { parse_mode: 'HTML' });
                        return;
                    }

                    if (text === '/xemsp') {
                        try {
                            const [shop] = await pool.query('SELECT id, name FROM shops WHERE telegram_chat_id = ?', [chatIdStr]);
                            if (shop.length === 0) return bot.sendMessage(chatId, "⚠️ Shop của bạn chưa được liên kết.");
                            
                            const [prods] = await pool.query('SELECT id, name, price FROM products WHERE shop_id = ?', [shop[0].id]);
                            if (prods.length === 0) return bot.sendMessage(chatId, `🏪 <b>${shop[0].name}</b> hiện chưa có món nào.`, { parse_mode: 'HTML' });

                            let m = `📦 <b>DANH SÁCH MÓN (${shop[0].name}):</b>\n\n`;
                            prods.forEach(p => { m += `• <b>${p.name}</b> - ${new Intl.NumberFormat('vi-VN').format(p.price)}đ\n`; });
                            bot.sendMessage(chatId, m, { parse_mode: 'HTML' });
                        } catch (e) { bot.sendMessage(chatId, "❌ Lỗi tải danh sách món."); }
                        return;
                    }

                    if (text === '/xoasp') {
                        try {
                            const [shop] = await pool.query('SELECT id, name FROM shops WHERE telegram_chat_id = ?', [chatIdStr]);
                            if (shop.length === 0) return bot.sendMessage(chatId, "⚠️ Shop của bạn chưa được liên kết.");
                            
                            const [prods] = await pool.query('SELECT id, name FROM products WHERE shop_id = ?', [shop[0].id]);
                            if (prods.length === 0) return bot.sendMessage(chatId, "Không có món nào để xóa.");

                            const kb = prods.map(p => [{ text: `🗑️ Xóa: ${p.name}`, callback_data: `del_prod_${p.id}` }]);
                            bot.sendMessage(chatId, "👇 <b>Chọn món muốn xóa:</b>", { parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } });
                        } catch (e) { bot.sendMessage(chatId, "❌ Lỗi thực hiện xóa."); }
                        return;
                    }
                }

                const state = userStates[chatId];
                if (state) {
                    const downloadPhoto = async (msg) => {
                        if (!msg.photo) return 'anhdaidienmacdinh.jpg';
                        try {
                            const fileId = msg.photo[msg.photo.length - 1].file_id;
                            const fileLink = await bot.getFileLink(fileId);
                            const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
                            const uploadDir = path.join(__dirname, '../uploads');
                            const filePath = path.join(uploadDir, fileName);
                            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                            const response = await axios({ url: fileLink, method: 'GET', responseType: 'stream' });
                            return new Promise((resolve, reject) => {
                                const writer = fs.createWriteStream(filePath);
                                response.data.pipe(writer);
                                writer.on('finish', () => resolve(fileName));
                                writer.on('error', (err) => {
                                    console.error("File write error:", err);
                                    resolve('anhdaidienmacdinh.jpg');
                                });
                            });
                        } catch (e) { 
                            console.error("Download photo error:", e);
                            return 'anhdaidienmacdinh.jpg'; 
                        }
                    };

                    if (state.step === 'AWAITING_NAME') {
                        state.data.name = text; state.step = 'AWAITING_PRICE';
                        bot.sendMessage(chatId, "💰 Nhập <b>Giá tiền:</b>", { parse_mode: 'HTML' });
                    }
                    else if (state.step === 'AWAITING_PRICE') {
                        const p = parseFloat(text.replace(/[^0-9]/g, ''));
                        if (isNaN(p)) return bot.sendMessage(chatId, "❌ Nhập số hợp lệ:");
                        state.data.price = p; state.step = 'AWAITING_IMAGE';
                        bot.sendMessage(chatId, "🖼️ Gửi <b>Ảnh</b> hoặc gõ 'skip':", { parse_mode: 'HTML' });
                    }
                    else if (state.step === 'AWAITING_IMAGE') {
                        const img = await downloadPhoto(msg);
                        try {
                            await pool.query('INSERT INTO products (shop_id, name, price, image_url) VALUES (?,?,?,?)', [state.shopId, state.data.name, state.data.price, `/uploads/${img}`]);
                            
                            // Emit Socket.io event for real-time update
                            io.emit('new_product', { 
                                shopId: state.shopId, 
                                name: state.data.name, 
                                price: state.data.price, 
                                image_url: `/uploads/${img}` 
                            });

                            const priceFormatted = new Intl.NumberFormat('vi-VN').format(state.data.price) + 'đ';
                            const successMsg = `✅ <b>Đã thêm sản phẩm thành công!</b>\n🍔 Tên: ${state.data.name}\n💰 Giá: ${priceFormatted}`;
                            const imgPath = path.join(__dirname, '../uploads', img);
                            if (fs.existsSync(imgPath)) await bot.sendPhoto(chatId, fs.createReadStream(imgPath), { caption: successMsg, parse_mode: 'HTML' });
                            else await bot.sendMessage(chatId, successMsg, { parse_mode: 'HTML' });
                            sendAnimatedGif(chatId, GIF_LINKS.success);
                        } catch (err) {
                            console.error("Error adding product via bot:", err);
                            bot.sendMessage(chatId, "❌ Lỗi thêm món ăn: " + err.message);
                        }
                        delete userStates[chatId];
                    }
                    else if (state.step === 'AWAITING_NEW_SHOP_IMAGE') {
                        state.data.image = await downloadPhoto(msg); state.step = 'AWAITING_NEW_SHOP_NAME';
                        bot.sendMessage(chatId, "📛 Nhập <b>Tên quán:</b>", { parse_mode: 'HTML' });
                    }
                    else if (state.step === 'AWAITING_NEW_SHOP_NAME') {
                        state.data.name = text; state.step = 'AWAITING_NEW_SHOP_ADDRESS';
                        bot.sendMessage(chatId, "📍 Nhập <b>Địa chỉ:</b>", { parse_mode: 'HTML' });
                    }
                    else if (state.step === 'AWAITING_NEW_SHOP_ADDRESS') {
                        state.data.address = text; state.step = 'AWAITING_NEW_SHOP_USERNAME';
                        bot.sendMessage(chatId, "👤 Nhập <b>Tên đăng nhập:</b>", { parse_mode: 'HTML' });
                    }
                    else if (state.step === 'AWAITING_NEW_SHOP_USERNAME') {
                        state.data.username = text.toLowerCase().replace(/\s/g, ''); state.step = 'AWAITING_NEW_SHOP_PASSWORD';
                        bot.sendMessage(chatId, "🔑 Nhập <b>Mật khẩu:</b>", { parse_mode: 'HTML' });
                    }
                    else if (state.step === 'AWAITING_NEW_SHOP_PASSWORD') {
                        const bcrypt = require('bcrypt');
                        state.data.password = await bcrypt.hash(text, 10);
                        state.data.rawPassword = text;
                        state.step = 'AWAITING_NEW_SHOP_BANK_CODE';
                        bot.sendMessage(chatId, "🏦 Nhập <b>Mã ngân hàng:</b>", { parse_mode: 'HTML' });
                    }
                    else if (state.step === 'AWAITING_NEW_SHOP_BANK_CODE') {
                        state.data.bank_code = text.toUpperCase(); state.step = 'AWAITING_NEW_SHOP_BANK_ACCOUNT';
                        bot.sendMessage(chatId, "💳 Nhập <b>Số tài khoản:</b>", { parse_mode: 'HTML' });
                    }
                    else if (state.step === 'AWAITING_NEW_SHOP_BANK_ACCOUNT') {
                        state.data.bank_account = text;
                        const conn = await pool.getConnection();
                        try {
                            await conn.beginTransaction();
                            const [u] = await conn.query('INSERT INTO users (username, password, role, full_name) VALUES (?, ?, "shop", ?)', [state.data.username, state.data.password, state.data.name]);
                            const [sResult] = await conn.query('INSERT INTO shops (name, user_id, image_url, address, bank_code, bank_account, telegram_chat_id) VALUES (?,?,?,?,?,?,?)', 
                                [state.data.name, u.insertId, `/uploads/${state.data.image}`, state.data.address, state.data.bank_code, state.data.bank_account, chatIdStr]);
                            await conn.commit();

                            // Emit Socket.io event for real-time update
                            io.emit('new_shop', { 
                                id: sResult.insertId,
                                name: state.data.name, 
                                image_url: `/uploads/${state.data.image}`, 
                                address: state.data.address,
                                is_active: 1
                            });

                            const successMsg = `🎉 <b>Tạo Shop thành công!</b>\n🏪 Tên: ${state.data.name}\n👤 TK: <code>${state.data.username}</code>\n🔑 MK: <code>${state.data.rawPassword}</code>`;
                            const imgPath = path.join(__dirname, '../uploads', state.data.image);
                            if (fs.existsSync(imgPath)) await bot.sendPhoto(chatId, fs.createReadStream(imgPath), { caption: successMsg, parse_mode: 'HTML' });
                            else await bot.sendMessage(chatId, successMsg, { parse_mode: 'HTML' });
                        } catch (e) { 
                            await conn.rollback(); 
                            console.error("Error creating shop via bot:", e);
                            bot.sendMessage(chatId, "❌ Lỗi tạo Shop: " + e.message); 
                        }
                        finally { conn.release(); delete userStates[chatId]; }
                    }
                    else if (state.step === 'AWAITING_BANK_CODE') {
                        state.data.bank_code = text.toUpperCase(); state.step = 'AWAITING_BANK_ACCOUNT';
                        bot.sendMessage(chatId, "💳 Nhập <b>Số tài khoản:</b>");
                    }
                    else if (state.step === 'AWAITING_BANK_ACCOUNT') {
                        try {
                            await pool.query('UPDATE shops SET telegram_chat_id = ?, bank_code = ?, bank_account = ? WHERE id = ?', [chatIdStr, state.data.bank_code, text, state.shopId]);
                            bot.sendMessage(chatId, "✅ Tích hợp ID thành công!");
                        } catch (err) {
                            console.error("Error linking shop via bot:", err);
                            bot.sendMessage(chatId, "❌ Lỗi liên kết Shop: " + err.message);
                        }
                        delete userStates[chatId];
                    }
                }
            });

            bot.on('callback_query', async (q) => {
                const { data, message } = q;
                const chatId = message.chat.id;
                const chatIdStr = String(chatId);
                const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '5807941249';

                if (data.startsWith('confirm_admin_del_')) {
                    const shopId = data.split('_')[3];
                    if (chatIdStr !== ADMIN_CHAT_ID) return;
                    const conn = await pool.getConnection();
                    try {
                        await conn.beginTransaction();
                        const [shopInfo] = await conn.query('SELECT user_id FROM shops WHERE id = ?', [shopId]);
                        const userId = shopInfo.length > 0 ? shopInfo[0].user_id : null;
                        await conn.query('DELETE FROM reviews WHERE order_id IN (SELECT id FROM orders WHERE shop_id = ?)', [shopId]);
                        await conn.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE shop_id = ?)', [shopId]);
                        await conn.query('DELETE FROM orders WHERE shop_id = ?', [shopId]);
                        await conn.query('DELETE FROM favorites WHERE shop_id = ?', [shopId]);
                        await conn.query('DELETE FROM products WHERE shop_id = ?', [shopId]);
                        await conn.query('DELETE FROM shops WHERE id = ?', [shopId]);
                        if (userId) await conn.query('DELETE FROM users WHERE id = ?', [userId]);
                        await conn.commit();
                        bot.editMessageText(`✅ Đã xóa vĩnh viễn Shop ID ${shopId}.`, { chat_id: chatId, message_id: message.message_id });
                    } catch (e) { await conn.rollback(); bot.sendMessage(chatId, `❌ Lỗi xóa Shop: ${e.message}`); }
                    finally { conn.release(); }
                }
                else if (data === 'cancel_admin_del') bot.editMessageText("❌ Đã hủy.", { chat_id: chatId, message_id: message.message_id });
                else if (data === 'has_shop') {
                    const [rows] = await pool.query('SELECT id, name FROM shops WHERE telegram_chat_id IS NULL OR telegram_chat_id = ""');
                    const kb = rows.map(s => [{ text: s.name, callback_data: `select_shop_${s.id}` }]);
                    bot.sendMessage(chatId, "🏪 Chọn Shop của bạn:", { reply_markup: { inline_keyboard: kb } });
                }
                else if (data === 'no_shop') {
                    userStates[chatId] = { step: 'AWAITING_NEW_SHOP_IMAGE', data: {} };
                    bot.sendMessage(chatId, "🖼️ Gửi <b>Ảnh đại diện Shop:</b>", { parse_mode: 'HTML' });
                }
                else if (data.startsWith('select_shop_')) {
                    userStates[chatId] = { step: 'AWAITING_BANK_CODE', shopId: data.split('_')[2], data: {} };
                    bot.sendMessage(chatId, "🏦 Nhập <b>Mã ngân hàng:</b>", { parse_mode: 'HTML' });
                }
                else if (data.startsWith('refunded_')) {
                    const orderId = data.split('_')[1];
                    try {
                        await pool.query("UPDATE orders SET payment_status = 'refunded', status = 'cancelled' WHERE id = ?", [orderId]);
                        bot.deleteMessage(chatId, message.message_id).catch(() => {});
                        bot.sendMessage(chatId, `✅ <b>XÁC NHẬN:</b> Hoàn tiền đơn hàng <b>DH${orderId}</b> thành công!`, { parse_mode: 'HTML' });
                    } catch (err) {
                        console.error("Refund error:", err);
                        bot.sendMessage(chatId, "❌ Lỗi hoàn tiền.");
                    }
                }
                else if (data.startsWith('contact_cust_')) {
                    const orderId = data.split('_')[2];
                    try {
                        const [rows] = await pool.query(`SELECT u.email, u.full_name, u.phone FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?`, [orderId]);
                        if (rows.length > 0) {
                            const c = rows[0];
                            bot.sendMessage(chatId, `📧 <b>THÔNG TIN LIÊN HỆ (DH${orderId})</b>\n\n👤 Họ tên: <b>${c.full_name}</b>\n✉️ Email: <code>${c.email}</code>\n📞 SĐT: <code>${c.phone || 'N/A'}</code>`, { parse_mode: 'HTML' });
                        }
                    } catch (err) {
                        console.error("Contact customer error:", err);
                    }
                }
                else if (data.startsWith('del_prod_')) {
                    const prodId = data.split('_')[2];
                    try {
                        const [pRows] = await pool.query('SELECT p.name, s.telegram_chat_id FROM products p JOIN shops s ON p.shop_id = s.id WHERE p.id = ?', [prodId]);
                        if (pRows.length > 0 && (pRows[0].telegram_chat_id === chatIdStr || isAdmin)) {
                            await pool.query('DELETE FROM products WHERE id = ?', [prodId]);
                            bot.editMessageText(`✅ Đã xóa món: <b>${pRows[0].name}</b>`, { chat_id: chatId, message_id: message.message_id, parse_mode: 'HTML' });
                        }
                    } catch (e) {
                        console.error("Delete product error:", e);
                    }
                }
                bot.answerCallbackQuery(q.id);
            });
        } catch (err) { 
            console.error("❌ Lỗi Telegram Bot Initialization:", err); 
        }
    }

    cron.schedule('* * * * *', async () => {
        try {
            const [orders] = await pool.query(`SELECT id FROM orders WHERE payment_status = 'paid' AND status IN ('pending', 'finding_driver') AND paid_at < NOW() - INTERVAL 2 MINUTE AND refund_notified = 0`);
            for (const o of orders) await sendRefundNotification(o.id);
        } catch (e) {}
    });
    
    cron.schedule('0 23 * * *', async () => { await sendDailyReport(); });
    
    console.log('🚀 Service Started (V3)');
    return { bot, sendRefundNotification, sendAnimatedGif };
};
