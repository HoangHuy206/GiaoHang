const axios = require('axios');

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://n8n.giaohangtannoi.id.vn/webhook/dathang';

async function sendOrderToN8N(orderData) {
    try {
        const statusMap = {
            'pending': 'Chờ xử lý',
            'confirmed': 'Đã xác nhận',
            'finding_driver': 'Đang tìm tài xế',
            'driver_assigned': 'Tài xế đã nhận đơn',
            'picked_up': 'Đang giao',
            'delivered': 'Giao hàng thành công',
            'cancelled': 'Đã hủy'
        };

        const displayStatus = statusMap[orderData.status] || orderData.status || 'Chờ xử lý';

        // GỬI ĐÚNG CÁC KEY MÀ BẠN ĐANG DÙNG TRONG N8N
        const payload = {
            madonhang: orderData.orderId,
            ten: orderData.customerName && orderData.customerName !== 'NULL' ? orderData.customerName : 'Khách hàng',
            sdt: orderData.phone || 'N/A',
            monan: orderData.items || 'N/A',
            tongtien: typeof orderData.totalPrice === 'number' 
                ? new Intl.NumberFormat('vi-VN').format(orderData.totalPrice) + 'đ'
                : orderData.totalPrice,
            diachi: orderData.address || 'N/A',
            trangthai: displayStatus,
            ngaydat: new Date().toLocaleString('vi-VN')
        };

        console.log("📤 [n8n Payload]:", JSON.stringify(payload, null, 2));

        await axios.post(N8N_WEBHOOK_URL, payload);
    } catch (error) {
        console.error('⚠️ [n8n] Error:', error.message);
    }
}

module.exports = { sendOrderToN8N };