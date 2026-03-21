const pool = require('./db');

async function restore() {
    try {
        console.log("🔄 Restoring real images...");

        const shopImages = {
            'Phở gà Anh Thư': '/uploads/pho-ga-anh-thu.png',
            'Lotteria - Vincom Smart City': '/uploads/lotte.jpg',
            'Cơm bình dân': '/uploads/comngon.jpg',
            'Cơm gà hầm': '/uploads/gaham.jpg',
            'Tocotoco': '/uploads/toco.jpg',
            'Bún chấm': '/uploads/buncham.jpg',
            'Mixue': '/uploads/mixue.jpg'
        };

        const productImages = {
            'Cơm rang dưa bò': '/uploads/comrangduabo.webp',
            'Cơm rang đùi gà': '/uploads/comrangduiga.webp',
            'Cơm rang hải sản': '/uploads/comranghaisan.webp',
            'Cơm rang thập cẩm': '/uploads/comrangthapcam.webp',
            'Burger Bulgogi': '/uploads/Burger_Bulgogi.webp',
            'Burger tôm': '/uploads/Burger_Tom.webp',
            'Gà Rán Phần': '/uploads/garanphan.webp',
            'Gà sốt dâu 3 miếng': '/uploads/gasotdau3mieng.webp',
            'Gà sốt phô mai 3 miếng': '/uploads/gasotphomai3mieng.webp',
            'Mỳ': '/uploads/myy.webp',
            'Bơ xào': '/uploads/boxao.png',
            'Cocacola': '/uploads/coca.png',
            'Cơm thố bơ': '/uploads/comthobo.png',
            'Cơm thố đặc biệt': '/uploads/comthodacbiet.png',
            'Cơm thố dương châu': '/uploads/comthoduongchau.png',
            'Cơm thố sườn nướng': '/uploads/comthosuonnuong.png',
            'Cơm thố gà quay': '/uploads/comthogaquay.png',
            'Cơm thố gà': '/uploads/comthoga.png',
            'Gà nướng': '/uploads/ganuong.png',
            'Gà hầm thuốc bắc': '/uploads/gahamthuoc.jpg',
            'Gà hầm thập cẩm': '/uploads/gahamthapcam.jpg',
            'Gà đóng hộp': '/uploads/gadonghop.jpg',
            'Gà hầm sâm': '/uploads/gahamxam.jpg',
            'Gà hầm ngải cứu': '/uploads/gahamngaicuu.jpg',
            'Gà hầm hạt sen': '/uploads/gahamhatsen.jpg',
            'Hồng trà kem phô mai': '/uploads/hongtrakemphomaisizeM.webp',
            'Ô long kem phô mai': '/uploads/olongkemphomaisizeM.webp',
            'Trà xanh kem phô mai': '/uploads/traxanhkemphomaisizeM.webp',
            'Hồng trà khổng lồ': '/uploads/hongtramanquehoakhonglo.webp',
            'Trà trân châu khổng lồ': '/uploads/suatuoichantrauduonghokhonglo.webp',
            'Trà sữa dâu tây': '/uploads/trasuadaytaysizeM.webp',
            'Bánh cuốn chả nướng': '/uploads/banhcuonchanuong.webp',
            'Bánh cuốn chả quế': '/uploads/banhcuonchaque.webp',
            'Bún chả chấm': '/uploads/bunchacham.webp',
            'Bánh cuốn trứng': '/uploads/banhcuontrung.webp',
            'Bún bò huế': '/uploads/bunbohue.jpg',
            'Super sundae xoài': '/uploads/Super_sundae_xoai.webp',
            'Super sundae dâu tây': '/uploads/Supersundae_dautay.webp',
            'Super sundae socola': '/uploads/Supersundaesocola.webp',
            'Trà bí đao': '/uploads/tradaobigsize.webp',
            'Trà ô long kiwi': '/uploads/traolongkiwi.webp',
            'Dương chi cam lộ': '/uploads/duongchicamlo.webp'
        };

        for (const [name, img] of Object.entries(shopImages)) {
            await pool.query("UPDATE shops SET image_url = ? WHERE name = ?", [img, name]);
        }

        for (const [name, img] of Object.entries(productImages)) {
            await pool.query("UPDATE products SET image_url = ? WHERE name = ?", [img, name]);
        }

        console.log("✅ Real images restored.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error restoring:", err);
        process.exit(1);
    }
}

restore();
