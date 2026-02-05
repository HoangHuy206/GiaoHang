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

        // BỘ KHÓA CHUẨN - Dùng để so khớp dòng trong Google Sheets
        const payload = {
            madonhang: orderData.orderId, // Ví dụ: D001
            khachhang: orderData.customerName || 'Khách hàng',
            sdt: orderData.phone || 'N/A',
            monan: orderData.items || 'N/A',
            tongtien: typeof orderData.totalPrice === 'number' 
                ? new Intl.NumberFormat('vi-VN').format(orderData.totalPrice) + 'đ'
                : orderData.totalPrice,
            diachi: orderData.address || 'N/A',
            trangthai: displayStatus,
            capnhat: new Date().toLocaleString('vi-VN')
        };

        await axios.post(N8N_WEBHOOK_URL, payload);
        console.log(`🚀 [n8n] Đã gửi/cập nhật đơn hàng ${orderData.orderId} (Trạng thái: ${displayStatus})`);
    } catch (error) {
        console.error('⚠️ [n8n] Lỗi khi gửi webhook sang n8n:', error.message);
    }
}

module.exports = { sendOrderToN8N };