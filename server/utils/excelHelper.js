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

        worksheet.columns = [
            { header: 'Mã Đơn Hàng', key: 'madonhang', width: 15 },
            { header: 'Khách Hàng', key: 'khachhang', width: 25 },
            { header: 'Số Điện Thoại', key: 'sdt', width: 15 },
            { header: 'Địa Chỉ Giao', key: 'diachi', width: 40 },
            { header: 'Món Ăn', key: 'monan', width: 40 },
            { header: 'Tổng Tiền', key: 'tongtien', width: 15 },
            { header: 'Trạng Thái', key: 'trangthai', width: 20 },
            { header: 'Cập Nhật Cuối', key: 'capnhat', width: 25 }
        ];

        if (!fs.existsSync(EXCEL_FILE_PATH)) {
            worksheet.getRow(1).font = { bold: true };
        }

        // TÌM DÒNG CŨ ĐỂ CẬP NHẬT
        let rowToUpdate = null;
        worksheet.eachRow((row, rowNumber) => {
            // So sánh Mã Đơn Hàng (Ví dụ: D001)
            const cellValue = row.getCell('madonhang').value;
            if (rowNumber > 1 && cellValue === orderData.orderId) {
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
            // Cập nhật dòng hiện có
            rowToUpdate.getCell('trangthai').value = displayStatus;
            rowToUpdate.getCell('capnhat').value = now;
            // Cập nhật lại các thông tin khác nếu có thay đổi
            if (orderData.customerName) rowToUpdate.getCell('khachhang').value = orderData.customerName;
            if (orderData.phone) rowToUpdate.getCell('sdt').value = orderData.phone;
            if (orderData.items) rowToUpdate.getCell('monan').value = orderData.items;
        } else {
            // Thêm dòng mới hoàn toàn
            worksheet.addRow({
                madonhang: orderData.orderId,
                khachhang: orderData.customerName || 'Khách hàng',
                sdt: orderData.phone || 'N/A',
                diachi: orderData.address || 'N/A',
                monan: orderData.items || 'N/A',
                tongtien: typeof orderData.totalPrice === 'number' ? orderData.totalPrice : 0,
                trangthai: displayStatus || 'Chờ xử lý',
                capnhat: now
            });
        }

        await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
        console.log(`✅ [Excel] Đã cập nhật đơn ${orderData.orderId}`);
    } catch (error) {
        console.error('❌ Lỗi Excel:', error);
    }
}

module.exports = { saveOrderToExcel };