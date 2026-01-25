const pool = require('./db');

const productUpdates = [
    // Shop 1: Phở gà Anh Thư
    { name: 'Cơm rang dưa bò', image: 'comrangduabo.webp' },
    { name: 'Cơm rang đùi gà', image: 'comrangduiga.webp' },
    { name: 'Cơm rang hải sản', image: 'comranghaisan.webp' },
    { name: 'Cơm rang thập cẩm', image: 'comrangthapcam.webp' },

    // Shop 2: Lotteria
    { name: 'Burger Bulgogi', image: 'Burger_Bulgogi.webp' },
    { name: 'Burger tôm', image: 'Burger_Tom.webp' },
    { name: 'Gà Rán Phần', image: 'garanphan.webp' },
    { name: 'Gà sốt dâu 3 miếng', image: 'gasotdau3mieng.webp' },
    { name: 'Gà sốt phô mai 3 miếng', image: 'gasotphomai3mieng.webp' },
    { name: 'Mỳ', image: 'myy.webp' },

    // Shop 3: Cơm bình dân
    { name: 'Bơ xào', image: 'boxao.png' },
    { name: 'Cocacola', image: 'coca.png' },
    { name: 'Cơm thố bơ', image: 'comthobo.png' },
    { name: 'Cơm thố đặc biệt', image: 'comthodacbiet.png' },
    { name: 'Cơm thố dương châu', image: 'comthoduongchau.png' },
    { name: 'Cơm thố sườn nướng', image: 'comthosuonnuong.png' },
    { name: 'Cơm thố gà quay', image: 'comthogaquay.png' },
    { name: 'Cơm thố gà', image: 'comthoga.png' },

    // Shop 4: Cơm gà hầm
    { name: 'Gà nướng', image: 'ganuong.png' },
    { name: 'Gà hầm thuốc bắc', image: 'gahamthuoc.jpg' },
    { name: 'Gà hầm thập cẩm', image: 'gahamthapcam.jpg' },
    { name: 'Gà đóng hộp', image: 'gadonghop.jpg' },
    { name: 'Gà hầm sâm', image: 'gahamxam.jpg' },
    { name: 'Gà hầm ngải cứu', image: 'gahamngaicuu.jpg' },
    { name: 'Gà hầm hạt sen', image: 'gahamhatsen.jpg' },

    // Shop 5: Tocotoco
    { name: 'Hồng trà kem phô mai', image: 'hongtrakemphomaisizeM.webp' },
    { name: 'Ô long kem phô mai', image: 'olongkemphomaisizeM.webp' },
    { name: 'Trà xanh kem phô mai', image: 'traxanhkemphomaisizeM.webp' },
    { name: 'Hồng trà khổng lồ', image: 'hongtramanquehoakhonglo.webp' },
    { name: 'Trà trân châu khổng lồ', image: 'suatuoichantrauduonghokhonglo.webp' },
    { name: 'Trà sữa dâu tây', image: 'trasuadaytaysizeM.webp' },

    // Shop 6: Bún chấm
    { name: 'Bánh cuốn chả nướng', image: 'banhcuonchanuong.webp' },
    { name: 'Bánh cuốn chả quế', image: 'banhcuonchaque.webp' },
    { name: 'Bún chả chấm', image: 'bunchacham.webp' },
    { name: 'Bánh cuốn trứng', image: 'banhcuontrung.webp' },
    { name: 'Bún bò huế', image: 'bunbohue.jpg' },

    // Shop 7: Mixue
    { name: 'Super sundae xoài', image: 'Super_sundae_xoai.webp' },
    { name: 'Super sundae dâu tây', image: 'Supersundae_dautay.webp' },
    { name: 'Super sundae socola', image: 'Supersundaesocola.webp' },
    { name: 'Trà bí đao', image: 'tradaobigsize.webp' },
    { name: 'Trà ô long kiwi', image: 'traolongkiwi.webp' },
    { name: 'Dương chi cam lộ', image: 'duongchicamlo.webp' }
];

async function updateImages() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to DB...');
        
        for (const item of productUpdates) {
            // Construct the full URL that the frontend can use
            // Assuming the server runs on http://localhost:3000 and serves uploads folder
            const imageUrl = `http://localhost:3000/uploads/${item.image}`;
            
            const [result] = await connection.query(
                'UPDATE products SET image_url = ? WHERE name = ?',
                [imageUrl, item.name]
            );
            
            if (result.affectedRows > 0) {
                console.log(`Updated ${item.name} -> ${item.image}`);
            } else {
                console.warn(`Product not found: ${item.name}`);
            }
        }
        
        console.log('All updates complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error updating images:', error);
        process.exit(1);
    }
}

updateImages();
