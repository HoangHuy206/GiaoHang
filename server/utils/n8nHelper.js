const axios = require('axios');

const N8N_WEBHOOK_URL = 'https://n8n-ibpj.onrender.com/webhook/dathang';

async function sendOrderToN8N(orderData) {
    try {
        const statusMap = {
            'pending': 'Chờ xử lý',
            'confirmed': 'Đã xác nhận',
            'finding_driver': 'Đang tìm tài xế',
            'driver_assigned': 'Tài xế đang đến shop',
            'picked_up': 'Đang giao',
            'delivered': 'Giao hàng thành công',
            'cancelled': 'Đã hủy'
        };

        const displayStatus = statusMap[orderData.status] || orderData.status || 'Chờ xử lý';

        const payload = {
            ten: orderData.customerName || 'Khách hàng',
            sdt: orderData.phone || 'N/A',
            monan: orderData.items || 'N/A',
            tongtien: typeof orderData.totalPrice === 'number' 
                ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(orderData.totalPrice)
                : orderData.totalPrice,
            diachi: orderData.address || 'N/A',
            trangthai: displayStatus,
            ngaydat: new Date().toLocaleString('vi-VN'),
            madonhang: orderData.orderId
        };

        await axios.post(N8N_WEBHOOK_URL, payload);
        console.log(`🚀 [n8n] Đã gửi thông tin đơn hàng ${orderData.orderId} sang n8n.`);
    } catch (error) {
        console.error('⚠️ [n8n] Lỗi khi gửi webhook sang n8n:', error.message);
    }
}

module.exports = { sendOrderToN8N };
