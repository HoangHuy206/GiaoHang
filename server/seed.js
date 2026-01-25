const pool = require('./db');

const shops = [
  { name: 'Phở gà Anh Thư', menu: [
      { name: 'Cơm rang dưa bò', price: 65000 },
      { name: 'Cơm rang đùi gà', price: 159000 },
      { name: 'Cơm rang hải sản', price: 79000 },
      { name: 'Cơm rang thập cẩm', price: 120000 }
  ]},
  { name: 'Lotteria - Vincom Smart City', menu: [
      { name: 'Burger Bulgogi', price: 65000 },
      { name: 'Burger tôm', price: 100000 },
      { name: 'Gà Rán Phần', price: 79000 },
      { name: 'Gà sốt dâu 3 miếng', price: 120000 },
      { name: 'Gà sốt phô mai 3 miếng', price: 120000 },
      { name: 'Mỳ', price: 87000 }
  ]},
  { name: 'Cơm bình dân', menu: [
      { name: 'Bơ xào', price: 65000 },
      { name: 'Cocacola', price: 15000 },
      { name: 'Cơm thố bơ', price: 79000 },
      { name: 'Cơm thố đặc biệt', price: 120000 },
      { name: 'Cơm thố dương châu', price: 100000 },
      { name: 'Cơm thố sườn nướng', price: 87000 },
      { name: 'Cơm thố gà quay', price: 87000 },
      { name: 'Cơm thố gà', price: 87000 }
  ]},
  { name: 'Cơm gà hầm', menu: [
      { name: 'Gà nướng', price: 65000 },
      { name: 'Gà hầm thuốc bắc', price: 159000 },
      { name: 'Gà hầm thập cẩm', price: 79000 },
      { name: 'Gà đóng hộp', price: 12000 },
      { name: 'Gà hầm sâm', price: 100000 },
      { name: 'Gà hầm ngải cứu', price: 97000 },
      { name: 'Gà hầm hạt sen', price: 87000 }
  ]},
  { name: 'Tocotoco', menu: [
      { name: 'Hồng trà kem phô mai', price: 55000 },
      { name: 'Ô long kem phô mai', price: 49000 },
      { name: 'Trà xanh kem phô mai', price: 79000 },
      { name: 'Hồng trà khổng lồ', price: 80000 },
      { name: 'Trà trân châu khổng lồ', price: 100000 },
      { name: 'Trà sữa dâu tây', price: 87000 }
  ]},
  { name: 'Bún chấm', menu: [
      { name: 'Bánh cuốn chả nướng', price: 55000 },
      { name: 'Bánh cuốn chả quế', price: 55000 },
      { name: 'Bún chả chấm', price: 40000 },
      { name: 'Bánh cuốn trứng', price: 39000 },
      { name: 'Bún bò huế', price: 100000 }
  ]},
  { name: 'Mixue', menu: [
      { name: 'Super sundae xoài', price: 55000 },
      { name: 'Super sundae dâu tây', price: 49000 },
      { name: 'Super sundae socola', price: 79000 },
      { name: 'Trà bí đao', price: 80000 },
      { name: 'Trà ô long kiwi', price: 100000 },
      { name: 'Dương chi cam lộ', price: 87000 }
  ]}
];

const fs = require('fs');
const path = require('path');

async function seed() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to database.');

    // Execute Schema
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const statements = schemaSql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
        if (statement.trim()) {
            await connection.query(statement);
        }
    }
    console.log('Schema setup complete.');

    for (const shopData of shops) {
      // Create Shop User
      const shopUsername = shopData.name.replace(/\s+/g, '').toLowerCase();
      
      const [existingUsers] = await connection.query('SELECT id FROM users WHERE username = ?', [shopUsername]);
      let userId;
      
      if (existingUsers.length === 0) {
          const [userResult] = await connection.query(
              'INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)',
              [shopUsername, '123456', 'shop', shopData.name]
          );
          userId = userResult.insertId;
      } else {
          userId = existingUsers[0].id;
      }

      // Create Shop
      const [existingShops] = await connection.query('SELECT id FROM shops WHERE name = ?', [shopData.name]);
      let shopId;

      let keyword = 'restaurant';
      const n = shopData.name.toLowerCase();
      if (n.includes('phở') || n.includes('bún')) keyword = 'noodle,restaurant';
      else if (n.includes('burger') || n.includes('lotteria')) keyword = 'fastfood';
      else if (n.includes('cơm')) keyword = 'rice,restaurant';
      else if (n.includes('tocotoco') || n.includes('mixue')) keyword = 'drink,dessert';
      
      const shopImageUrl = `https://loremflickr.com/640/480/${keyword}?lock=${Math.floor(Math.random() * 1000)}`;
      
      // Random coordinates around 21.0464, 105.7480 (approx 5km range)
      const lat = 21.0464 + (Math.random() - 0.5) * 0.05;
      const lng = 105.7480 + (Math.random() - 0.5) * 0.05;
      const address = `Số ${Math.floor(Math.random() * 200) + 1} Đường Cầu Diễn, Bắc Từ Liêm, Hà Nội`;

      if (existingShops.length === 0) {
          const [shopResult] = await connection.query(
              'INSERT INTO shops (name, user_id, image_url, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?)',
              [shopData.name, userId, shopImageUrl, address, lat, lng]
          );
          shopId = shopResult.insertId;
      } else {
          shopId = existingShops[0].id;
          await connection.query('UPDATE shops SET image_url = ?, address = ?, lat = ?, lng = ? WHERE id = ?', [shopImageUrl, address, lat, lng, shopId]);
      }

      // Create Products
      for (const item of shopData.menu) {
          const [existingProducts] = await connection.query(
              'SELECT id FROM products WHERE shop_id = ? AND name = ?', 
              [shopId, item.name]
          );

          if (existingProducts.length === 0) {
              let keyword = 'food';
              const n = item.name.toLowerCase();
              if (n.includes('gà')) keyword = 'chicken';
              else if (n.includes('bò')) keyword = 'beef';
              else if (n.includes('cơm')) keyword = 'rice';
              else if (n.includes('trà') || n.includes('sữa')) keyword = 'drink';
              else if (n.includes('bún') || n.includes('phở') || n.includes('mỳ')) keyword = 'noodle';
              else if (n.includes('burger')) keyword = 'burger';
              
              const imageUrl = `https://loremflickr.com/320/240/${keyword}?lock=${Math.floor(Math.random() * 10000)}`;

              await connection.query(
                  'INSERT INTO products (shop_id, name, price, image_url) VALUES (?, ?, ?, ?)',
                  [shopId, item.name, item.price, imageUrl]
              );
          }
      }
      console.log(`Seeded ${shopData.name}`);
    }
    
    // Seed a Driver and a User
    await connection.query("INSERT IGNORE INTO users (username, password, role, full_name) VALUES ('driver1', '123456', 'driver', 'Tài Xế Mẫu')");
    await connection.query("INSERT IGNORE INTO users (username, password, role, full_name) VALUES ('user1', '123456', 'user', 'Nguyễn Văn A')");

    console.log('Seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();