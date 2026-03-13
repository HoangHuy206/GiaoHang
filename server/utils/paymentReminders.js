const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');
const pool = require('../db');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const userStates = {}; 

let bot = null;
if (token) {
    bot = new TelegramBot(token, { polling: true });

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        const chatIdStr = String(chatId);

        console.log(`[Bot Message] From: ${chatIdStr}, Text: ${text}`);

        const isAdmin = (chatIdStr === '5807941249');
        let isShop = false;
        try {
            const [shopRows] = await pool.query('SELECT name FROM shops WHERE telegram_chat_id = ?', [chatIdStr]);
            if (shopRows.length > 0) isShop = true;
        } catch (e) {}

        if (text === '/start' || text === '/help') {
            let welcomeMsg = `👋 Chào bạn! Đây là Bot GiaoHangTanNoi <b>(V3)</b>\n\n` +
                             `🆔 Chat ID của bạn là: <code>${chatIdStr}</code>\n\n` +
                             `✅ <b>Lệnh khả dụng:</b>\n\n`;

            if (isAdmin) {
                welcomeMsg += `📋 /admin_list - Danh sách tất cả Shop\n` +
                             `🗑️ /admin_delete [ID] - Xóa Shop\n`;
            }

            if (isShop || isAdmin) {
                welcomeMsg += `🏪 /shop - Xem thông tin Shop\n` +
                             `📦 /xemsp - Danh sách món ăn\n` +
                             `🍔 /add_product - Thêm món ăn mới\n` +
                             `🗑️ /xoasp - Xóa món ăn\n` +
                             `❌ /cancel - Hủy thao tác\n`;
            }

            welcomeMsg += `🆔 /myid - Xem Chat ID của bạn\n` +
                         `🆔 /themid - Tích hợp ID & Tạo Shop mới\n\n` +
                         `<i>Sử dụng /themid để liên kết Telegram với Shop của bạn!</i>`;

            bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'HTML' });
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

        if (text === '/cancel') { delete userStates[chatId]; return bot.sendMessage(chatId, "❌ Đã hủy thao tác."); }

        if (text === '/xemsp') {
            try {
                // 1. Tìm shop theo telegram_chat_id
                const [shopRows] = await pool.query('SELECT id, name FROM shops WHERE telegram_chat_id = ?', [chatIdStr]);
                if (shopRows.length === 0) {
                    return bot.sendMessage(chatId, "⚠️ <b>LỖI:</b> Bạn chưa liên kết Shop với Telegram này.\nSử dụng lệnh /themid để bắt đầu!", { parse_mode: 'HTML' });
                }

                const shopId = shopRows[0].id;
                const shopName = shopRows[0].name;

                // 2. Lấy danh sách sản phẩm
                const [productRows] = await pool.query('SELECT name, price, image_url FROM products WHERE shop_id = ?', [shopId]);
                
                if (productRows.length === 0) {
                    return bot.sendMessage(chatId, `🏪 <b>${shopName}</b> hiện chưa có món ăn nào trong thực đơn.`, { parse_mode: 'HTML' });
                }

                bot.sendMessage(chatId, `🍱 <b>THỰC ĐƠN CỦA ${shopName.toUpperCase()}:</b>`, { parse_mode: 'HTML' });

                for (const p of productRows) {
                    const priceFormatted = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
                    const caption = `<b>${p.name}</b>\n💰 Giá: <code>${priceFormatted}</code>`;
                    
                    if (p.image_url) {
                        const imgPath = path.join(__dirname, '..', p.image_url.replace('/uploads/', 'uploads/'));
                        if (fs.existsSync(imgPath)) {
                            await bot.sendPhoto(chatId, fs.createReadStream(imgPath), { caption, parse_mode: 'HTML' });
                        } else {
                            await bot.sendMessage(chatId, caption, { parse_mode: 'HTML' });
                        }
                    } else {
                        await bot.sendMessage(chatId, caption, { parse_mode: 'HTML' });
                    }
                }

                bot.sendMessage(chatId, `\n<i>Sử dụng /add_product để thêm món mới!</i>`, { parse_mode: 'HTML' });
            } catch (err) {
                console.error("Lỗi xem sản phẩm:", err);
                bot.sendMessage(chatId, "❌ Có lỗi xảy ra khi tải danh sách món ăn.");
            }
            return;
        }

        if (text === '/xoasp') {
            try {
                const [shopRows] = await pool.query('SELECT id, name FROM shops WHERE telegram_chat_id = ?', [chatIdStr]);
                if (shopRows.length === 0) return bot.sendMessage(chatId, "⚠️ Cần liên kết Shop.");

                const shopId = shopRows[0].id;
                const [productRows] = await pool.query('SELECT id, name FROM products WHERE shop_id = ?', [shopId]);

                if (productRows.length === 0) return bot.sendMessage(chatId, "🍱 Quán hiện chưa có món nào.");

                let m = "🗑️ <b>CHỌN MÓN MUỐN XÓA:</b>\n\n";
                const kb = productRows.map(p => ([{ text: `❌ ${p.name}`, callback_data: `del_prod_${p.id}` }]));

                bot.sendMessage(chatId, m, { 
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: kb }
                });
            } catch (e) { bot.sendMessage(chatId, "❌ Lỗi tải danh sách xóa."); }
            return;
        }

        if (text === '/themid') {
            // Kiểm tra xem user này đã có shop chưa (trừ Admin)
            if (!isAdmin && isShop) {
                return bot.sendMessage(chatId, "⚠️ <b>THÔNG BÁO:</b> Tài khoản của bạn đã được liên kết với một Shop.\n\nBạn không thể sử dụng lệnh /themid nữa. Hãy sử dụng /shop hoặc /xemsp để quản lý!", { parse_mode: 'HTML' });
            }

            userStates[chatId] = { step: 'AWAITING_EXISTING_SHOP_CONFIRMATION' };
            bot.sendMessage(chatId, "👋 Bạn đã có Shop trên <b>giaohangtannoi.id.vn</b> chưa?", {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[{ text: '✅ Đã có', callback_data: 'has_shop' }, { text: '🆕 Chưa có', callback_data: 'no_shop' }]]
                }
            });
            return;
        }

        if (isShop || isAdmin) {
            if (text === '/shop') {
                const [rows] = await pool.query('SELECT * FROM shops WHERE telegram_chat_id = ?', [chatIdStr]);
                if (rows.length > 0) {
                    const s = rows[0];
                    bot.sendMessage(chatId, `🏪 <b>${s.name}</b>\n📍 ${s.address}\n🏦 ${s.bank_code} - ${s.bank_account}`, { parse_mode: 'HTML' });
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
        }

        const state = userStates[chatId];
        if (!state) return;

        const downloadPhoto = async (msg) => {
            // Nếu người dùng gõ 'skip' hoặc không gửi ảnh
            if (!msg.photo) return 'anhdaidienmacdinh.jpg';
            
            try {
                const fileId = msg.photo[msg.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);
                const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
                const uploadDir = path.join(__dirname, '../uploads');
                const filePath = path.join(uploadDir, fileName);

                // Đảm bảo thư mục uploads tồn tại
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                const response = await axios({
                    url: fileLink,
                    method: 'GET',
                    responseType: 'stream'
                });

                return new Promise((resolve, reject) => {
                    const writer = fs.createWriteStream(filePath);
                    response.data.pipe(writer);
                    writer.on('finish', () => {
                        console.log(`✅ Đã lưu ảnh từ Telegram: ${fileName}`);
                        resolve(fileName);
                    });
                    writer.on('error', (err) => {
                        console.error("❌ Lỗi ghi file ảnh:", err);
                        resolve('anhdaidienmacdinh.jpg');
                    });
                });
            } catch (error) {
                console.error("❌ Lỗi tải ảnh từ Telegram:", error);
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
            await pool.query('INSERT INTO products (shop_id, name, price, image_url) VALUES (?,?,?,?)', [state.shopId, state.data.name, state.data.price, `/uploads/${img}`]);
            
            const priceFormatted = new Intl.NumberFormat('vi-VN').format(state.data.price) + 'đ';
            const successMsg = `✅ <b>Đã thêm sản phẩm thành công!</b>\n🍔 Tên: ${state.data.name}\n💰 Giá: ${priceFormatted}`;
            
            const imgPath = path.join(__dirname, '../uploads', img);
            if (fs.existsSync(imgPath)) {
                await bot.sendPhoto(chatId, fs.createReadStream(imgPath), { caption: successMsg, parse_mode: 'HTML' });
            } else {
                await bot.sendMessage(chatId, successMsg, { parse_mode: 'HTML' });
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
            state.data.password = text; state.step = 'AWAITING_NEW_SHOP_BANK_CODE';
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
                await conn.query('INSERT INTO shops (name, user_id, image_url, address, bank_code, bank_account, telegram_chat_id) VALUES (?,?,?,?,?,?,?)', 
                    [state.data.name, u.insertId, `/uploads/${state.data.image}`, state.data.address, state.data.bank_code, state.data.bank_account, chatIdStr]);
                await conn.commit();
                
                const successMsg = `🎉 <b>Tạo Shop thành công!</b>\n🏪 Tên: ${state.data.name}\n👤 TK: <code>${state.data.username}</code>\n🔑 MK: <code>${state.data.password}</code>\n\n<i>Shop của bạn đã hiện lên trên trang chủ Food!</i>`;
                
                const imgPath = path.join(__dirname, '../uploads', state.data.image);
                if (fs.existsSync(imgPath)) {
                    await bot.sendPhoto(chatId, fs.createReadStream(imgPath), { caption: successMsg, parse_mode: 'HTML' });
                } else {
                    await bot.sendMessage(chatId, successMsg, { parse_mode: 'HTML' });
                }
            } catch (e) { await conn.rollback(); console.error(e); bot.sendMessage(chatId, "❌ Lỗi tạo Shop."); }
            finally { conn.release(); delete userStates[chatId]; }
        }
        else if (state.step === 'AWAITING_BANK_CODE') {
            state.data.bank_code = text.toUpperCase(); state.step = 'AWAITING_BANK_ACCOUNT';
            bot.sendMessage(chatId, "💳 Nhập <b>Số tài khoản:</b>");
        }
        else if (state.step === 'AWAITING_BANK_ACCOUNT') {
            await pool.query('UPDATE shops SET telegram_chat_id = ?, bank_code = ?, bank_account = ? WHERE id = ?', [chatIdStr, state.data.bank_code, text, state.shopId]);
            bot.sendMessage(chatId, "✅ Tích hợp ID thành công!");
            delete userStates[chatId];
        }
    });

    bot.on('callback_query', async (q) => {
        const { data, message } = q;
        const chatId = message.chat.id;
        const chatIdStr = String(chatId);

        if (data.startsWith('confirm_admin_del_')) {
            const shopId = data.split('_')[3];
            if (chatIdStr !== '5807941249') return;
            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();

                // 0. Get User ID associated with the Shop
                const [shopInfo] = await conn.query('SELECT user_id FROM shops WHERE id = ?', [shopId]);
                const userId = shopInfo.length > 0 ? shopInfo[0].user_id : null;

                // 1. ORDER OF DELETION (NO MESSAGES TABLE)
                await conn.query('DELETE FROM reviews WHERE order_id IN (SELECT id FROM orders WHERE shop_id = ?)', [shopId]);
                await conn.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE shop_id = ?)', [shopId]);
                await conn.query('DELETE FROM orders WHERE shop_id = ?', [shopId]);
                await conn.query('DELETE FROM favorites WHERE shop_id = ?', [shopId]);
                await conn.query('DELETE FROM products WHERE shop_id = ?', [shopId]);
                
                // 2. Delete from shops table
                await conn.query('DELETE FROM shops WHERE id = ?', [shopId]);

                // 3. Delete from users table (The Owner)
                if (userId) {
                    await conn.query('DELETE FROM users WHERE id = ?', [userId]);
                }

                await conn.commit();
                bot.editMessageText(`✅ Đã xóa vĩnh viễn Shop ID ${shopId} và Tài khoản chủ quán khỏi hệ thống.`, { chat_id: chatId, message_id: message.message_id });
            } catch (e) { 
                await conn.rollback(); 
                console.error("[Delete Error]:", e); 
                bot.sendMessage(chatId, `❌ Lỗi xóa Shop: ${e.message}`); 
            }
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
            await pool.query("UPDATE orders SET payment_status = 'refunded', status = 'cancelled' WHERE id = ?", [orderId]);
            bot.deleteMessage(chatId, message.message_id);
            bot.sendMessage(chatId, `✅ Đã xác nhận hoàn tiền đơn DH${orderId}`);
        }
        else if (data.startsWith('del_prod_')) {
            const prodId = data.split('_')[2];
            try {
                // Kiểm tra xem sản phẩm có thuộc shop của người dùng này không (bảo mật)
                const [prodRows] = await pool.query('SELECT p.name, s.telegram_chat_id FROM products p JOIN shops s ON p.shop_id = s.id WHERE p.id = ?', [prodId]);
                
                if (prodRows.length > 0 && (prodRows[0].telegram_chat_id === chatIdStr || chatIdStr === '5807941249')) {
                    const productName = prodRows[0].name;
                    await pool.query('DELETE FROM products WHERE id = ?', [prodId]);
                    bot.editMessageText(`✅ Đã xóa món: <b>${productName}</b>`, { 
                        chat_id: chatId, 
                        message_id: message.message_id,
                        parse_mode: 'HTML'
                    });
                } else {
                    bot.sendMessage(chatId, "❌ Bạn không có quyền xóa món này.");
                }
            } catch (e) {
                console.error("Lỗi xóa món:", e);
                bot.sendMessage(chatId, "❌ Lỗi hệ thống khi xóa món.");
            }
        }
        bot.answerCallbackQuery(q.id);
    });
}

