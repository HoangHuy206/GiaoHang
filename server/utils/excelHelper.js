const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const EXCEL_FILE_PATH = path.join(__dirname, '..', 'orders.xlsx');

async function saveOrderToExcel(orderData) {
    let workbook = new ExcelJS.Workbook();
    let worksheet;

    try {
        if (fs.existsSync(EXCEL_FILE_PATH)) {
            await workbook.xlsx.readFile(EXCEL_FILE_PATH);
            worksheet = workbook.getWorksheet('Orders');
        } else {
            worksheet = workbook.addWorksheet('Orders');
        }

        // Always set columns to ensure getCell(key) works
        worksheet.columns = [
            { header: 'Mã Đơn Hàng', key: 'orderId', width: 15 },
            { header: 'Khách Hàng', key: 'customerName', width: 25 },
            { header: 'Số Điện Thoại', key: 'phone', width: 15 },
            { header: 'Địa Chỉ Giao', key: 'address', width: 40 },
            { header: 'Cửa Hàng', key: 'shopName', width: 25 },
            { header: 'Món Ăn', key: 'items', width: 40 },
            { header: 'Tổng Tiền', key: 'totalPrice', width: 15 },
            { header: 'Trạng Thái', key: 'status', width: 20 },
            { header: 'Ngày Tạo', key: 'createdAt', width: 20 },
            { header: 'Cập Nhật Cuối', key: 'updatedAt', width: 20 }
        ];

        if (!fs.existsSync(EXCEL_FILE_PATH)) {
            // Format header if new file
            worksheet.getRow(1).font = { bold: true };
        }

        // Check if order already exists
        let rowToUpdate = null;
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1 && row.getCell('orderId').value === orderData.orderId) {
                rowToUpdate = row;
            }
        });

        const statusMap = {
            'pending': 'Chờ xử lý',
            'confirmed': 'Đã xác nhận',
            'finding_driver': 'Đang tìm tài xế',
            'driver_assigned': 'Tài xế đang đến shop',
            'picked_up': 'Đang giao',
            'delivered': 'Giao hàng thành công',
            'cancelled': 'Đã hủy'
        };

        const displayStatus = statusMap[orderData.status] || orderData.status;
        const now = new Date().toLocaleString('vi-VN');

        if (rowToUpdate) {
            // Update existing row
            if (orderData.customerName) rowToUpdate.getCell('customerName').value = orderData.customerName;
            if (orderData.phone) rowToUpdate.getCell('phone').value = orderData.phone;
            if (orderData.address) rowToUpdate.getCell('address').value = orderData.address;
            if (orderData.shopName) rowToUpdate.getCell('shopName').value = orderData.shopName;
            if (orderData.items) rowToUpdate.getCell('items').value = orderData.items;
            if (orderData.totalPrice) rowToUpdate.getCell('totalPrice').value = orderData.totalPrice;
            if (orderData.status) rowToUpdate.getCell('status').value = displayStatus;
            rowToUpdate.getCell('updatedAt').value = now;
        } else {
            // Add new row
            worksheet.addRow({
                orderId: orderData.orderId,
                customerName: orderData.customerName || 'N/A',
                phone: orderData.phone || 'N/A',
                address: orderData.address || 'N/A',
                shopName: orderData.shopName || 'N/A',
                items: orderData.items || 'N/A',
                totalPrice: orderData.totalPrice || 0,
                status: displayStatus || 'Chờ xử lý',
                createdAt: now,
                updatedAt: now
            });
        }

        await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
        console.log(`✅ Đã lưu đơn hàng ${orderData.orderId} vào Excel.`);
    } catch (error) {
        console.error('❌ Lỗi khi lưu Excel:', error);
    }
}

module.exports = { saveOrderToExcel };
