require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error("❌ Lỗi: TELEGRAM_BOT_TOKEN không tìm thấy trong .env");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log("🤖 Đang khởi động Bot Test...");

bot.on('message', (msg) => {
    console.log(`📩 Nhận tin nhắn từ ID ${msg.chat.id}: ${msg.text}`);
    if (msg.text === '/test') {
        bot.sendMessage(msg.chat.id, "✅ Bot Test đang hoạt động!");
    }
});

bot.on('polling_error', (error) => {
    console.error("❌ Lỗi Polling:", error.code, error.message);
});

console.log("🚀 Bot Test đang lắng nghe lệnh /test...");
setTimeout(() => {
    console.log("⏹️ Đã hết 30 giây test, đang tắt...");
    process.exit(0);
}, 30000);
