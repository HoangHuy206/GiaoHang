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

        // ĐỊNH NGHĨA CỘT RÕ RÀNG
        worksheet.columns = [
            { header: 'Mã Đơn Hàng', key: 'col_id', width: 15 },
            { header: 'Khách Hàng', key: 'col_name', width: 25 },
            { header: 'Số Điện Thoại', key: 'col_phone', width: 15 },
            { header: 'Địa Chỉ Giao', key: 'col_addr', width: 40 },
            { header: 'Món Ăn', key: 'col_items', width: 40 },
            { header: 'Tổng Tiền', key: 'col_total', width: 15 },
            { header: 'Trạng Thái', key: 'col_status', width: 20 },
            { header: 'Cập Nhật Cuối', key: 'col_update', width: 25 }
        ];

        if (!fs.existsSync(EXCEL_FILE_PATH)) {
            worksheet.getRow(1).font = { bold: true };
        }

        // TÌM DÒNG CŨ THEO MÃ D001
        let rowToUpdate = null;
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1 && row.getCell('col_id').value === orderData.orderId) {
                rowToUpdate = row;
            }
        });

        const statusMap = {
            'pending': 'Chờ xử lý',
            'confirmed': 'Đã xác nhận',
            'finding_driver': 'Đang tìm tài xế',
            'driver_assigned': 'Tài xế đã nhận đơn',
            'picked_up': 'Đang giao',
            'delivered': 'Giao hàng thành công',
            'cancelled': 'Đã hủy'
        };

        const displayStatus = statusMap[orderData.status] || orderData.status;
        const now = new Date().toLocaleString('vi-VN');

        if (rowToUpdate) {
            // CẬP NHẬT
            rowToUpdate.getCell('col_status').value = displayStatus;
            rowToUpdate.getCell('col_update').value = now;
            // Cập nhật tên/sđt nếu trước đó bị thiếu
            if (orderData.customerName) rowToUpdate.getCell('col_name').value = orderData.customerName;
            if (orderData.phone) rowToUpdate.getCell('col_phone').value = orderData.phone;
        } else {
            // THÊM MỚI
            worksheet.addRow({
                col_id: orderData.orderId,
                col_name: orderData.customerName || 'Khách hàng',
                col_phone: orderData.phone || 'N/A',
                col_addr: orderData.address || 'N/A',
                col_items: orderData.items || 'N/A',
                col_total: typeof orderData.totalPrice === 'number' ? orderData.totalPrice : 0,
                col_status: displayStatus || 'Chờ xử lý',
                col_update: now
            });
        }

        await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
        console.log(`✅ [Excel] ${orderData.orderId} -> ${displayStatus}`);
    } catch (error) {
        console.error('❌ Excel Error:', error);
    }
}

module.exports = { saveOrderToExcel };