module.exports = function(io) {
    cron.schedule('* * * * *', async () => {
        try {
            const [orders] = await pool.query(`
                SELECT o.id, o.shop_id, o.total_price, u.full_name as customer_name, 
                       o.customer_bank_code, o.customer_bank_account,
                       s.name as shopName, s.telegram_chat_id as shopChatId
                FROM orders o
                JOIN users u ON o.user_id = u.id
                JOIN shops s ON o.shop_id = s.id
                WHERE o.payment_status = 'paid' AND o.status IN ('pending', 'finding_driver')
                AND o.paid_at < NOW() - INTERVAL 2 MINUTE AND o.refund_notified = 0
            `);
            for (const o of orders) {
                const msg = `⚠️ <b>HOÀN TIỀN DH${o.id}</b>\n💰 ${o.total_price}đ\n👤 ${o.customer_name}\n🏦 ${o.customer_bank_code} - ${o.customer_bank_account}`;
                const target = o.shopChatId || process.env.TELEGRAM_CHAT_ID;
                if (target) bot.sendMessage(target, msg, { 
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: [[{ text: '✅ Đã hoàn tiền', callback_data: `refunded_${o.id}` }]] }
                });
                await pool.query('UPDATE orders SET refund_notified = 1 WHERE id = ?', [o.id]);
            }
        } catch (e) { console.error("Cron error:", e); }
    });
    console.log('🚀 Service Started (V3)');
    return { bot };
};
